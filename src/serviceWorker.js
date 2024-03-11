import { NEW_CACHE_VERSION } from "./local-player/variable_helper";

export function register(isAppCrashed) {
  console.log('ServiceWorker file is called')
  console.log('NEW_CACHE_VERSION', NEW_CACHE_VERSION, typeof NEW_CACHE_VERSION, '<>>>')
  if ('serviceWorker' in navigator) {
    console.log('(serviceWorker in navigator) in ServiceWorker')
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length == 0) {
        console.log('Registration called in ServiceWorker')
        navigator.serviceWorker.register('swv3.js')
          .then(function (registration) {
            var serviceWorker;
            if (registration.installing) {
              console.log('Installing')
              serviceWorker = registration.installing;
            } else if (registration.waiting) {
              console.log('Waiting')
              serviceWorker = registration.waiting;
              registration.waiting.postMessage('skipWaiting');
            } else if (registration.active) {
              console.log('Active')
              serviceWorker = registration.active;
              registration.waiting.postMessage('skipWaiting');

            } else if (registration.onupdatefound) {
              console.log('onupdatefound called');
              serviceWorker = registration.installing;
            }
            if (serviceWorker) {
              serviceWorker.addEventListener('statechange', function (e) {
                console.log('state change', serviceWorker.state);
                if (serviceWorker.state === "activated") {
                  console.log('State === "activated" called')
                  setTimeout(() => {
                    window.location.reload(true);
                  }, 10 * 1000);
                }
              });
            }
          }).catch(function (err) {
            // Failed registration, service worker won’t be installed
            // console.log('Whoops. Service worker registration failed, error:', err);
          });

      } else if (navigator.onLine) {
        console.log('registrations', registrations, '<<>>')
        const oldCacheVersion = window.localStorage.getItem("oldCacheVersion");
        console.log('oldCacheVersion', oldCacheVersion, '<<>>')
        if (isAppCrashed || (NEW_CACHE_VERSION > Number(oldCacheVersion))) {
          localStorage.setItem("oldCacheVersion", NEW_CACHE_VERSION.toString());
          registrations[0].unregister().then(function(success) {
            setTimeout(() => {
              console.log('Reload called ServiceWorker');
              window.location.reload(true);
            }, 10 * 1000);
          }).catch(function() {
            setTimeout(() => {
              console.log('Reload called ServiceWorker');
              window.location.reload(true);
            }, 10 * 1000);
          });
        }
      }
    });
  }
}