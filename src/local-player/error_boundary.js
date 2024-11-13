import React, { Component } from "react";
import axios from "axios";
import _ from "lodash";
import { tvLogger } from "./../url-helper";
import { register } from "../serviceWorker";

export default class ErrorBoundary extends Component {
  componentDidMount() {
    window.addEventListener('error', (event) => {
      console.log('Event in error_boundary Mount', event, '<<>>>')
      const queryParams = _.split(window.location.search, '&');
      const browser = queryParams.length > 1 && queryParams[1].replace('isBrowser=', '');
      const player_id = Number(queryParams[0].replace('?player_id=', ''));
      const isBrowser = browser && browser === "true" ? true : false;
      const tenant = 'tfw';
      axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, message: "Error AddEListener in ErrorBoundary PWS", event }).catch((err) => { });
    });

    window.onerror = function (message, source, lineno, colno, error) {
      console.log('window.onerror called error_boundary Mount', error, 'message', message, 'colno', colno, 'lineno', lineno, 'source', source, '<<>>>');
      const queryParams = _.split(window.location.search, '&');
      const browser = queryParams.length > 1 && queryParams[1].replace('isBrowser=', '');
      const player_id = Number(queryParams[0].replace('?player_id=', ''));
      const isBrowser = browser && browser === "true" ? true : false;
      const tenant = 'tfw';
      axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, message: "window.onError in ErrorBoundary PWS", error, mainMessage: message, source, lineno, colno }).catch((err) => { });
      if (message == 'ResizeObserver loop limit exceeded') {
        console.warn('Loop limit exceeded in window.onerror error_boundary');
        return;
      }
    };
  }
  async componentDidCatch(error, errorInfo) {
    console.log('error in componentDidCatch', error, 'errorInfo', errorInfo, '<<>>')
    const queryParams = _.split(window.location.search, '&');
    const browser = queryParams.length > 1 && queryParams[1].replace('isBrowser=', '');
    const player_id = Number(queryParams[0].replace('?player_id=', ''));
    const isBrowser = browser && browser === "true" ? true : false;
    const tenant = 'tfw';
    await axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, message: "ErrorBoundary in PWS", error, errorInfo }).catch((err) => {});
    setTimeout(() => register(true), 1000);
    if (error.message === 'ResizeObserver loop limit exceeded') {
      console.warn('Loop limit exceeded in CDC error_boundary');
      return;
    }
  }

  render() {
    return this.props.children;
  }
}
