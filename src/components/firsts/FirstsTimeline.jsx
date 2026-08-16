import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { uploadToSupabase } from '../../lib/supabaseStorage';
import './FirstsTimeline.css';

/* ------------------------------------------------------------------ */
/*  工具函数                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parseInt(parts[0], 10)}.${parseInt(parts[1], 10)}.${parseInt(parts[2], 10)}`;
        }
        return String(dateStr);
    }
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function getEmoji(text) {
    if (!text) return '✨';
    const t = String(text);
    const rules = [
        { kw: ['咖啡', 'coffee', 'cafe'], emoji: '☕' },
        { kw: ['蛋糕', 'cake', '甜点', '甜品'], emoji: '🎂' },
        { kw: ['冰淇淋', '雪糕', 'icecream'], emoji: '🍦' },
        { kw: ['奶茶', '饮料', '喝', 'juice'], emoji: '🥤' },
        { kw: ['电影', '影院', 'movie', 'cinema'], emoji: '🎬' },
        { kw: ['书', '看书', '读书', 'book'], emoji: '📚' },
        { kw: ['音乐', '演唱会', '歌', 'music', 'concert'], emoji: '🎵' },
        { kw: ['游戏', '电玩', 'game'], emoji: '🎮' },
        { kw: ['旅行', '旅游', '出游', 'travel', 'trip'], emoji: '✈️' },
        { kw: ['海', '海边', '沙滩', 'sea', 'beach'], emoji: '🌊' },
        { kw: ['山', '爬山', 'mountain'], emoji: '⛰️' },
        { kw: ['星', '星空', '星星', 'star'], emoji: '⭐' },
        { kw: ['月', '月亮', 'moon'], emoji: '🌙' },
        { kw: ['日出', '日落', '黄昏', 'sunrise', 'sunset'], emoji: '🌅' },
        { kw: ['雨', '下雨', 'rain'], emoji: '🌧️' },
        { kw: ['雪', '下雪', 'snow'], emoji: '❄️' },
        { kw: ['花', ' bouquet', 'flower'], emoji: '💐' },
        { kw: ['礼物', 'gift', 'present'], emoji: '🎁' },
        { kw: ['吻', '亲', 'kiss'], emoji: '💋' },
        { kw: ['拥抱', '抱', 'hug'], emoji: '🤗' },
        { kw: ['见面', '相见', '相遇', 'meet'], emoji: '👋' },
        { kw: ['拍照', '照片', 'photo', 'picture'], emoji: '📷' },
        { kw: ['车', '开车', '自驾', 'car'], emoji: '🚗' },
        { kw: ['飞机', '登机', 'plane'], emoji: '🛫' },
        { kw: ['火车', '高铁', 'train'], emoji: '🚄' },
        { kw: ['饭', '餐', '吃', 'eat', 'dinner', 'lunch'], emoji: '🍴' },
        { kw: ['火锅', 'hotpot'], emoji: '🍲' },
        { kw: ['烧烤', '烤肉', 'bbq'], emoji: '🍢' },
        { kw: ['寿司', 'sushi', '日料'], emoji: '🍣' },
        { kw: ['猫', 'cat'], emoji: '🐱' },
        { kw: ['狗', 'dog'], emoji: '🐶' },
        { kw: ['信', 'letter'], emoji: '✉️' },
        { kw: ['梦', 'dream'], emoji: '💭' },
        { kw: ['生日', 'birthday'], emoji: '🎉' },
        { kw: ['节日', '圣诞', '新年', 'festival'], emoji: '🎊' },
        { kw: ['第一次', '首次', 'first'], emoji: '✨' },
    ];
    for (const r of rules) {
        if (r.kw.some(k => t.toLowerCase().includes(k.toLowerCase()))) return r.emoji;
    }
    return '✨';
}

/* ------------------------------------------------------------------ */
/*  主组件                                                              */
/* ------------------------------------------------------------------ */

export default function FirstsTimeline() {
    const [entered, setEntered] = useState(false);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ date: '', description: '', photos: [], photoPreviews: [] });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const fileInputRef = useRef(null);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        setError('');
        const { data, error } = await supabase
            .from('firsts')
            .select('id, date, description, photo_urls, created_at')
            .order('date', { ascending: true });
        if (error) {
            setError(error.message || '加载失败');
        } else {
            setRecords(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (entered) loadRecords();
    }, [entered, loadRecords]);

    // 处理多张照片选择
    const handlePhotoSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const previews = files.map(f => URL.createObjectURL(f));
        setForm(f => ({
            ...f,
            photos: [...f.photos, ...files],
            photoPreviews: [...f.photoPreviews, ...previews],
        }));
    };

    // 提交新记录
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.date || !form.description.trim()) {
            setError('请填写日期和描述');
            return;
        }
        setSubmitting(true);
        setError('');

        let photoUrls = [];
        // 有照片就先逐一上传
        if (form.photos.length > 0) {
            try {
                const results = await Promise.all(
                    form.photos.map(file => uploadToSupabase(file, 'firsts-images'))
                );
                photoUrls = results.map(r => r.publicUrl);
            } catch (err) {
                setSubmitting(false);
                setError('照片上传失败: ' + (err.message || '未知错误'));
                return;
            }
        }

        const payload = {
            date: form.date,
            description: form.description.trim(),
        };
        if (photoUrls.length > 0) payload.photo_urls = photoUrls;

        const { data, error } = await supabase
            .from('firsts')
            .insert([payload])
            .select('id, date, description, photo_urls, created_at');

        setSubmitting(false);
        if (error) {
            setError(error.message || '保存失败');
            return;
        }
        if (data && data.length) {
            setRecords(prev => [...data, ...prev]);
        }
        setForm({ date: '', description: '', photos: [], photoPreviews: [] });
        setShowModal(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('确定删除这条记录吗？')) return;
        setDeletingId(id);
        const { error } = await supabase.from('firsts').delete().eq('id', id);
        setDeletingId(null);
        if (error) {
            setError(error.message || '删除失败');
            return;
        }
        setRecords(prev => prev.filter(r => r.id !== id));
        if (selectedRecord?.id === id) setSelectedRecord(null);
    };

    const grouped = React.useMemo(() => {
        const map = new Map();
        for (const r of records) {
            const key = r.date ? String(r.date).split('T')[0] : '未知日期';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(r);
        }
        return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    }, [records]);

    const totalCount = records.length;

    /* ---------------- 入场屏 ---------------- */
    if (!entered) {
        return (
            <div style={styles.screen}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    style={styles.screenInner}
                >
                    <motion.h1
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        style={styles.screenTitle}
                    >
                        FIRSTS
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        style={styles.screenSubtitle}
                    >
                        那些「第一次」的瞬间
                    </motion.p>
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setEntered(true)}
                        style={styles.enterBtn}
                    >
                        纵览时光
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    /* ---------------- 主视图 ---------------- */
    return (
        <div style={styles.wrap}>
            {/* 顶部信息 */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={styles.header}
            >
                <div style={styles.headerLeft}>
                    <div style={styles.headerTitle}>FIRSTS</div>
                    <div style={styles.headerSub}>
                        共记录 <span style={styles.countNum}>{totalCount}</span> 个第一次
                    </div>
                </div>
            </motion.header>

            {/* 时间线主体 */}
            <div style={styles.body}>
                {loading ? (
                    <div style={styles.empty}>加载中…</div>
                ) : error && records.length === 0 ? (
                    <div style={styles.empty}>
                        <div style={{ marginBottom: 10 }}>{error}</div>
                        <button onClick={loadRecords} style={styles.retryBtn}>重试</button>
                    </div>
                ) : grouped.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={styles.empty}
                    >
                        <div style={{ fontSize: 48, marginBottom: 14 }}>🌱</div>
                        <div>还没有记录，点击右下角 + 添加第一个「第一次」</div>
                    </motion.div>
                ) : (
                    <div style={styles.timeline}>
                        <div style={styles.timelineLine} />
                        <AnimatePresence initial={false}>
                            {grouped.map(([dateKey, items], gi) => (
                                <motion.div
                                    key={dateKey}
                                    initial={{ opacity: 0, x: -24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 24 }}
                                    transition={{ delay: gi * 0.05, duration: 0.5 }}
                                    style={styles.dateGroup}
                                >
                                    <div style={styles.dateNode}>
                                        <div style={styles.dateDot} />
                                        <div style={styles.dateLabel}>{formatDate(dateKey)}</div>
                                    </div>

                                    <div style={styles.recordsCol}>
                                        {items.map((r, i) => (
                                            <div
                                                key={r.id ?? `${dateKey}-${i}`}
                                                style={{ position: 'relative' }}
                                            >
                                                <motion.div
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: gi * 0.05 + i * 0.04 }}
                                                    whileHover={{ scale: 1.01 }}
                                                    style={{
                                                        ...styles.recordCard,
                                                        cursor: r.photo_urls?.length > 0 ? 'pointer' : 'default',
                                                    }}
                                                    onClick={() => {
                                                        if (r.photo_urls?.length > 0) setSelectedRecord(r);
                                                    }}
                                                >
                                                    <div style={styles.recordEmoji}>{getEmoji(r.description)}</div>
                                                    <div style={styles.recordText}>
                                                        {r.description}
                                                        {r.photo_urls?.length > 0 && (
                                                            <span style={styles.photoIndicator}> 📷</span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                                                    disabled={deletingId === r.id}
                                                    style={{
                                                        ...styles.deleteBtn,
                                                        opacity: deletingId === r.id ? 0.4 : undefined,
                                                    }}
                                                    title="删除"
                                                >
                                                    {deletingId === r.id ? '…' : '✕'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* 浮动 + 按钮 */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowModal(true)}
                style={styles.fab}
                aria-label="新增记录"
            >
                ＋
            </motion.button>

            {/* 新增弹窗 */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.modalMask}
                        className="firsts-modal-mask"
                        onClick={() => !submitting && setShowModal(false)}
                    >
                        <motion.form
                            initial={{ y: 30, opacity: 0, scale: 0.96 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                            style={styles.modalCard}
                            className="firsts-modal-card"
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={handleSubmit}
                        >
                            <div style={styles.modalTitle}>新增一个「第一次」</div>

                            <label style={styles.fieldLabel}>日期</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                                style={styles.input}
                                required
                            />

                            <label style={styles.fieldLabel}>描述</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="例如：第一次一起看电影 🎬"
                                style={styles.textarea}
                                rows={4}
                                required
                            />

                            <label style={styles.fieldLabel}>照片（可选，支持多选）</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoSelect}
                                style={{ display: 'none' }}
                            />
                            {form.photoPreviews.length > 0 ? (
                                <div style={styles.photoPreviewsWrap}>
                                    {form.photoPreviews.map((src, idx) => (
                                        <div key={idx} style={{ position: 'relative' }}>
                                            <img src={src} alt={`预览${idx + 1}`} style={styles.photoPreview} />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForm(f => ({
                                                        ...f,
                                                        photos: f.photos.filter((_, i) => i !== idx),
                                                        photoPreviews: f.photoPreviews.filter((_, i) => i !== idx),
                                                    }));
                                                }}
                                                style={styles.removePhotoBtn}
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={styles.photoUploadBtn}
                            >＋ 选择照片{form.photoPreviews.length > 0 ? `（已选 ${form.photoPreviews.length} 张）` : ''}</button>

                            {error && <div style={styles.formError}>{error}</div>}

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setForm({ date: '', description: '', photos: [], photoPreviews: [] });
                                    }}
                                    style={styles.cancelBtn}
                                    disabled={submitting}
                                >
                                    取消
                                </button>
                                <motion.button
                                    type="submit"
                                    whileTap={{ scale: 0.95 }}
                                    style={styles.submitBtn}
                                    disabled={submitting}
                                >
                                    {submitting ? '保存中…' : '保存'}
                                </motion.button>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 照片详情弹窗 */}
            <AnimatePresence>
                {selectedRecord && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.detailMask}
                        onClick={() => setSelectedRecord(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                            style={styles.detailCard}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedRecord(null)}
                                style={styles.detailClose}
                            >
                                ✕
                            </button>

                            <div style={styles.detailEmoji}>{getEmoji(selectedRecord.description)}</div>
                            <div style={styles.detailDate}>{formatDate(selectedRecord.date)}</div>
                            <div style={styles.detailDesc}>{selectedRecord.description}</div>

                            {selectedRecord.photo_urls?.length > 0 && selectedRecord.photo_urls.map((url, idx) => (
                                <img
                                    key={idx}
                                    src={url}
                                    alt={`${selectedRecord.description} ${idx + 1}`}
                                    style={styles.detailPhoto}
                                />
                            ))}

                            <button
                                type="button"
                                onClick={() => { setSelectedRecord(null); handleDelete(selectedRecord.id); }}
                                style={styles.detailDeleteBtn}
                            >
                                删除这条记录
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  内联样式                                                            */
/* ------------------------------------------------------------------ */

const styles = {
    screen: {
        width: '100%', height: '100%', minHeight: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at 30% 20%, #1a1030 0%, #0a0f1a 55%, #05070f 100%)',
        color: '#fff', position: 'relative', overflow: 'hidden',
    },
    screenInner: { textAlign: 'center', padding: 40, zIndex: 2 },
    screenTitle: {
        margin: 0, fontSize: 'clamp(56px, 12vw, 132px)', fontWeight: 900,
        letterSpacing: '0.12em',
        background: 'linear-gradient(135deg, #ffffff 0%, #f6becc 50%, #ffd6e0 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        textShadow: '0 0 40px rgba(246,190,200,0.25)',
        fontFamily: "'Orbitron', 'PingFang SC', sans-serif",
    },
    screenSubtitle: {
        margin: '18px 0 0', fontSize: 'clamp(14px, 2vw, 20px)',
        color: 'rgba(255,255,255,0.7)', letterSpacing: '0.18em',
    },
    enterBtn: {
        marginTop: 40, padding: '14px 44px', fontSize: 16, fontWeight: 600,
        letterSpacing: '0.2em', color: '#fff',
        background: 'linear-gradient(135deg, rgba(246,190,200,0.25), rgba(255,255,255,0.08))',
        border: '1px solid rgba(246,190,200,0.5)', borderRadius: 999, cursor: 'pointer',
        backdropFilter: 'blur(8px)', boxShadow: '0 0 24px rgba(246,190,200,0.25)',
    },

    wrap: {
        width: '100%', height: '100%', minHeight: '100%',
        background: 'radial-gradient(circle at 25% 10%, #150d28 0%, #0a0f1a 60%, #05070f 100%)',
        color: '#fff', position: 'relative', overflow: 'auto',
        fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif",
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 36px', position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(180deg, rgba(10,15,26,0.95), rgba(10,15,26,0.6) 70%, transparent)',
        backdropFilter: 'blur(8px)',
    },
    headerLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
    headerTitle: {
        fontSize: 26, fontWeight: 800, letterSpacing: '0.18em',
        background: 'linear-gradient(135deg, #fff, #f6becc)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        fontFamily: "'Orbitron', sans-serif",
    },
    headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
    countNum: { color: '#f6becc', fontWeight: 700, fontSize: 16 },

    body: { padding: '10px 36px 120px', maxWidth: 860, margin: '0 auto' },
    empty: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '80px 20px', fontSize: 15 },
    retryBtn: {
        marginTop: 10, padding: '8px 20px', color: '#fff',
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 20, cursor: 'pointer',
    },

    timeline: { position: 'relative', paddingLeft: 8 },
    timelineLine: {
        position: 'absolute', left: 12, top: 6, bottom: 6, width: 2,
        background: 'linear-gradient(180deg, rgba(246,190,200,0.6), rgba(255,255,255,0.15))',
    },
    dateGroup: { position: 'relative', display: 'flex', gap: 22, marginBottom: 28 },
    dateNode: {
        position: 'relative', width: 24, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6,
    },
    dateDot: {
        width: 12, height: 12, borderRadius: '50%', background: '#f6becc',
        boxShadow: '0 0 12px rgba(246,190,200,0.8)', border: '2px solid rgba(255,255,255,0.6)',
    },
    dateLabel: {
        marginTop: 10, fontSize: 13, fontWeight: 600, color: '#f6becc',
        writingMode: 'vertical-rl', letterSpacing: '0.1em', whiteSpace: 'nowrap',
    },
    recordsCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 4 },
    recordCard: {
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, backdropFilter: 'blur(6px)',
    },
    recordEmoji: {
        fontSize: 26, lineHeight: 1, flexShrink: 0,
        filter: 'drop-shadow(0 0 6px rgba(246,190,200,0.35))',
    },
    recordText: {
        fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.92)',
        wordBreak: 'break-word', flex: 1,
    },
    photoIndicator: { opacity: 0.5, fontSize: 14 },
    deleteBtn: {
        position: 'absolute', right: 10, top: 12, width: 24, height: 24,
        borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },

    fab: {
        position: 'fixed', right: 32, bottom: 80, width: 60, height: 60,
        borderRadius: '50%', fontSize: 30, fontWeight: 300, color: '#fff',
        background: 'linear-gradient(135deg, #f6becc, #e89aa9)', border: 'none',
        cursor: 'pointer', zIndex: 50, boxShadow: '0 8px 28px rgba(246,190,200,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },

    // 新增弹窗
    modalMask: {
        position: 'fixed', inset: 0, background: 'rgba(5,7,15,0.72)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100, padding: 20,
    },
    modalCard: {
        width: '100%', maxWidth: 460, padding: 28,
        background: 'linear-gradient(160deg, #14101f, #0c1018)',
        border: '1px solid rgba(246,190,200,0.28)', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'auto', WebkitOverflowScrolling: 'touch',
    },
    modalTitle: {
        fontSize: 18, fontWeight: 700, marginBottom: 18,
        color: '#fff', letterSpacing: '0.05em',
    },
    fieldLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6, marginTop: 12 },
    input: {
        width: '100%', padding: '10px 12px', fontSize: 15, color: '#fff',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark',
    },
    textarea: {
        width: '100%', padding: '10px 12px', fontSize: 15, color: '#fff',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        fontFamily: 'inherit', lineHeight: 1.6,
    },
    photoUploadBtn: {
        marginTop: 8, padding: '10px 16px', fontSize: 14, color: 'rgba(255,255,255,0.7)',
        background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)',
        borderRadius: 10, cursor: 'pointer', width: '100%',
    },
    photoPreviewsWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    photoPreview: {
        width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.1)',
    },
    removePhotoBtn: {
        position: 'absolute', top: 8, right: 8, width: 24, height: 24,
        borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)',
        color: '#fff', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    formError: { marginTop: 12, fontSize: 13, color: '#ff8a9b' },
    modalActions: { marginTop: 22, display: 'flex', gap: 12, justifyContent: 'flex-end' },
    cancelBtn: {
        padding: '10px 22px', fontSize: 14, color: 'rgba(255,255,255,0.75)',
        background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 999, cursor: 'pointer',
    },
    submitBtn: {
        padding: '10px 26px', fontSize: 14, fontWeight: 600, color: '#fff',
        background: 'linear-gradient(135deg, #f6becc, #e89aa9)', border: 'none',
        borderRadius: 999, cursor: 'pointer', boxShadow: '0 4px 16px rgba(246,190,200,0.4)',
    },

    // 照片详情弹窗
    detailMask: {
        position: 'fixed', inset: 0, background: 'rgba(5,7,15,0.85)',
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 200, padding: 20,
    },
    detailCard: {
        width: '100%', maxWidth: 'min(560px, 92vw)', maxHeight: '90vh', overflow: 'auto',
        padding: 32, background: 'linear-gradient(160deg, #1a1428, #0c1018)',
        border: '1px solid rgba(246,190,200,0.25)', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)', position: 'relative',
        textAlign: 'center',
    },
    detailClose: {
        position: 'absolute', top: 16, right: 16, width: 32, height: 32,
        borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.8)',
        fontSize: 14, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
    },
    detailEmoji: { fontSize: 48, marginBottom: 10 },
    detailDate: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
    detailDesc: {
        fontSize: 17, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7,
        marginBottom: 20, wordBreak: 'break-word',
    },
    detailPhoto: {
        width: '100%', maxHeight: 500, objectFit: 'contain',
        borderRadius: 12, marginBottom: 16,
    },
    detailDeleteBtn: {
        marginTop: 16, padding: '8px 20px', fontSize: 13,
        color: 'rgba(255,100,100,0.7)', background: 'transparent',
        border: '1px solid rgba(255,100,100,0.3)', borderRadius: 999,
        cursor: 'pointer',
    },
};
