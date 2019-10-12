import Service, {inject as service} from '@ember/service';
import Evented from '@ember/object/evented';
import {task} from 'ember-concurrency';
import {Observable,Subject,BehaviorSubject,of,from,merge} from 'rxjs';
import {map,flatMap,mergeMap,reduce,multicast,refCount} from 'rxjs/operators';
import {EquivMap} from '@thi.ng/associative';
import {keepLatest} from 'nomicon/lib/concurrency';
import {CatchUpSubject,TrackedBehavior} from 'nomicon/lib/observables';
import Sequence from 'nomicon/lib/ordts/sequence';
import Graph from 'nomicon/lib/ordts/graph';
import {
  getFromCollection,
  writeToCollection,
  ensureClockForCollection,
} from 'nomicon/lib/idb';

import * as rxjs from 'rxjs';
window.rxjs = rxjs;
import * as operators from 'rxjs/operators';
window.operators = operators;



// window.emitter = new Subject();
// let catted = emitter.pipe(
//     operators.scan((all,these) => all.concat(these))
// );
// window.result = new BehaviorSubject([]);
// catted.subscribe(result);


function enqueue(f) {
  let running = false;
  let waiting = [];
  return function(...args) {
    if (running) {
      return new Promise((resolve, reject) => {
        waiting.push({args,resolve,reject});
      });
    } else {
      running = true;
      let result = f(...args);
      result.then(async () => {
        while (waiting.length) {
          let {args, resolve, reject} = waiting.shift();
          await f(...args).then(resolve, reject);
        }
        running = false;
      });
      return result;
    }
  }
}
window.enqueue = enqueue;

// for a given collection id, return an operator which
// will map a stream to updates from the db.
function fetchNewInResponse(db, collectionId) {
  let clock = {local:0,remote:0};
  return flatMap(enqueue(async () => {
    let result = await getFromCollection(db, collectionId, clock);
    clock = result.clock;
    return result.values;
  }));
}





export default class Sync extends Service {
  @service auth;
  @service idb;
  @service sw;

  _id_map = new EquivMap();

  swNotifier = new Subject();
  localNotifier = new Subject();

  init() {
    window.syncService = this;
    this.swNotifier.subscribe(this.sw.outgoing);
    this.sw.on('update').subscribe(this.localNotifier);
  }

  async ordtFromCollection(ordt, id) {
    let db = await this.idb.db;

    await ensureClockForCollection(db, id);
    console.log('ordt');
    this.sw.send('ask');

    // of(0) primes it with an initial fetch
    return merge(this.localNotifier, of(0)).pipe(
        fetchNewInResponse(db, id),
        map(update => {
          ordt.mergeAtoms(update);
          return ordt;
        })
    );
  }

  async prepare(id) {
    await this.auth.awaitAuth;
    let db = await this.idb.db;
    await ensureClockForCollection(db, id);
    this.sw.send('ask');
    return db;
  }

  sequence(id) {
    let seq = this._id_map.get(id);
    if (seq) {
      return seq;
    }

    console.log('making', id, 'initially');
    let ordt = new Sequence(this.auth.clientId);

    // ok potentially confusing rxjs stuff here.
    // There's some prep stuff we need to do before we can make
    // the main sequence observable - await some promises for resources,
    // and then ensure some initial database state for the collection.
    //
    // Then, we can start fetching new atoms from the database in response
    // to prompts from localNotifier.
    //
    // We mergeMap so that a promise for the db and finished initialization
    // "turns into" the obserable for the updates - it's a flattening.
    //
    // fetchNewInResponse keeps some local state, and each time it's poked
    // by an emission, it checks for and emits any new atoms from the db.
    // Then we merge that into the ordt, and re-emit it.
    //
    // We also use multicast and refCount - anyone who subscribes will get
    // the latest state without having to wait for the next update, because
    // of the BehaviorSubject. We prime it with the empty ordt.
    //
    // The refCount means the BehaviorSubject, and its subscription to the
    // merged ordt update observable will stick around as long as there
    // are any subscriptions to the top-level observable. Once there are no
    // more subscriptions, it will tear down the subject and the ordt
    // observable.
    // Next time it's subscribed to, it will re-create everything.
    // Because the initial prepare observable was created from a promise,
    // even if it is already resolved, when you subscribe to it you'll get
    // the resolved value. That's just how from + Promises work.
    seq = from(this.prepare(id)).pipe(
        mergeMap(db => {
          return merge(this.localNotifier, of(0)).pipe(
              fetchNewInResponse(db, id),
              map(update => {
                ordt.mergeAtoms(update);
                return ordt;
              }),
          );
        }),
        multicast(() => new BehaviorSubject(ordt)),
        refCount(),
    );

    this._id_map.set(id, seq);
    return seq;
  }

  async graph(id) {
    await this.auth.awaitAuth;
    return this.ordtFromCollection(
        new Graph(this.auth.clientId, []),
        id
    );
  }

  async liveCollection(id) {
    let db = await this.idb.db;

function getOrCreate(map, id, creator) {
  let val = map.get(id);
  if (!val) {
    val = creator();
    map.set(id, val);
  }
  return val;
}

    return getOrCreate(this._id_map, id, ()=>{
      console.log('creating for', id);
      let collection = new CollectionConnection(db, id);
      collection.notifications.subscribe(this.swNotifier);
      ensureClockForCollection(db, id)
        .then(() => {
          this.sw.on('update').forEach(()=>collection.update());
          this.sw.send('ask');
          collection.update();
        });
      return collection;
    });
  }

  async write(collection, values) {
    await writeToCollection(await this.idb.db, collection, values);
    // let col = await this.liveCollection(collection);
    // col.update();
    this.swNotifier.next('update');
    this.localNotifier.next();
  }

  //*
  async directWrite(collection, value) {
    await writeToCollection(await this.idb.db, collection, [value]);
    this.sw.send('update');
  }
  //*/
}


class CollectionConnection {
  db; id; notify;
  values = new CatchUpSubject();
  notifications = new Subject();
  clock = {local:0,remote:0};

  constructor(db, id) {
    this.db = db;
    this.id = id;
  }
  
  @keepLatest
  async update() {
    let {
      clock,
      values
    } = await getFromCollection(this.db, this.id, this.clock);
    this.clock = clock;
    if (values.length) {
      this.values.next(values);
    }
  }

  async write(values) {
    if (!Array.isArray(values)) { throw new Error('pass an array'); }
    await writeToCollection(this.db, this.id, values);
    this.notifications.next('update');
    return this.update();
  }

  subscribe(observer) {
    return this.values.subscribe(observer);
  }
}
