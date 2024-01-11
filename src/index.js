import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Routes from './routes';
import * as serviceWorker from './serviceWorker';
import ErrorBoundary from './local-player/error_boundary';
serviceWorker.register();

ReactDOM.render(<ErrorBoundary><Routes /></ErrorBoundary>, document.getElementById('root'));


