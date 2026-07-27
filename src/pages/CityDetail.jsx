import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

export default function CityDetail({ cityName, goBack }) {
    const [city, setCity] = useState(null);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeIndex, setActiveIndex] = useState(null); // 全屏图片索引

    const loadData = useCallback(async () => {
        if (!cityName) return;
        setLoading(true);
        setError('');

        // 1. 取城市信息
        const { data: cityData, error: cityErr } = await supabase
            .from('cities')
            .select('*')
            .eq('name', cityName)
            .single();

        // 2. 取城市图片：优先用 city_id，失败则用 city_name
        let imagesData = null;
        let imagesErr = null;
        if (cityData && cityData.id) {
            const res = await supabase
                .from('city_images')
                .select('id, image_url, caption, sort_order, city_id, city_name')
                .eq('city_id', cityData.id)
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('id', { ascending: true });
            imagesData = res.data;
            imagesErr = res.error;
        }
        // 兜底：用 city_name 文本字段
        if ((!imagesData || imagesData.length === 0) && !imagesErr) {
            const res = await supabase
                .from('city_images')
                .select('id, image_url, caption, sort_order, city_id, city_name')
                .eq('city_name', cityName)
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('id', { ascending: true });
            imagesData = res.data;
            imagesErr = res.error;
        }

        if (cityErr && !cityData) {
            setError(cityErr.message || '加载城市信息失败');
            setCity(null);
        } else {
            setCity(cityData || { name: cityName });
        }
        if (imagesErr && !imagesData) {
            setImages([]);
        } else {
            setImages(imagesData || []);
        }
        setLoading(false);
    }, [cityName]);

    useEffect(() => { loadData(); }, [loadData]);

    // 键盘 ESC 关闭全屏图
    useEffect(() => {
        if (activeIndex === null) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setActiveIndex(null);
            if (e.key === 'ArrowRight') setActiveIndex(i => (i === null ? null : Math.min(i + 1, images.length - 1)));
            if (e.key === 'ArrowLeft') setActiveIndex(i => (i === null ? null : Math.max(i - 1, 0)));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeIndex, images.length]);

    const heroImage = images.length > 0 ? images[0].image_url : (city && city.cover_url) || '';

    return (
        <div className="city-detail-root" style={styles.root}>
            <style>{`
                .city-detail-root { animation: cd-fade 0.5s ease both; }
                @keyframes cd-fade { from { opacity: 0; } to { opacity: 1; } }
                .cd-hero-img { transition: transform 8s ease-out; transform: scale(1.05); }
                .cd-hero-img.loaded { transform: scale(1); }
                .cd-grid-item { transition: transform 0.4s cubic-bezier(.2,.7,.2,1), box-shadow 0.4s ease; }
                .cd-grid-item:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 18px 40px rgba(0,0,0,0.5); }
                .cd-grid-item:hover .cd-grid-overlay { opacity: 1; }
                .cd-grid-overlay { opacity: 0; transition: opacity 0.3s ease; }
                .cd-scroll::-webkit-scrollbar { width: 8px; }
                .cd-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
                .cd-scroll::-webkit-scrollbar-thumb { background: rgba(246,190,200,0.3); border-radius: 4px; }
            `}</style>

            {/* 返回按钮 */}
            <motion.button
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                onClick={goBack}
                style={styles.backBtn}
            >
                ← 返回
            </motion.button>

            {loading ? (
                <div style={styles.center}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={styles.spinner}
                    />
                    <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)' }}>加载中…</div>
                </div>
            ) : error ? (
                <div style={styles.center}>
                    <div style={{ color: '#ff8a9b', marginBottom: 12 }}>{error}</div>
                    <button onClick={loadData} style={styles.retryBtn}>重试</button>
                </div>
            ) : (
                <div className="cd-scroll" style={styles.scrollWrap}>
                    {/* Hero 区 */}
                    <div style={styles.hero}>
                        {heroImage ? (
                            <img
                                src={heroImage}
                                alt={cityName}
                                className="cd-hero-img loaded"
                                style={styles.heroImg}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        ) : (
                            <div style={styles.heroPlaceholder} />
                        )}
                        <div style={styles.heroOverlay} />
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            style={styles.heroText}
                        >
                            <div style={styles.heroKicker}>CITY · 城市</div>
                            <h1 style={styles.heroTitle}>{cityName}</h1>
                            {city && city.description && (
                                <p style={styles.heroDesc}>{city.description}</p>
                            )}
                            <div style={styles.heroMeta}>
                                {city && city.lng && city.lat ? `${Number(city.lng).toFixed(2)}, ${Number(city.lat).toFixed(2)}` : ''}
                                {city && city.color ? (
                                    <span style={{ ...styles.colorDot, background: city.color }} />
                                ) : null}
                            </div>
                        </motion.div>
                    </div>

                    {/* 图库网格 */}
                    <div style={styles.galleryWrap}>
                        <div style={styles.galleryHeader}>
                            <div style={styles.galleryTitle}>影像志</div>
                            <div style={styles.galleryCount}>{images.length} 张照片</div>
                        </div>

                        {images.length === 0 ? (
                            <div style={styles.galleryEmpty}>
                                <div style={{ fontSize: 44, marginBottom: 12 }}>📷</div>
                                <div>暂无照片</div>
                            </div>
                        ) : (
                            <div style={styles.grid}>
                                {images.map((img, i) => (
                                    <motion.div
                                        key={img.id ?? i}
                                        className="cd-grid-item"
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.1 }}
                                        transition={{ delay: (i % 4) * 0.05, duration: 0.5 }}
                                        onClick={() => setActiveIndex(i)}
                                        style={styles.gridItem}
                                    >
                                        <img
                                            src={img.image_url}
                                            alt={img.caption || `${cityName} ${i + 1}`}
                                            style={styles.gridImg}
                                            loading="lazy"
                                            onError={(e) => { e.target.style.opacity = 0.2; }}
                                        />
                                        {img.caption && (
                                            <div className="cd-grid-overlay" style={styles.gridOverlay}>
                                                <div style={styles.gridCaption}>{img.caption}</div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 全屏图片查看器 */}
            <AnimatePresence>
                {activeIndex !== null && images[activeIndex] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.viewerMask}
                        onClick={() => setActiveIndex(null)}
                    >
                        <button style={styles.viewerClose} onClick={(e) => { e.stopPropagation(); setActiveIndex(null); }}>✕</button>

                        {activeIndex > 0 && (
                            <button
                                style={{ ...styles.viewerNav, left: 20 }}
                                onClick={(e) => { e.stopPropagation(); setActiveIndex(activeIndex - 1); }}
                            >‹</button>
                        )}
                        {activeIndex < images.length - 1 && (
                            <button
                                style={{ ...styles.viewerNav, right: 20 }}
                                onClick={(e) => { e.stopPropagation(); setActiveIndex(activeIndex + 1); }}
                            >›</button>
                        )}

                        <motion.img
                            key={activeIndex}
                            src={images[activeIndex].image_url}
                            alt={images[activeIndex].caption || cityName}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                            onClick={(e) => e.stopPropagation()}
                            style={styles.viewerImg}
                        />
                        {images[activeIndex].caption && (
                            <div style={styles.viewerCaption}>{images[activeIndex].caption}</div>
                        )}
                        <div style={styles.viewerCounter}>
                            {activeIndex + 1} / {images.length}
                        </div>
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
    root: {
        width: '100%',
        height: '100%',
        minHeight: '100%',
        background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif",
    },
    center: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinner: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.15)',
        borderTopColor: '#f6becc',
    },
    retryBtn: {
        padding: '8px 22px',
        color: '#fff',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 20,
        cursor: 'pointer',
    },

    backBtn: {
        position: 'fixed',
        top: 24,
        left: 24,
        zIndex: 30,
        padding: '9px 20px',
        fontSize: 14,
        color: '#fff',
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 999,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
    },

    scrollWrap: {
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
    },

    /* Hero */
    hero: {
        position: 'relative',
        width: '100%',
        height: 'max(62vh, 320px)',
        minHeight: 320,
        overflow: 'hidden',
    },
    heroImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a2040, #0a0f1a)',
    },
    heroOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10,15,26,0.15) 0%, rgba(10,15,26,0.35) 50%, rgba(10,15,26,0.9) 100%)',
    },
    heroText: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 48,
        padding: '0 48px',
        textAlign: 'left',
    },
    heroKicker: {
        fontSize: 13,
        letterSpacing: '0.3em',
        color: '#f6becc',
        marginBottom: 10,
        fontWeight: 600,
    },
    heroTitle: {
        margin: 0,
        fontSize: 'clamp(40px, 8vw, 88px)',
        fontWeight: 800,
        letterSpacing: '0.04em',
        textShadow: '0 4px 24px rgba(0,0,0,0.6)',
        fontFamily: "'Orbitron', 'PingFang SC', sans-serif",
    },
    heroDesc: {
        margin: '14px 0 0',
        maxWidth: 620,
        fontSize: 15,
        lineHeight: 1.8,
        color: 'rgba(255,255,255,0.82)',
    },
    heroMeta: {
        marginTop: 14,
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    colorDot: {
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        boxShadow: '0 0 8px currentColor',
    },

    /* 图库 */
    galleryWrap: {
        padding: '48px 48px 80px',
        maxWidth: 1200,
        margin: '0 auto',
    },
    galleryHeader: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 28,
    },
    galleryTitle: {
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#fff',
    },
    galleryCount: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
    },
    galleryEmpty: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        padding: '80px 20px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
    },
    gridItem: {
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    },
    gridImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    gridOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.75) 100%)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 14,
    },
    gridCaption: {
        color: '#fff',
        fontSize: 13,
        lineHeight: 1.5,
    },

    /* 全屏查看器 */
    viewerMask: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,7,15,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
    },
    viewerClose: {
        position: 'absolute',
        top: 24,
        right: 28,
        width: 42,
        height: 42,
        borderRadius: '50%',
        fontSize: 20,
        color: '#fff',
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer',
    },
    viewerNav: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 52,
        height: 52,
        borderRadius: '50%',
        fontSize: 32,
        lineHeight: '50px',
        color: '#fff',
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer',
        textAlign: 'center',
    },
    viewerImg: {
        maxWidth: '90vw',
        maxHeight: '80vh',
        objectFit: 'contain',
        borderRadius: 8,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    },
    viewerCaption: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.85)',
        fontSize: 15,
        padding: '0 40px',
    },
    viewerCounter: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        letterSpacing: '0.1em',
    },
};
