let staticName = 'static-v1';
let dynamicName = 'dynamic-v1';
let dbVersion = 1;
let cacheSize = 65;
let staticList = [
  '/',
  '/index.html',
  '/404.html',
  './css/main.css',
  './css/materialize.min.css',
  './js/app.js',
  './js/materialize.min.js',
  './img/icon-72x72.png',
  './img/icon-96x96.png',
  './img/icon-128x128.png',
  './img/icon-144x144.png',
  './img/icon-152x152.png',
  './img/icon-192x192.png',
  './img/icon-384x384.png',
  './img/icon-512x512.png',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v78/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
];
let dynamicList = [
  '/results.html',
  '/suggest.html'
];

self.addEventListener('install', (ev) => {
  //install event - browser has installed this version
  console.log('installed');
  ev.waitUntil(
    caches.open(staticName).then(cache => {
      return cache.addAll(staticList);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  //activate event - browser now using this version
  console.log('activated');
  ev.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== staticName && key !== dynamicName)
        .map(key => caches.delete(key))
        )
    })
  );
});

self.addEventListener('fetch', (ev) => {
  //fetch event - web page is asking for an asset
  // console.log('intercepted a http request', ev.request);
  ev.respondWith(
    caches.match(ev.request).then(cacheRes => {
      return cacheRes || fetch(ev.request).then(fetchRes => {
        return caches.open(dynamicName).then(cache => {
          cache.put(ev.request.url, fetchRes.clone());
          return fetchRes;
        })
      });
    })
  );
});

self.addEventListener('message', ({ data }) => {
  //message received from a web page that uses this sw
  console.log('Service worker received', data);
  if('movieList' in data) {
    let msg = 'Thanks. Pretend I did something with the data.';
    sendMessage(msg);
  }
});

const sendMessage = async (msg) => {
  let allClients = await clients.matchAll({ includeUncontrolled: true });
  return Promise.all(
    allClients.map((client) => {
      return client.postMessage(msg);
    })
  );
};
