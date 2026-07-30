import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const ACCOUNTS = [
  { username: 'greenjian', label: '小汪', emoji: '🐶', hint: '密码: love' },
  { username: 'beibei', label: '小丁', emoji: '🐱', hint: '密码: love' },
];

const LoginPage = () => {
  const { login } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedUser || !password.trim()) {
      setError('请选择账号并输入密码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(selectedUser, password);
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (username) => {
    setSelectedUser(username);
    setError('');
  };

  return (
    <div className="login-page">
      {/* 背景动画粒子 */}
      <div className="login-bg">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="login-bg-dot"
            animate={{
              y: [-20, -120],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'easeInOut',
            }}
            style={{
              left: `${Math.random() * 100}%`,
              width: 3 + Math.random() * 5,
              height: 3 + Math.random() * 5,
              background: `hsl(${Math.random() * 60 + 320}, 80%, 70%)`,
            }}
          />
        ))}
      </div>

      {/* 登录卡片 */}
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="login-header">
          <motion.div
            className="login-logo"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            💕
          </motion.div>
          <h1 className="login-title">For Beibei</h1>
          <p className="login-subtitle">属于我们的独家记忆</p>
        </div>

        {/* 选择账号 */}
        <div className="login-accounts">
          {ACCOUNTS.map((acc) => (
            <motion.button
              key={acc.username}
              type="button"
              className={`login-account-btn ${selectedUser === acc.username ? 'active' : ''}`}
              onClick={() => handleSelectUser(acc.username)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="login-account-emoji">{acc.emoji}</span>
              <span className="login-account-label">{acc.label}</span>
              {selectedUser === acc.username && (
                <motion.span
                  className="login-check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>

        {/* 密码输入 */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-input-group">
            <input
              type="password"
              className={`login-input ${error ? 'error' : ''}`}
              placeholder={selectedUser ? '输入密码' : '请先选择账号'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              disabled={!selectedUser}
              autoFocus
            />
          </div>

          {error && (
            <motion.p
              className="login-error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            className="login-submit"
            disabled={!selectedUser || loading}
            whileHover={selectedUser && !loading ? { scale: 1.03 } : {}}
            whileTap={selectedUser && !loading ? { scale: 0.97 } : {}}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              '开启甜蜜'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
