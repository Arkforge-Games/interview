import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const APP_VERSION = 'v0.0.1';
console.log(`%cSlayJobs ${APP_VERSION}`, 'color: #7c3aed; font-weight: bold; font-size: 14px;');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);