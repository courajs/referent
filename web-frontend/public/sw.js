// The build step prepends a list of all dist files above this line,
// for pre-caching purposes.
// It will look roughly like this:
// const ASSETS = [
//   "assets/nomicon-37377b[...].css",
//   "assets/nomicon-adf426[...].js",
//   "assets/vendor-a615a3[...].css",
//   "assets/vendor-aa98a4[...].js",
//   "fonts/FontAwesome.otf",
//   "fonts/fontawesome-webfont.eot",
//   "fonts/fontawesome-webfont.svg",
//   "fonts/fontawesome-webfont.ttf",
//   "fonts/fontawesome-webfont.woff",
//   "fonts/fontawesome-webfont.woff2",
//   "img/incoming.svg",
//   "img/outgoing.svg",
//   "index.html",
//   "robots.txt",
//   "sw-9f9f25[...].js",
//   "v/unpkg.com/idb@4.0.3/[...].js",
//   "v/unpkg.com/socket.io-client@2.2.0/[...].js"
// ]

const own_filename = /^sw.*\.js$/;
const WORKER_FILENAME = ASSETS.find(asset => own_filename.test(asset));
const INDEX_CACHE = `${WORKER_FILENAME}-index`;
const ASSET_CACHE = `${WORKER_FILENAME}-assets`;

async function clear_other_caches() {
  let all = await caches.keys();
  for (let cache_name of all) {
    if (cache_name !== INDEX_CACHE && cache_name !== ASSET_CACHE) {
      caches.delete(cache_name);
    }
  }
}

// TODO: handle not being at root of domain.
// Right now we assume we're being served from `/`,
// and that all assets have absolute urls.
async function fetch_asset(req) {
  let u = new URL(req.url);
  if (
    u.protocol === 'chrome-extension:'
    || u.pathname.endsWith('livereload.js')
    || u.pathname.endsWith('ember-cli-live-reload.js')
  ) {
    return fetch(req);
  }

  let c = await caches.open(ASSET_CACHE);
  let response = await c.match(req, {ignoreSearch: true});

  if (response) {
    return response;
  } else {
    console.error("asset requested not found in cache:", req);
    return fetch(req);
  }
}

async function fetch_index(req) {
  let c = await caches.open(INDEX_CACHE);
  // Update index.html in the background
  c.add('/index.html');
  return c.match('/index.html');
}

async function do_install() {
  await Promise.all([install_index(), install_assets()]);
}
async function install_index() {
  console.log('caching index');
  let c = await caches.open(INDEX_CACHE);
  await c.add('/index.html');
}
async function install_assets() {
  console.log('caching assets');
  let c = await caches.open(ASSET_CACHE);
  await c.addAll(ASSETS);
}


importScripts('/v/unpkg.com/socket.io-client@2.2.0/dist/socket.io.slim.dev.js');
importScripts('/v/unpkg.com/idb@4.0.3/build/iife/index-min.js');

// Here's an outline of everything going on in this sw.
// - it skips waiting and claims clients
// - it has an event handling wrapper.
// - it opens/upgrades the db, and sticks a promise for that on the state.
// - it sticks a promise for receiving an 'init' event on the state
// - it sticks a promise for when authentication is successful, and checks
//   the db to see whether it should resolve that immediately.
// - it waits for both auth and init, and then opens a socket. It sticks
//    a promise for that opened socket on the state.
// - it logs rejections of the db or socket promises
// - it has a function (`syncOwn`) to send all new local changes down the socket,
//    and update local sync state from acknowledgements
// - it has a function (`syncRemote`) to ask the server to send anything new
// - it has a handler to receive items from the server (either requested or pushed),
//    and update local state
// - it waits on the socket to be ready, and attaches the item receiver.
// - it waits for the socket to be ready, and triggers a full sync
// - it listens for online/offline events from tabs, and manages the socket.io connection
// - it listens for 'ask' events from tabs, and asks the server for new items.
// - it listens for 'update' events from tabs, forwards them to other tabs,
//    and sends items to the server.
// - it handles auth events and stuff somehow (this is most of what we're changing right now)

let IO_HOST, IO_PATH, AUTH_ENDPOINT;
// This is flipped true by the nix build
const PROD = true;

if (PROD) {
  IO_HOST = "/";
  IO_PATH = "/socket.io";
  AUTH_ENDPOINT = "/check-auth"
} else {
  IO_HOST = "/";
  IO_PATH = "/socket.io";
  AUTH_ENDPOINT = "/check-auth";
}

(function (idb, io) {
  'use strict';

  var idb__default = 'default' in idb ? idb['default'] : idb;
  io = io && io.hasOwnProperty('default') ? io['default'] : io;

  const DB_NAME = 'connote';
  const DB_VERSION = 2;
  async function upgrade(db, oldVersion, newVersion, tx) {
    [].forEach.call(db.objectStoreNames, n => db.deleteObjectStore(n));

    let meta = db.createObjectStore('meta');

    let clocks = db.createObjectStore('clocks', {keyPath:['collection']});
    clocks.createIndex('uniq', ['collection'], {unique: true});

    let data = db.createObjectStore('data',
        {keyPath: ['collection', 'client', 'client_index']});
    data.createIndex('primary', ['collection', 'client', 'client_index'], {unique: true});
    data.createIndex('remote', ['collection', 'server_index'], {unique:true});
  }

  // idb & socket.io come from importScripts statements in the output.banner rollup option



  // TODO: actually figure out a good lifecycle.
  // right now we just take everything over, and
  // all pages will refresh in response to the controllerchange
    self.addEventListener('install', async function installEventListenerCallback(event) {
      let install = do_install();
      event.waitUntil(install);
      await install;

      console.log('i ent waiting');
      self.skipWaiting();
    });
    self.addEventListener('activate', async function installEventListenerCallback(event) {
      console.log('im claiming em');
      self.clients.claim();
      console.log('clearing other caches');
      clear_other_caches();
    });
    self.addEventListener('fetch', function(event) {
      if (event.request.destination === 'document') {
        event.respondWith(fetch_index());
      } else {
        event.respondWith(fetch_asset(event.request));
      }
    });

  // events from connected client tabs
  self.handlers = {};
  self.on = function(ev, handler) {
    self.handlers[ev] = self.handlers[ev] || [];
    self.handlers[ev].push(handler);
  };
  self.every_message_handlers = [];
  self.on_every_message = function(handler) {
    self.every_message_handlers.push(handler);
  };
  self.addEventListener('message', function(event) {
    self.every_message_handlers.forEach(h => h(event));

    if (Array.isArray(event.data)) {
      let [kind,data] = event.data;
      if (self.handlers[kind]) {
        self.handlers[kind].forEach(h => h(data, event));
      }
    } else if (typeof event.data === 'string') {
      let kind = event.data;
      if (self.handlers[kind]) {
        self.handlers[kind].forEach(h => h(event));
      }
    } else {
      throw new Error('invalid message event data: '+JSON.stringify(event.data));
    }
  });

  // comms to connected client tabs
  self.broadcast = async function(kind, data) {
    let clients = await self.clients.matchAll({type:'window'});
    if (data === undefined) {
      clients.forEach(c=>c.postMessage(kind));
    } else {
      clients.forEach(c=>c.postMessage([kind,data]));
    }
  };
  self.broadcastOthers = async function(tab_id, kind, data) {
    let clients = await self.clients.matchAll({type:'window'});
    for (let c of clients) {
      if (c.id !== tab_id) {
        if (data === undefined) {
          c.postMessage(kind);
        } else {
          c.postMessage([kind,data]);
        }
      }
    }
  };


  // we want to avoid opening websockets and such for not-yet-active
  // service workers. buuuut you can't actually tell from inside the
  // service worker whether you're active or not. you can listen to
  // the 'activate' event, but that only fires once, *ever*, per sw.
  // the sw can be shut down due to no open tabs, then run again later,
  // and have no way to tell that it's already been activated.
  // so, we just ping from every active tab when they first start up,
  // and that will trigger socket initialization in the sw if necessary.
  //
  // STATE / MUTATION: nothing in this sw makes use of the db until
  // after we've authed. So as long as we await dbp in the auth routine,
  // we can just use self.db everywhere else.
  self.dbp = idb__default.openDB(DB_NAME, DB_VERSION, {upgrade})
      .then(function(db) {
        self.db = db;
        return db;
      });

  self.dbp.catch((e) => console.log("error opening db in service worker!", e));

  // data sync logic
  //

  // sync our own data down to the server.
  // we keep track of the most recently acknowledged message
  // for each collection in our 'clocks' object store.
  // so, check them all for last_local > synced_local.
  // this will only ever be called after we're authed and the socket is created.
  self.syncOwn = async function() {
    let {db, socket, client_id} = self;
  
    let tx = db.transaction(['clocks', 'data']);
    let clocks = await tx.objectStore('clocks').getAll();
    let data = tx.objectStore('data');
  
    let if_acked = [];
  
    let reqs = clocks
      .filter(c=>c.last_local>c.synced_local) // collections with new data to sync
      .map(c => {
        if_acked.push([c.collection, c.last_local]);
        let from = [c.collection, client_id, c.synced_local];
        let to = [c.collection,client_id,c.last_local];
        return data.getAll(IDBKeyRange.bound(from,to,true,false));
      }); // everyting after synced_local, for that collection
  
    let sets = await Promise.all(reqs);
    if (sets.length === 0) { return; }
  
    socket.emit('tell', [].concat(...sets), async function() {
      console.log('ack', if_acked);
      let tx = db.transaction(['clocks'], 'readwrite');
      let clocks = tx.objectStore('clocks');
      await Promise.all(if_acked.map(async function([collection,acked]) {
        let current = await clocks.get([collection]);
        if (acked > current.synced_local) {
          current.synced_local = acked;
          await clocks.put(current);
        }
      }));
    });
  };

  self.keepLatest = function(f) {
    let running = false;
    let again = false;
    return async function(...args) {
      if (running) {
        again = true;
      } else {
        running = true;
        await f();
        while (again) {
          again = false;
          await f();
        }
        running = false;
      }
    }
  };

  // server replies with a 'tell' event, so most of the hard stuff
  // is in there
  self.syncRemote = self.keepLatest(async function() {
    let {db, socket} = self;
    let clocks = await db.getAll('clocks');
    let ask = clocks.map(c => { return {collection: c.collection, from: c.synced_remote}; });
    socket.emit('ask', ask);
  });

  self.syncAll = () => Promise.all([self.syncRemote(), self.syncOwn()]);

  // ok, we add all the messages we hear from the server to our database.
  // we use put, so adding the same data a second time has no effect.
  // we also update clocks so we know what to ask for next time
  // we query for updates.
  // finally, we broadcast that there's an update to all connected tabs.
  // they're responsible for reading from indexeddb themselves
  self.handleTell = async function(updates) {
    let {db, client_id} = self;

    let tx = db.transaction(['clocks','data'], 'readwrite');
    let data = tx.objectStore('data');
    let clocks = tx.objectStore('clocks');

    await Promise.all(updates.map(async function({collection, values}) {
      let clock = await clocks.get([collection]);
      let latest = 0;
      let puts = [];
      for (let d of values) {
        puts.push(data.put(d));
        if (d.server_index > latest) {
          latest = d.server_index;
        }
      }
      if (latest > clock.synced_remote) {
        clock.synced_remote = latest;
        puts.push(clocks.put(clock));
      }
      return Promise.all(puts);
    }));

    // notify connected tabs
    self.broadcast('update');
  };


  self.ensureSocket = async function() {
    if (self.socket) { return; }

    let db = await self.dbp;

    self.client_id = await db.get('meta', 'client_id');

    let socket = self.socket = io(IO_HOST, {jsonp: false, path: IO_PATH, transports: ['websocket', 'polling']});
    socket.on('connect', self.syncAll);
    socket.on('tell', self.handleTell);

    // we don't have access to online/offline events natively in
    // the sw, but tabs listen for them and forward them to us.

    // don't spam reconnection attempts if we don't have network
    self.on('offline', () => socket.io.reconnection(false));
    // try to reconnect immediately when we know we got network back
    self.on('online', () => {
      if (socket.io.readyState === 'closed') {
        socket.io.connect();
      }
      socket.io.reconnection(true);
    });
  };

  self.on('sw_ping', function(event) {
    event.source.postMessage('sw_pong');
  });

  self.on('ask', () => {
    if (self.socket) {
      self.syncRemote();
    }
  });

  self.on('update', async function(event) {
    // broadcast to other tabs
    self.broadcastOthers(event.source.id, 'update');
    
    // send update to server
    if (self.socket) {
      self.syncOwn();
    }
  });

  self.on('authed', self.ensureSocket);

  self.on('check-auth', async function(pw) {
    // hit the check auth endpoint. if it fails for auth reasons,
    // send a bad_auth event to the tabs.
    // if it succeeds, persist the pw, open the socket,
    // and send an authed event to the tabs.
    // if it fails for some other reason, retry it I guess? Log it?
    let res;
    try {
      res = await fetch(AUTH_ENDPOINT);
    } catch (e) {
      return console.error('Unexpected problem checking auth', e);
    }

    if (res.status === 403) {
      self.broadcast('bad_auth');
    } else if (res.ok) {
      let db = await self.dbp;
      await db.put('meta', pw, 'password');
      await self.ensureSocket();
      self.broadcast('authed');
    }
  });

}(idb, io));
