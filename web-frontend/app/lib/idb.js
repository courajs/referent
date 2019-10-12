import {openDB, unwrap} from 'idb';

export const DB_NAME = 'connote';
export const DB_VERSION = 1;
export async function upgrade(db/*, oldVersion, newVersion, tx*/) {
  [].forEach.call(db.objectStoreNames, n => db.deleteObjectStore(n));

  db.createObjectStore('meta');

  let clocks = db.createObjectStore('clocks', {keyPath:['collection']});
  clocks.createIndex('uniq', ['collection'], {unique: true});
  clocks.add({
    collection: 'index',
    synced_remote: 0,
    synced_local: 0,
    last_local: 0,
  });

  let data = db.createObjectStore('data',
      {keyPath: ['collection', 'client', 'client_index']});
  data.createIndex('primary', ['collection', 'client', 'client_index'], {unique: true});
  data.createIndex('remote', ['collection', 'server_index'], {unique:true});
}

export async function open() {
  let db = openDB(DB_NAME, DB_VERSION, {upgrade});
  db.then(db => window.db = db);
  return db;
}

export async function getFromCollection(db, collection, since) {
  let {local,remote} = since;
  let tx = db.transaction(['meta', 'clocks', 'data']);
  let client_id = await tx.objectStore('meta').get('client_id');
  let data = tx.objectStore('data');

  let local_from = [collection, client_id, local];
  let local_to = [collection, client_id, Infinity];
  let locals = data.index('primary').getAll(IDBKeyRange.bound(local_from, local_to, true, true)); // exclusive range

  let remote_from = [collection, remote];
  let remote_to = [collection, Infinity];
  let remotes = data.index('remote').getAll(IDBKeyRange.bound(remote_from, remote_to, true, true));

  let clock = await tx.objectStore('clocks').get([collection]);
  locals = await locals;
  remotes = await remotes;
  return {
    clock: {local: clock.last_local, remote: clock.synced_remote},
    values: locals.concat(remotes).map(d=>d.value),
  };
}

export async function writeToCollection(db, collection, items) {
  let tx = db.transaction(['meta', 'clocks', 'data'], 'readwrite');
  let client_id = await tx.objectStore('meta').get('client_id');
  let clock = await tx.objectStore('clocks').get([collection]);
  let msg_store = tx.objectStore('data');

  items.map(v => {
    return {
      collection,
      client: client_id,
      client_index: ++clock.last_local,
      value: v,
    };
  })
  .forEach(i => msg_store.add(i));

  tx.objectStore('clocks').put(clock);
  return tx.done;
}

export async function ensureClockForCollection(db, collection) {
  let tx = db.transaction('clocks', 'readwrite');
  let store = unwrap(tx.objectStore('clocks'));
  store.add({
    collection,
    synced_remote: 0,
    synced_local: 0,
    last_local: 0,
  }).onerror = function(evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
  }
  return tx.done;
}
