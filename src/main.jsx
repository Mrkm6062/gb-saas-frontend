import React from 'react';
import ReactDOM from 'react-dom/client';
import './utils/fetchInterceptor.js';
import App from './app.jsx';
import './index.css'; // Assuming you have Tailwind configured here

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);