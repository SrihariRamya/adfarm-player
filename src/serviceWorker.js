import axios from "axios";
import _ from "lodash";
import { CACHE_VERSION } from "./local-player/variable_helper";
import { tvLogger } from "./url-helper";

export function register(isAppCrashed) {
  const urlData = window.location.pathname;
  const searchParam = window.location.search;
  const queryParams = _.split(window.location.search, '&');
  console.log('queryParams in SW', queryParams, '<<>>>')
  console.log("Number(queryParams[0].replace('?player_id=', '')) in SW", Number(queryParams[0].replace('?player_id=', '')), '<<>>>')
  const browser = queryParams.length > 1 && queryParams[1].replace('isBrowser=', '');
  const player_id = Number(queryParams[0].replace('?player_id=', ''));
  const isBrowser = browser && browser === "true" ? true : false;
  const tenant = 'tfw';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      const oldCacheVersion = window.localStorage.getItem("oldCacheVersion");
      if (registrations.length == 0) {
        console.log('Registration called in ServiceWorker')
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
              console.log('onupdatefound called');
              serviceWorker = registration.installing;
            }
            if (serviceWorker) {
              serviceWorker.addEventListener('statechange', async function (e) {
                console.log('state change', serviceWorker.state);
                if (serviceWorker.state === "activated") {
                  console.log('urlData in activated', urlData, "searchParam", searchParam, "queryParams", queryParams, "<<>>")
                  await axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, urlData, searchParam, queryParams, message: "Registration is success PWS" });
                  localStorage.setItem("oldCacheVersion", CACHE_VERSION.toString());
                  window.location.reload(true);
                }
              });
            }
          }).catch(async function (error) {
            // Failed registration, service worker won’t be installed
            await axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, message: "Error in Registration PWS", error });
          });
      } else if (navigator.onLine && (isAppCrashed || (CACHE_VERSION > Number(oldCacheVersion)))) {
        // Here Player update when the new webPlayer launch (or) App crashing time
        registrations[0].unregister().then(async function (success) {
          if (!isAppCrashed) {
            await axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, urlData, searchParam, message: "Unregistration success PWS", newVersion: CACHE_VERSION, oldVersion: oldCacheVersion });
          }
          window.location.reload(true);
        }).catch(async function () {
          await axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, urlData, searchParam, message: "Unregistration failed PWS", newVersion: CACHE_VERSION, oldVersion: oldCacheVersion });
          window.location.reload(true);
        });
      }
    });
  }
}