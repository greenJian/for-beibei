import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// 全局错误捕获 — 防止黑屏
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && !root.textContent) {
    root.innerHTML = '<div style="color:#fff;text-align:center;padding:60px 20px;font-family:sans-serif;background:#0a0f1a;min-height:100vh"><h2 style="color:#ff8fab">⚠ 页面加载失败</h2><p style="color:#ccc;font-size:14px;word-break:break-all">' + (e.message || e.error?.message || '未知错误') + '</p><p style="color:#666;font-size:12px;margin-top:20px">来源: ' + (e.filename || 'unknown') + '</p></div>';
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

const rootEl = document.getElementById('root');
if (rootEl) {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('App failed to mount:', err);
    rootEl.innerHTML = '<div style="color:#fff;text-align:center;padding:60px 20px;font-family:sans-serif;background:#0a0f1a;min-height:100vh"><h2 style="color:#ff8fab">⚠ 应用启动失败</h2><p style="color:#ccc;font-size:14px;word-break:break-all">' + err.message + '</p></div>';
  }
}
