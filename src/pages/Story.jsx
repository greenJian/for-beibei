import React from 'react';
export default function Story({ goTo }) {
  return React.createElement('div', { style: { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1a', color: '#fff' } },
    React.createElement('h1', null, '旅行故事'),
    React.createElement('p', null, '你们的旅行故事将在这里展开'),
    React.createElement('button', { onClick: () => goTo('home'), style: { padding: '10px 24px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', marginTop: 20 } }, '返回首页')
  );
}
