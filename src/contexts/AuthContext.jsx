import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const STORAGE_KEY = 'our_moments_user';

/**
 * 浏览器端 SHA-256 哈希（Web Crypto API）
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 启动时从 localStorage 恢复登录状态
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.username) {
          setUser(parsed);
        }
      }
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    // 1. 密码哈希
    const hash = await sha256(password);

    // 2. 查询 Supabase 验证（avatar_url 可能还不存在，分开获取）
    let { data, error } = await supabase
      .from('site_users')
      .select('id, username, display_name, gender')
      .eq('username', username.trim())
      .eq('password_hash', hash)
      .maybeSingle();

    if (error) {
      console.error('Login query error:', error);
      throw new Error('数据库查询失败: ' + (error.message || JSON.stringify(error)));
    }
    if (!data) {
      // 调试：检查用户是否存在
      const { data: checkUser } = await supabase
        .from('site_users')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();
      
      if (!checkUser) {
        throw new Error('账号不存在，请检查是否已在 Supabase 创建 site_users 表');
      }
      throw new Error('密码错误');
    }

    // 3. 尝试加载头像（如果 avatar_url 列存在）
    let avatarUrl = null;
    try {
      const { data: avatarData } = await supabase
        .from('site_users')
        .select('avatar_url')
        .eq('id', data.id)
        .maybeSingle();
      avatarUrl = avatarData?.avatar_url || null;
    } catch (e) {
      // avatar_url 列可能还不存在，忽略
    }

    // 4. 存储登录状态
    const userData = {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      gender: data.gender,
      avatarUrl,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const updateAvatar = useCallback(async (file) => {
    if (!user) throw new Error('未登录');

    // 1. 上传到 Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    // 2. 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // 3. 更新数据库
    const { error: updateError } = await supabase
      .from('site_users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // 4. 更新本地状态
    const updated = { ...user, avatarUrl };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
    return avatarUrl;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAvatar, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
