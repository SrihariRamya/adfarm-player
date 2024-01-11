import React, { Component } from "react";
import axios from "axios";
import _ from "lodash";
import { tvLogger } from "./../url-helper";

export default class ErrorBoundary extends Component {
  componentDidMount() {
    window.addEventListener('error', (event) => {
      console.log('Error in error_boundary Mount', event, '<<>>>')
    });

    window.onerror = function (message, source, lineno, colno, error) {
      console.log('window.onerror called error_boundary Mount', error, 'message', message, 'colno', colno, 'lineno', lineno, 'source', source, '<<>>>');
    };
  }
  componentDidCatch(error, errorInfo) {
    console.log('error in componentDidCatch', error, 'errorInfo', '<<>>')
    const urlData = _.split(window.location.pathname, '&');
    const player_id = Number(urlData[0].replace('/player_id=', ''));
    const isBrowser = Boolean(window.location.search.replace("?browser=", ""));
    const tenant = window.location.href.split("/")[2].split(".")[1];
    axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, message: "ErrorBoundary in PWS", error, errorInfo }).catch((err) => {});
  }

  render() {
    return this.props.children;
  }
}
