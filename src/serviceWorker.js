import { NEW_CACHE_VERSION } from "./local-player/variable_helper";

export function register(isAppCrashed) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      const oldCacheVersion = window.localStorage.getItem("oldCacheVersion");
      console.log('oldCacheVersion', oldCacheVersion, '<<>>')
      if (registrations.length == 0) {
        console.log('Registration called in ServiceWorker')
        navigator.serviceWorker.register('swv4.js')
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
                  window.location.reload(true);
                }
              });
            }
          }).catch(function (err) {
            // Failed registration, service worker won’t be installed
            console.log('Whoops. Service worker registration failed, error:', err);
          });

      } else if (navigator.onLine && (isAppCrashed || (NEW_CACHE_VERSION > Number(oldCacheVersion)))) {
        console.log('registrations', registrations, '<<>>')
        localStorage.setItem("oldCacheVersion", NEW_CACHE_VERSION.toString());
        registrations[0].unregister().then(function (success) {
          window.location.reload(true);
        }).catch(function () {
          window.location.reload(true);
        });
      }
    });
  }
}