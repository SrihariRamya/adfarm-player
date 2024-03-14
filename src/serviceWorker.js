import axios from "axios";
import _, { update } from "lodash";
import { CACHE_VERSION } from "./local-player/variable_helper";
import { tvLogger } from "./url-helper";

export function register(isAppCrashed) {
  const queryParams = _.split(window.location.search, '&');
  const browser = queryParams.length > 1 && queryParams[1].replace('isBrowser=', '');
  const player_id = Number(queryParams[0].replace('?player_id=', ''));
  const isBrowser = browser && browser === "true" ? true : false;
  const tenant = 'tfw';

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
              console.log('onupdatefound')
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
        registrations[0].update().then(async (updatedRegistration) => {
          console.log('Service worker updated successfully:', updatedRegistration);
          let updateSteps = window.localStorage.getItem("UPDATE_STEPS");

          if (updatedRegistration.installing) {
            // if (updateSteps !== null) {
            //   updateSteps = await JSON.parse(updateSteps).push('installing');
            // } else {
            //   updateSteps = [].push('installing');
            // }
            // localStorage.setItem('UPDATE_STEPS', JSON.stringify(updateSteps));
            console.log('Installing in update')
            // serviceWorker = registration.installing;
          } else if (updatedRegistration.waiting) {
            // updateSteps = updateSteps !== null ? JSON.parse(updateSteps).push('waiting') : [].push('waiting');
            // localStorage.setItem('UPDATE_STEPS', JSON.stringify(updateSteps));
            console.log('Waiting in update')
            // serviceWorker = registration.waiting;
            // registration.waiting.postMessage('skipWaiting');
          } else if (updatedRegistration.active) {
            // updateSteps = updateSteps !== null ? JSON.parse(updateSteps).push('active') : [].push('active');
            if (updateSteps !== null) {
              updateSteps = await JSON.parse(updateSteps).push('installing');
              console.log('updateSteps in if condition', updateSteps, '<<>>')
              localStorage.setItem('UPDATE_STEPS', JSON.stringify(updateSteps));
            } else {
              updateSteps = [].push('installing');
              console.log('updateSteps in else', updateSteps, '<<>>')
              localStorage.setItem('UPDATE_STEPS', JSON.stringify(updateSteps));
            }
            console.log('Active in update')
            // serviceWorker = registration.active;
            // registration.waiting.postMessage('skipWaiting');

          } else if (updatedRegistration.onupdatefound) {
            // updateSteps = updateSteps !== null ? JSON.parse(updateSteps).push('onupdatefound') : [].push('onupdatefound');
            // localStorage.setItem('UPDATE_STEPS', JSON.stringify(updateSteps));
            console.log('onupdatefound called in update')
            // serviceWorker = registration.installing;
          }
  
          // Add a statechange event listener to the updated service worker
          updatedRegistration.addEventListener('statechange', function (e) {
            console.log('Updated service worker state:', updatedRegistration.state);
            // updateSteps = updateSteps !== null ? JSON.parse(updateSteps).push(`stateChange:${updatedRegistration.state}`) : [].push(`stateChange:${updatedRegistration.state}`);
            // localStorage.setItem('UPDATE_STEPS', JSON.stringify(updateSteps));
            // Handle state changes here
            if (updatedRegistration.state === 'activated' && navigator.serviceWorker.controller) {
              console.log('New service worker activated and controlling the page.');
              // Perform any necessary actions upon activation
            }
          });
        }).catch(error => {
          // let updateSteps = window.localStorage.getItem("UPDATE_STEPS");
          // updateSteps = updateSteps !== null ? JSON.parse(updateSteps).push(`errorcalled`) : [].push(`errorcalled`);
          // localStorage.setItem('UPDATE_STEPS', JSON.stringify(updateSteps));
          console.error('Service worker update failed:', error);
        });
      }
    });
  }
}