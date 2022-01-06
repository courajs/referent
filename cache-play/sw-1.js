// The build step prepends a list of all compiled artifacts
// to the top of this file, for pre-caching purposes.
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

const ASSETS = [
  'a.txt',
  'sw-1.js',
  'index.html',
];

self.addEventListener('install', function(event) {
  event.waitUntil(do_install());
});

self.addEventListener('activate', function(event) {
  clear_other_caches();
});

self.addEventListener('fetch', function(event) {
  if (event.request.destination === 'document') {
    event.respondWith(fetch_index());
  } else {
    event.respondWith(fetch_asset(event.request));
  }
});


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
  if (new URL(req.url).protocol === 'chrome-extension:') {
    return fetch(req);
  }
  let c = await caches.open(ASSET_CACHE);
  let response = await c.match(req);
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
  c.add('/');
  return c.match('/');
}

async function do_install() {
  await Promise.all([install_index(), install_assets()]);
}
async function install_index() {
  let c = await caches.open(INDEX_CACHE);
  await c.add('/');
}
async function install_assets() {
  let c = await caches.open(ASSET_CACHE);
  await c.addAll(ASSETS);
}

const own_filename = /^sw-.*\.js$/;
const WORKER_FILENAME = ASSETS.find(asset => own_filename.test(asset));
const INDEX_CACHE = `${WORKER_FILENAME}-index`;
const ASSET_CACHE = `${WORKER_FILENAME}-assets`;

