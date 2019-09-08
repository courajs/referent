import Service, {inject as service} from '@ember/service';
import Evented from '@ember/object/evented';
import {task} from 'ember-concurrency';
import {Observable,Subject,BehaviorSubject,of,merge} from 'rxjs';
import {flatMap,map,reduce} from 'rxjs/operators';
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



window.emitter = new Subject();
let catted = emitter.pipe(
    operators.scan((all,these) => all.concat(these))
);
window.result = new BehaviorSubject([]);
catted.subscribe(result);


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







let stop = false;

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
    setTimeout(()=>stop=true,5000);
  }

  async ordtFromCollection(ordt, id) {
    let db = await this.idb.db;

    await ensureClockForCollection(db, id);
    console.log('ordt');
    this.sw.send('ask');

    // of(0) primes it with an initial fetch
    return merge(this.localNotifier, this.swNotifier, of(0)).pipe(
        fetchNewInResponse(db, id),
        map(update => {
          ordt.mergeAtoms(update);
          return ordt;
        })
    );
  }

  async sequence(id) {
    await this.auth.awaitAuth;
    return this.ordtFromCollection(
        new Sequence(this.auth.clientId, []),
        id
    );
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

    return getOrCreate(this._id_map, id, ()=>{
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
    let col = await this.liveCollection(collection);
    col.update();
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

function getOrCreate(map, id, creator) {
  let val = map.get(id);
  if (!val) {
    val = creator();
    map.set(id, val);
  }
  return val;
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
