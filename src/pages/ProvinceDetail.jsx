import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { uploadToSupabase } from '../lib/supabaseStorage';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateGroup(dateStr) {
  if (!dateStr) return '未标注日期';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}年${m}月`;
}

const inputBaseStyle = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10, color: '#fff', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif",
};

export default function ProvinceDetail({ provinceName, goBack }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(''); // success/error toast
  const [activeIndex, setActiveIndex] = useState(null);
  const [expandedCities, setExpandedCities] = useState({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'memory'|'photo', memoryId, photoUrl? }

  // Edit modal
  const [editMemory, setEditMemory] = useState(null); // the memory being edited
  const [editCity, setEditCity] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStory, setEditStory] = useState('');
  const [editPhotos, setEditPhotos] = useState([]); // existing photo URLs
  const [newEditFiles, setNewEditFiles] = useState([]); // newly selected files (not uploaded yet)
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const editFileRef = useRef(null);

  // Hero image replacement
  const [heroReplacing, setHeroReplacing] = useState(false);
  const heroFileRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!provinceName) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: dbErr } = await supabase
        .from('province_memories')
        .select('*')
        .eq('province_name', provinceName)
        .order('visit_date', { ascending: false });

      if (dbErr) {
        setError(dbErr.message);
      } else {
        setMemories(data || []);
        const exp = {};
        (data || []).forEach(m => { if (m.city) exp[m.city] = true; });
        setExpandedCities(exp);
      }
    } catch (err) {
      setError('加载失败');
    }
    setLoading(false);
  }, [provinceName]);

  useEffect(() => { loadData(); }, [loadData]);

  // Group memories by city (exclude background-only entries)
  const groupedByCity = useMemo(() => {
    const map = {};
    memories.forEach(m => {
      if (m.city === '_背景_') return; // skip background entries
      const city = m.city || '未分类城市';
      if (!map[city]) map[city] = [];
      map[city].push(m);
    });
    const sorted = Object.entries(map).sort((a, b) => {
      const aMax = Math.max(...a[1].map(m => m.visit_date ? new Date(m.visit_date).getTime() : 0));
      const bMax = Math.max(...b[1].map(m => m.visit_date ? new Date(m.visit_date).getTime() : 0));
      return bMax - aMax;
    });
    return sorted;
  }, [memories]);

  const allPhotos = useMemo(() => {
    const arr = [];
    memories.forEach(m => {
      if (m.city === '_背景_') return; // skip background entries
      (m.photos || []).forEach(url => {
        arr.push({ url, memoryId: m.id, city: m.city, date: m.visit_date, story: m.story });
      });
    });
    return arr;
  }, [memories]);

  const heroImage = useMemo(() => {
    const bgMem = memories.find(m => m.city === '_背景_');
    if (bgMem && bgMem.photos?.length > 0) return bgMem.photos[bgMem.photos.length - 1];
    return allPhotos.length > 0 ? allPhotos[0].url : '';
  }, [memories, allPhotos]);
  const totalPhotos = allPhotos.length;
  const totalCities = Object.keys(groupedByCity).length;

  // Keyboard nav for fullscreen viewer
  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setActiveIndex(null);
      if (e.key === 'ArrowRight') setActiveIndex(i => Math.min(i + 1, allPhotos.length - 1));
      if (e.key === 'ArrowLeft') setActiveIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, allPhotos.length]);

  const toggleCity = (city) => {
    setExpandedCities(prev => ({ ...prev, [city]: !prev[city] }));
  };

  // ── Delete memory ──
  const confirmDeleteMemory = (memoryId) => {
    setDeleteTarget({ type: 'memory', memoryId });
  };

  // ── Delete photo ──
  const confirmDeletePhoto = (memoryId, photoUrl) => {
    setDeleteTarget({ type: 'photo', memoryId, photoUrl });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null); // close dialog immediately
    try {
      if (target.type === 'memory') {
        const { error: delErr } = await supabase.from('province_memories').delete().eq('id', target.memoryId);
        if (delErr) throw delErr;
        setToast('已删除该回忆');
      } else if (target.type === 'photo') {
        const mem = memories.find(m => m.id === target.memoryId);
        if (!mem) throw new Error('未找到对应记录');
        const updatedPhotos = (mem.photos || []).filter(u => u !== target.photoUrl);
        const { error: updErr } = await supabase.from('province_memories')
          .update({ photos: updatedPhotos })
          .eq('id', target.memoryId);
        if (updErr) throw updErr;
        setToast('照片已删除');
      }
      loadData();
    } catch (err) {
      console.error('Delete failed:', err);
      setToast('操作失败: ' + (err.message || '未知错误'));
    }
    // auto-clear toast
    setTimeout(() => setToast(''), 3000);
  };

  // ── Open edit modal ──
  const openEdit = (memory) => {
    setEditMemory(memory);
    setEditCity(memory.city || '');
    setEditDate(memory.visit_date || '');
    setEditStory(memory.story || '');
    setEditPhotos(memory.photos || []);
    setNewEditFiles([]);
  };

  const closeEdit = () => {
    setEditMemory(null);
  };

  // Remove a photo from edit mode
  const removeEditPhoto = (url) => {
    setEditPhotos(prev => prev.filter(u => u !== url));
  };

  // Handle new file selection in edit mode
  const handleEditFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setEditUploading(true);
    try {
      const results = await Promise.all(
        files.map(file => uploadToSupabase(file, 'travel-photos'))
      );
      setEditPhotos(prev => [...prev, ...results.map(r => r.publicUrl)]);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setEditUploading(false);
    // Reset file input
    if (editFileRef.current) editFileRef.current.value = '';
  };

  // Save edit
  const saveEdit = async () => {
    if (!editMemory || !editCity.trim()) return;
    setEditSaving(true);
    try {
      const { error: updErr } = await supabase.from('province_memories').update({
        city: editCity.trim(),
        visit_date: editDate || null,
        story: editStory,
        photos: editPhotos,
      }).eq('id', editMemory.id);
      if (updErr) throw updErr;
      setToast('修改已保存');
      closeEdit();
      loadData();
    } catch (err) {
      console.error('Edit failed:', err);
      setToast('保存失败: ' + (err.message || '未知错误'));
      setTimeout(() => setToast(''), 3000);
    }
    setEditSaving(false);
  };

  // ── Hero image replacement ──
  const handleHeroReplace = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroReplacing(true);
    try {
      const { publicUrl } = await uploadToSupabase(file, 'travel-photos');
      // Find or create the background memory entry (city = '_背景_')
      const bgMem = memories.find(m => m.city === '_背景_');
      if (bgMem) {
        await supabase.from('province_memories')
          .update({ photos: [publicUrl] })
          .eq('id', bgMem.id);
      } else {
        await supabase.from('province_memories').insert({
          province_name: provinceName,
          photos: [publicUrl],
          city: '_背景_',
          story: '',
        });
      }
      setToast('背景已更新');
      loadData();
    } catch (err) {
      console.error('Hero replace failed:', err);
      setToast('替换失败: ' + (err.message || '未知错误'));
    }
    setHeroReplacing(false);
    if (heroFileRef.current) heroFileRef.current.value = '';
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div style={{
      width: '100%', height: '100%', minHeight: '100%',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)',
      color: '#fff', position: 'relative', overflow: 'hidden',
      fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif",
    }}>
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={goBack}
        style={{
          position: 'fixed', top: 24, left: 24, zIndex: 30,
          padding: '9px 20px', fontSize: 14, color: '#fff',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 999, cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        ← 返回地图
      </motion.button>

      {loading ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#FFB84D' }}
          />
          <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)' }}>加载中…</div>
        </div>
      ) : error ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#FF8FAB', marginBottom: 12 }}>{error}</div>
          <button onClick={loadData} style={{ padding: '8px 22px', color: '#fff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, cursor: 'pointer' }}>重试</button>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Hero section — click to replace */}
          <div
            style={{ position: 'relative', width: '100%', height: 'max(62vh, 320px)', minHeight: 320, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => heroFileRef.current?.click()}
            onMouseEnter={e => { const el = e.currentTarget.querySelector('.hero-replace-overlay'); if (el) el.style.opacity = '1'; }}
            onMouseLeave={e => { const el = e.currentTarget.querySelector('.hero-replace-overlay'); if (el) el.style.opacity = '0'; }}
          >
            {heroImage ? (
              <img src={heroImage} alt={provinceName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a2040, #0a0f1a)' }} />
            )}
            {/* Hover overlay */}
            <div className="hero-replace-overlay" style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
            }}>
              {heroReplacing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }}
                />
              ) : (
                <>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span style={{ color: '#fff', fontSize: 13, marginTop: 8, letterSpacing: '0.06em' }}>
                    {heroImage ? '点击更换背景' : '点击上传背景'}
                  </span>
                </>
              )}
            </div>
            {/* Hidden file input */}
            <input
              ref={heroFileRef}
              type="file"
              accept="image/*"
              onChange={handleHeroReplace}
              style={{ display: 'none' }}
              disabled={heroReplacing}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,15,26,0.15) 0%, rgba(10,15,26,0.35) 50%, rgba(10,15,26,0.9) 100%)' }} />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 48, padding: '0 48px', textAlign: 'left' }}
            >
              <div style={{ fontSize: 13, letterSpacing: '0.3em', color: '#FFB84D', marginBottom: 10, fontWeight: 600 }}>PROVINCE · 省份</div>
              <h1 style={{ margin: 0, fontSize: 'clamp(40px, 8vw, 88px)', fontWeight: 800, letterSpacing: '0.04em', textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>{provinceName}</h1>
              <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>{totalCities} 座城市</span>
                <span>·</span>
                <span>{totalPhotos} 张照片</span>
              </div>
            </motion.div>
          </div>

          {/* No data */}
          {groupedByCity.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '80px 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📷</div>
              <div>暂无回忆，返回地图点击"点亮地图"添加吧</div>
            </div>
          )}

          {/* City sections */}
          {groupedByCity.map(([city, cityMemories], cityIdx) => {
            const isExpanded = expandedCities[city] !== false;
            const cityPhotos = cityMemories.flatMap(m => m.photos || []);

            // Group by date within city
            const dateGroups = {};
            cityMemories.forEach(m => {
              const key = formatDateGroup(m.visit_date);
              if (!dateGroups[key]) dateGroups[key] = [];
              dateGroups[key].push(m);
            });

            return (
              <motion.div
                key={city}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: cityIdx * 0.1, duration: 0.5 }}
                style={{ padding: '0 48px', maxWidth: 1200, margin: '0 auto 48px' }}
              >
                {/* City header */}
                <div
                  onClick={() => toggleCity(city)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '18px 0', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: 20,
                  }}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ color: '#FFB84D', fontSize: 16 }}
                  >›</motion.div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '0.04em' }}>{city}</h2>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{cityPhotos.length} 张照片</span>
                </div>

                {/* Date groups within city */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      {Object.entries(dateGroups).map(([dateLabel, groupMemories], dateIdx) => (
                        <div key={dateLabel} style={{ marginBottom: 28 }}>
                          {/* Date header with actions */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 14,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FF8FAB' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em' }}>{dateLabel}</span>
                            </div>
                            {/* Action buttons per date group */}
                            <div style={{ display: 'flex', gap: 8 }}>
                              {groupMemories.map(m => (
                                <div key={m.id} style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                                    title="编辑"
                                    style={{
                                      width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                                      background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 13, transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,184,77,0.2)'; e.currentTarget.style.borderColor = '#FFB84D'; e.currentTarget.style.color = '#FFB84D'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); confirmDeleteMemory(m.id); }}
                                    title="删除这条记忆"
                                    style={{
                                      width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                                      background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 13, transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,143,171,0.2)'; e.currentTarget.style.borderColor = '#FF8FAB'; e.currentTarget.style.color = '#FF8FAB'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Story text */}
                          {groupMemories.some(m => m.story) && groupMemories.map(m =>
                            m.story ? (
                              <p key={`story-${m.id}`} style={{
                                margin: '0 0 14px 0', fontSize: 14, lineHeight: 1.9,
                                color: 'rgba(255,255,255,0.65)', whiteSpace: 'pre-wrap',
                                paddingLeft: 2,
                              }}>
                                {m.story}
                              </p>
                            ) : null
                          )}

                          {/* Photos grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 12,
                          }}>
                            {groupMemories.flatMap(m =>
                              (m.photos || []).map((url, pi) => (
                                <motion.div
                                  key={`${m.id}-${pi}`}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true, amount: 0.2 }}
                                  transition={{ delay: (dateIdx * 0.05) + (pi * 0.03), duration: 0.4 }}
                                  style={{
                                    position: 'relative', aspectRatio: '1/1', borderRadius: 10,
                                    overflow: 'hidden', cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.04)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                    transition: 'transform 0.4s cubic-bezier(.2,.7,.2,1), box-shadow 0.4s ease',
                                    group: 'photo-card',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.5)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'; }}
                                >
                                  <img src={url} alt=""
                                    onClick={() => {
                                      const globalIdx = allPhotos.findIndex(p => p.url === url);
                                      if (globalIdx >= 0) setActiveIndex(globalIdx);
                                    }}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    loading="lazy"
                                    onError={e => { e.target.style.opacity = 0.2; }}
                                  />
                                  {/* Delete photo button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); confirmDeletePhoto(m.id, url); }}
                                    title="删除这张照片"
                                    style={{
                                      position: 'absolute', top: 8, right: 8,
                                      width: 28, height: 28, borderRadius: '50%',
                                      background: 'rgba(0,0,0,0.55)', border: 'none',
                                      color: '#fff', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 12, opacity: 0,
                                      transition: 'opacity 0.25s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                                    onFocus={e => { e.currentTarget.style.opacity = 1; }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                  </button>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Bottom spacer */}
          <div style={{ height: 80 }} />
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10001,
              background: 'rgba(5,7,15,0.7)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(20,28,52,0.98)', borderRadius: 14,
                padding: '32px 28px 24px', maxWidth: 380, width: '90%',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#fff' }}>
                {deleteTarget.type === 'memory' ? '删除这条回忆？' : '删除这张照片？'}
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                {deleteTarget.type === 'memory'
                  ? '将删除该城市这次旅行的全部照片和文字，此操作不可撤销。'
                  : '只删除这张照片，其余照片和文字会保留。'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: '10px 28px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                    fontSize: 14, fontFamily: "'PingFang SC', sans-serif",
                  }}
                >取消</button>
                <button
                  onClick={executeDelete}
                  style={{
                    padding: '10px 28px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #FF8FAB 0%, #ff5e7a 100%)',
                    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    fontFamily: "'PingFang SC', sans-serif",
                  }}
                >确认删除</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit modal ── */}
      <AnimatePresence>
        {editMemory && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10001,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={closeEdit}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 'min(480px, 92vw)', maxHeight: '85vh', overflow: 'auto',
                background: 'linear-gradient(180deg, rgba(13,21,37,0.99) 0%, rgba(10,15,26,0.99) 100%)',
                borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
                padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, color: '#FFB84D', fontSize: 18, fontWeight: 700 }}>编辑回忆</h3>
                <button
                  onClick={closeEdit}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✕</button>
              </div>

              {/* City */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>城市</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={e => setEditCity(e.target.value)}
                  style={inputBaseStyle}
                  placeholder="输入城市名"
                />
              </div>

              {/* Date */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>日期</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  style={{ ...inputBaseStyle, colorScheme: 'dark' }}
                />
              </div>

              {/* Story */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>故事</label>
                <textarea
                  value={editStory}
                  onChange={e => setEditStory(e.target.value)}
                  placeholder="写下关于这次旅行的回忆..."
                  style={{ ...inputBaseStyle, minHeight: 100, resize: 'vertical' }}
                />
              </div>

              {/* Photos */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>
                  照片 ({editPhotos.length} 张)
                </label>
                {editPhotos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {editPhotos.map((url, i) => (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={() => removeEditPhoto(url)}
                          style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 20,
                    background: 'rgba(255,184,77,0.15)', border: '1px solid rgba(255,184,77,0.3)',
                    color: '#FFB84D', cursor: 'pointer', fontSize: 13,
                }}>
                  {editUploading ? '上传中...' : '+ 添加照片'}
                  <input ref={editFileRef} type="file" accept="image/*" multiple onChange={handleEditFileSelect} style={{ display: 'none' }} disabled={editUploading} />
                </label>
              </div>

              {/* Save button */}
              <button
                onClick={saveEdit}
                disabled={editSaving || !editCity.trim()}
                style={{
                  width: '100%', padding: '12px',
                  background: editSaving || !editCity.trim()
                    ? 'rgba(255,255,255,0.1)'
                    : 'linear-gradient(135deg, #FFB84D 0%, #FF8FAB 100%)',
                  border: 'none', borderRadius: 12,
                  cursor: editSaving || !editCity.trim() ? 'default' : 'pointer',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  fontFamily: "'PingFang SC', sans-serif",
                }}
              >
                {editSaving ? '保存中...' : '保存修改'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
              zIndex: 99999, padding: '12px 28px', borderRadius: 12,
              background: toast.startsWith('操作失败') ? 'rgba(255,143,171,0.95)' : 'rgba(60,200,130,0.95)',
              color: '#fff', fontSize: 14, fontWeight: 500,
              letterSpacing: '0.04em', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {activeIndex !== null && allPhotos[activeIndex] && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActiveIndex(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(5,7,15,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, padding: 20,
            }}
          >
            <button
              style={{ position: 'absolute', top: 24, right: 28, width: 42, height: 42, borderRadius: '50%', fontSize: 20, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', zIndex: 1 }}
              onClick={e => { e.stopPropagation(); setActiveIndex(null); }}
            >✕</button>

            {activeIndex > 0 && (
              <button
                style={{ position: 'absolute', top: '50%', left: 20, transform: 'translateY(-50%)', width: 52, height: 52, borderRadius: '50%', fontSize: 32, lineHeight: '50px', color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', textAlign: 'center', zIndex: 1 }}
                onClick={e => { e.stopPropagation(); setActiveIndex(activeIndex - 1); }}
              >‹</button>
            )}
            {activeIndex < allPhotos.length - 1 && (
              <button
                style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', width: 52, height: 52, borderRadius: '50%', fontSize: 32, lineHeight: '50px', color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', textAlign: 'center', zIndex: 1 }}
                onClick={e => { e.stopPropagation(); setActiveIndex(activeIndex + 1); }}
              >›</button>
            )}

            <motion.img
              key={activeIndex}
              src={allPhotos[activeIndex].url}
              alt=""
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
            />
            <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: '0.1em' }}>
              {activeIndex + 1} / {allPhotos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
