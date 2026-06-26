import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import './App.css';

// List endpoints return { data: [...], pagination: {...} } while the pages
// expect a plain array (setItems(res.data)). Unwrap that shape globally so a
// page never receives an object where it expects a list. Single-item / create
// responses (no pagination key) are left untouched.
axios.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === 'object' && Array.isArray(body.data) && body.pagination) {
    response.data = body.data;
  }
  return response;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
