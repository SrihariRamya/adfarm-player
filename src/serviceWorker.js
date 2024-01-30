export function register() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length == 0) {
        navigator.serviceWorker.register('sample/sw.js')
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

      } else {
        console.log('registrations', registrations, '<<>>')
        console.log('registrations[0].active', registrations[0].active, '<<>>')
        console.log('registrations[0].active.scriptURL', registrations[0].active.scriptURL, '<<>>')
        console.log('registrations[0].active.scriptURL.include("sample")', registrations[0].active.scriptURL.includes('sample'), '<<>>');
        if (!registrations[0].active.scriptURL.includes('sample')) {
          const hari = registrations[0].active.scriptURL.replace('sw.js', '') + `sample/sw.js`;
          console.log('hari value', hari, '<<>>');
          const ramya = registrations[0].scope + 'sample/';
          console.log('ramya value', ramya, '<<>>');
          registrations[0].active.scriptURL = registrations[0].active.scriptURL.replace('sw.js', '') + `sample/sw.js`;
          registrations[0].scope = registrations[0].scope + 'sample/';
          return registrations[0].update();
        }
        registrations[0].update();
      }
    });
  }
}