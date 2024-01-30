import axios from "axios";
import { tvLogger } from "./url-helper";

export function register(isAppCrashed) {
  axios.post(`${tvLogger()} `, { player_id: 321, message: `SWorker called` });
  console.log('isAppCrashed', isAppCrashed, '<<>>')
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length == 0) {
        navigator.serviceWorker.register('sw.js')
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
        if (isAppCrashed) {
          // registrations[0].unregister().then(function(success) {
          //   window.location.reload(true);
          // }).catch(function() {
          //   window.location.reload(true);
          // });
        } else {
          registrations[0].update();
        }
      }
    });
  }
}