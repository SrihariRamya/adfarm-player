
var cache_ver = 6.9;
var cache_name = 'adfarm' + cache_ver;
self.addEventListener('install', function (event) {
  console.log('cache_name swv4', cache_name, caches);
  event.waitUntil(
    caches.open(cache_name).then(function (cache) {
      console.log('cache value in install swv4', cache, "<<>>")
      fetch('asset-manifest.json').then(function (response) {
        console.log('response in install<<<<<<< swv4', response, '<<>>')
        if (!response.ok) {
          console.log('Failed to fetch asset-manifest.json swv4');
        }
        return response.json();
      }).then(function (files) {
        console.log('files in install<<<<<<< swv4', files, '<<>>')
        return cache.addAll([...files.entrypoints, '/index.html', '/']).then((data) => {
          console.log('cache.addAll is called swv4', data, '<<>>>')
          return self.skipWaiting();
        }).catch((e) => {
          console.log('Catch block called in cache.addAll swv4', e, '<<>>>')
        });
      })
    })
  )
});

self.addEventListener('fetch', function (event) {
  console.log('from fetc event swv4', event.request);
  if (event.request.method != "POST" && event.request.mode != 'cors' && event.request.destination !== "video" && event.request.destination !== "image") {
    event.respondWith(caches.match(event.request).then(function (response) {
      // caches.match() always resolves
      // but in case of success response will have value
      if (event.request.destination !== "video" && event.request.destination !== "image") {
        if (response !== undefined) {
          return fetch(event.request).then(function (pagecache) {
            let responseClone = pagecache.clone();
            caches.open(cache_name).then(function (cache) {
              cache.put(event.request, responseClone);
            });
            return pagecache;
          }).catch(function () {
            return response;
          });
        } else {
          console.log('from else swv4', event.request)
          return fetch(event.request).then(function (response) {
            let responseClone = response.clone();
            caches.open(cache_name).then(function (cache) {
              cache.put(event.request, responseClone);
            });
            return response;
          }).catch(function (e) {
            console.log('Error during fetch swv4', event.request, e)
            //return caches.match('/');
          });
        }
      }
    }));
  }
});


self.addEventListener('activate', function (event) {
  console.log('from activate event swv4', event, '<>>>')
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      console.log('cacheNames activate event swv4', cacheNames, typeof cacheNames, '<<>>')
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          console.log('cacheName activate event swv4', cacheName, 'cache_name', cache_name, '<<>>')
          return cache_name != cacheName
          // Return true if you want to remove this cache,
          // but remember that caches are shared across
          // the whole origin
        }).map(function (cacheName) {
          console.log('Delete cacheName activate event swv4', cacheName, '<<>>')
          return caches.delete(cacheName);
        })
      ).then(() => {
        console.log('about to reload in New code swv4');
        // Reload the page
        self.clients.matchAll().then(function (clients) {
            console.log('clients', clients, '<<>>')
            clients.forEach(function (client) {
              console.log('client', client, '<<>>')
              console.log('client.url', client.url, '<<>>')
              client.navigate(client.url);
            });
          });
      });
    })
  );
});

