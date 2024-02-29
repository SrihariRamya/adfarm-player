
var cache_ver = 3.7;
var cache_name = 'adfarm' + cache_ver;
self.addEventListener('install', function (event) {
  console.log('cache_name', cache_name, caches);
  event.waitUntil(
    caches.open(cache_name).then(function (cache) {
      console.log('cache value in install', cache, "<<>>")
      fetch('asset-manifest.json').then(function (response) {
        console.log('response in install<<<<<<<', response, '<<>>')
        if (!response.ok) {
          console.log('Failed to fetch asset-manifest.json');
        }
        return response.json();
      }).then(function (files) {
        console.log('files in install<<<<<<<', files, '<<>>')
        return cache.addAll([...files.entrypoints, '/index.html', '/']).then((data) => {
          console.log('cache.addAll is called', data, '<<>>>')
          return self.skipWaiting();
        }).catch((e) => {
          console.log('Catch block called in cache.addAll', e, '<<>>>')
        });
      })
    })
  )
});

self.addEventListener('fetch', function (event) {
  console.log('from fetc event', event.request);
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
          console.log('from else', event.request)
          return fetch(event.request).then(function (response) {
            let responseClone = response.clone();
            caches.open(cache_name).then(function (cache) {
              cache.put(event.request, responseClone);
            });
            return response;
          }).catch(function (e) {
            console.log('Error during fetch', event.request, e)
            //return caches.match('/');
          });
        }
      }
    }));
  }
});


self.addEventListener('activate', function (event) {
  console.log('from activate event', event, '<>>>')
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      console.log('cacheNames activate event', cacheNames, typeof cacheNames, '<<>>')
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          console.log('cacheName activate event', cacheName, 'cache_name', cache_name, '<<>>')
          return cache_name != cacheName
          // Return true if you want to remove this cache,
          // but remember that caches are shared across
          // the whole origin
        }).map(function (cacheName) {
          console.log('Delete cacheName activate event', cacheName, '<<>>')
          return caches.delete(cacheName);
        })
      ).then(() => {
        console.log('about to reload in New code');
        // Reload the page
        self.clients.matchAll().then(function (clients) {
          clients.forEach(function (client) {
            client.navigate(client.url);
          });
        });
      });
    })
  );
});

