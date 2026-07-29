import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 四个 Tab 配置：图标 + 文字
const TABS = [
  {
    id: 'keywords',
    label: '知你',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="22" height="22">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'towhere',
    label: '寻光',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="22" height="22">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    id: 'breaking',
    label: '初时',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="22" height="22">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
  {
    id: 'us',
    label: '我们',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="22" height="22">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
];

export default function MobileNavbar({ activeTab, setTab, onGoWhisper }) {
  const { user, logout } = useAuth();
  const [showUsPanel, setShowUsPanel] = useState(false);

  const handleTabClick = (tabId) => {
    if (tabId === 'us') {
      setShowUsPanel(!showUsPanel);
      return;
    }
    setShowUsPanel(false);
    setTab(tabId);
  };

  return (
    <>
      {/* 底部 Tab 导航 */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 10000,
        background: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: 56,
          maxWidth: 500,
          margin: '0 auto',
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === 'us' && (activeTab === 'letters' || showUsPanel));
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#FFB84D' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 12,
                  transition: 'all 0.25s ease',
                  minWidth: 60,
                }}
              >
                {tab.icon(isActive)}
                <span style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: 0.5,
                  fontFamily: "'PingFang SC', sans-serif",
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* "我们" 面板 */}
      {showUsPanel && (
        <div
          style={{
            position: 'fixed',
            bottom: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(320px, 90vw)',
            background: 'rgba(20, 24, 40, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 20px',
            zIndex: 10001,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* 用户信息 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingBottom: 14,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 10,
          }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', fontFamily: "'PingFang SC', sans-serif" }}>
                {user?.email || '用户'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                专属纪念空间
              </div>
            </div>
          </div>

          {/* 悄悄话入口 */}
          <button
            onClick={() => { setShowUsPanel(false); onGoWhisper(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '12px 0',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: "'PingFang SC', sans-serif",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M22 4L12 13 2 4"/>
            </svg>
            <span>悄悄话</span>
          </button>

          {/* 登出 */}
          <button
            onClick={() => { setShowUsPanel(false); logout(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '12px 0',
              background: 'none',
              border: 'none',
              color: 'rgba(255,120,120,0.85)',
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: "'PingFang SC', sans-serif",
              borderTop: '1px solid rgba(255,255,255,0.06)',
              marginTop: 4,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>登出</span>
          </button>
        </div>
      )}

      {/* 点击遮罩关闭面板 */}
      {showUsPanel && (
        <div
          onClick={() => setShowUsPanel(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'transparent',
          }}
        />
      )}
    </>
  );
}
