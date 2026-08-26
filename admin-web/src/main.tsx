/**
 * จุดเริ่มต้นของ Admin Web
 * โหลดธีมกลางก่อน แล้วค่อย render แอป
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('ไม่พบ element ที่มี id="root" ใน index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
