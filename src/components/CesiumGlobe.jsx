import React from 'react';
const CesiumGlobe = ({ goToCity, activeStage, stageAnimating, onUserInteract, cityPoints }) => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0f1a, #0d1525)', color: '#fff', fontSize: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem' }}>🗺️</div>
        <p>地图加载中...</p>
      </div>
    </div>
  );
};
export default CesiumGlobe;
