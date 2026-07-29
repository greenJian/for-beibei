import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = [
  { key: '全部', label: '全部', emoji: '💝' },
  { key: '饮食', label: '饮食', emoji: '🍰' },
  { key: '习惯', label: '习惯', emoji: '🌙' },
  { key: '喜好', label: '喜好', emoji: '✨' },
  { key: '小秘密', label: '小秘密', emoji: '💌' },
  { key: '其他', label: '其他', emoji: '🌸' },
];

export default function KeywordsParticle() {
  const { user } = useAuth();
  const isMale = user?.gender === 'male';
  const [habits, setHabits] = useState([]);
  const [activeCat, setActiveCat] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formCat, setFormCat] = useState('其他');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadHabits = useCallback(async () => {
    try {
      const { data } = await supabase.from('beibei_habits').select('*').order('created_at', { ascending: false });
      if (data) setHabits(data);
    } catch (err) {
      console.warn('Failed to load habits:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  const filtered = activeCat === '全部' ? habits : habits.filter(h => h.category === activeCat);

  // Group by category order
  const grouped = {};
  const catOrder = CATEGORIES.filter(c => c.key !== '全部');
  catOrder.forEach(cat => { grouped[cat.key] = []; });
  filtered.forEach(h => {
    if (grouped[h.category]) grouped[h.category].push(h);
  });

  const orderedCats = activeCat === '全部'
    ? catOrder.filter(c => grouped[c.key].length > 0)
    : catOrder.filter(c => c.key === activeCat && grouped[c.key].length > 0);

  const openAdd = (category) => {
    setEditingId(null);
    setFormCat(category || '其他');
    setFormTitle('');
    setFormContent('');
    setShowModal(true);
  };

  const openEdit = (h) => {
    setEditingId(h.id);
    setFormCat(h.category);
    setFormTitle(h.title);
    setFormContent(h.content || '');
    setShowModal(true);
  };

  const saveHabit = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('beibei_habits').update({
          category: formCat, title: formTitle.trim(), content: formContent, updated_at: new Date().toISOString(),
        }).eq('id', editingId);
        setToast('已保存');
      } else {
        await supabase.from('beibei_habits').insert({
          category: formCat, title: formTitle.trim(), content: formContent,
        });
        setToast('已添加');
      }
      setShowModal(false);
      loadHabits();
    } catch (err) {
      setToast('保存失败');
    }
    setSaving(false);
    setTimeout(() => setToast(''), 2500);
  };

  const deleteHabit = async (id) => {
    try {
      await supabase.from('beibei_habits').delete().eq('id', id);
      setToast('已删除');
      loadHabits();
    } catch (err) {
      setToast('删除失败');
    }
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)',
      color: '#fff', position: 'relative',
      fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif",
      paddingBottom: 100,
    }}>
      {/* Background particles (non-interactive) */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ y: [-20, -120], opacity: [0, 0.6, 0], x: [0, Math.sin(i) * 40] }}
            transition={{ duration: 4 + Math.random() * 6, repeat: Infinity, delay: Math.random() * 5, ease: 'easeInOut' }}
            style={{
              position: 'absolute', left: `${10 + Math.random() * 80}%`, bottom: -20,
              width: 3 + Math.random() * 4, height: 3 + Math.random() * 4, borderRadius: '50%',
              background: `hsla(${345 + Math.random() * 20}, 90%, ${70 + Math.random() * 20}%, 0.6)`,
              boxShadow: `0 0 ${4 + Math.random() * 6}px hsla(${345 + Math.random() * 20}, 90%, 75%, 0.4)`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div style={{ padding: '24px 40px 0', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.3em', color: '#FFB84D', marginBottom: 6, fontWeight: 600 }}>
            {isMale ? 'ABOUT HER · 知你' : 'ABOUT HIM · 知你'}
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '0.03em' }}>
            {isMale ? '关于她的' : '关于他的'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            {isMale ? '记录她的一切 —— 喜好、习惯、小秘密...' : '记录他的一切 —— 喜好、习惯、小秘密...'}
          </p>
        </motion.div>

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCat(cat.key)}
              style={{
                padding: '7px 16px', borderRadius: 18, fontSize: 13, fontWeight: 500,
                border: activeCat === cat.key
                  ? '1.5px solid rgba(255,184,77,0.5)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: activeCat === cat.key
                  ? 'rgba(255,184,77,0.15)'
                  : 'rgba(255,255,255,0.04)',
                color: activeCat === cat.key ? '#FFB84D' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer', transition: 'all 0.25s',
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 40px 0', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '80px 0', color: 'rgba(255,255,255,0.25)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💭</div>
            <div style={{ fontSize: 14 }}>加载中...</div>
          </div>
        ) : orderedCats.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '80px 0', color: 'rgba(255,255,255,0.25)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💭</div>
            <div style={{ fontSize: 14 }}>还没有记录，点击右下角 + 开始添加</div>
          </div>
        ) : (
          orderedCats.map(cat => (
            <div key={cat.key} style={{ marginBottom: 32 }}>
              {/* Category header row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingBottom: 10, marginBottom: 4,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em' }}>
                  {cat.label}
                </span>
                <span style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10,
                }}>
                  {grouped[cat.key]?.length || 0}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => openAdd(cat.key)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
              </div>

              {/* Items */}
              {grouped[cat.key].map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', marginBottom: 2,
                    borderRadius: 8, cursor: 'pointer',
                  }}
                  onClick={() => openEdit(h)}
                >
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#FFB84D', marginTop: 5, flexShrink: 0,
                    opacity: 0.5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.5, wordBreak: 'break-word',
                    }}>
                      {h.title}
                    </div>
                    {h.content && (
                      <div style={{
                        fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6,
                        marginTop: 3, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      }}>
                        {h.content}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 4 }}>
                      {new Date(h.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); deleteHabit(h.id); }}
                    style={{
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
                      cursor: 'pointer', fontSize: 14, padding: '4px 8px', borderRadius: 6,
                      flexShrink: 0, marginTop: 0,
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Floating + button */}
      <button
        type="button"
        onClick={() => openAdd(activeCat !== '全部' ? activeCat : '其他')}
        style={{
          position: 'fixed', bottom: 80, right: 32, zIndex: 50,
          width: 50, height: 50, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFB84D 0%, #FF8FAB 100%)',
          border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(255,184,77,0.4)',
        }}
      >+</button>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: 'min(400px, 92vw)', maxHeight: '80vh', overflow: 'auto',
              background: 'linear-gradient(180deg, rgba(15,22,40,0.98) 0%, rgba(10,15,26,0.98) 100%)',
              borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
              padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ margin: 0, color: '#FFB84D', fontSize: 18, fontWeight: 700 }}>
                {editingId ? '编辑' : '新增'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.4)',
                  fontSize: 14, cursor: 'pointer', width: 28, height: 28, borderRadius: '50%',
                }}
              >✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 7, fontWeight: 500 }}>分类</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {CATEGORIES.filter(c => c.key !== '全部').map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setFormCat(cat.key)}
                    style={{
                      padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: formCat === cat.key ? '1.5px solid rgba(255,184,77,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      background: formCat === cat.key ? 'rgba(255,184,77,0.15)' : 'rgba(255,255,255,0.04)',
                      color: formCat === cat.key ? '#FFB84D' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                    }}
                  >{cat.emoji} {cat.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 7, fontWeight: 500 }}>标题</div>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                placeholder="例如：最喜欢的奶茶口味"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 7, fontWeight: 500 }}>详情</div>
              <textarea value={formContent} onChange={e => setFormContent(e.target.value)}
                placeholder="记录更多细节..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none',
                  resize: 'vertical', minHeight: 80,
                }}
              />
            </div>

            <button
              type="button"
              onClick={saveHabit}
              disabled={saving || !formTitle.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: saving || !formTitle.trim() ? 'default' : 'pointer',
                background: saving || !formTitle.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #FFB84D 0%, #FF8FAB 100%)',
                opacity: saving || !formTitle.trim() ? 0.5 : 1,
              }}
            >{saving ? '保存中...' : (editingId ? '保存修改' : '添加')}</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          padding: '10px 24px', borderRadius: 24,
          background: 'rgba(255,184,77,0.12)', border: '1px solid rgba(255,184,77,0.25)',
          color: '#FFB84D', fontSize: 13, fontWeight: 500,
          backdropFilter: 'blur(8px)',
        }}>{toast}</div>
      )}
    </div>
  );
}
