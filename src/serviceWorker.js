export function register(isAppCrashed) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length == 0) {
        console.log('Registration called in ServiceWorker')
        navigator.serviceWorker.register('swv6.js')
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
              serviceWorker = registration.installing;
            }
            if (serviceWorker) {
              serviceWorker.addEventListener('statechange', function (e) {
                console.log('state change', serviceWorker.state);
                if (serviceWorker.state === 'installed' && navigator.serviceWorker.controller) {
                }
              });
            }


          }).catch(function (err) {
            // Failed registration, service worker won’t be installed
            // console.log('Whoops. Service worker registration failed, error:', err);
          });

      } else if (navigator.onLine) {
        console.log('registrations', registrations, '<<>>')
        registrations[0].update();
        const needUnregister = window.localStorage.getItem("registeredFile");
        console.log('needUnregister', needUnregister, '<<>>')
        if (isAppCrashed || (needUnregister !== "swv6")) {
          localStorage.setItem("registeredFile", "swv6");
          registrations[0].unregister().then(function(success) {
            window.location.reload(true);
            setTimeout(() => {
              console.log('Reload called ServiceWorker');
              window.location.reload(true);
            }, 30 * 1000);
          }).catch(function() {
            setTimeout(() => {
              console.log('Reload called ServiceWorker');
              window.location.reload(true);
            }, 30 * 1000);
          });
        } else {
          registrations[0].update();
        }
      }
    });
  }
}