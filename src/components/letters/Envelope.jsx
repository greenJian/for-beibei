import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';

const Envelope = ({ sender, date, onClick, onDelete, isFront, stampType, letter }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const flapControls = useAnimation();
    const letterControls = useAnimation();
    const trapRef = useRef(null);

    useEffect(() => {
        const el = trapRef.current;
        if (!el) return;

        const nativeClickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClick(e);
        };

        el.addEventListener('click', nativeClickHandler, { passive: false });
        el.addEventListener('touchend', (e) => {
            nativeClickHandler(e);
        }, { passive: false });

        return () => {
            el.removeEventListener('click', nativeClickHandler);
            el.removeEventListener('touchend', nativeClickHandler);
        };
    }, [isAnimating]);

    const handleClick = async (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (isAnimating) return;

        setIsAnimating(true);

        try {
            const rootEl = trapRef.current?.parentElement?.parentElement?.parentElement;
            if (rootEl) {
                await gsap.to(rootEl, {
                    scale: 1.05,
                    y: -40,
                    rotateX: -5,
                    boxShadow: "0 60px 120px rgba(0,0,0,0.4)",
                    duration: 0.5,
                    ease: "power2.out"
                });
            }

            await flapControls.start({
                rotateX: 180,
                zIndex: 10,
                transition: { duration: 0.7, ease: "easeInOut" }
            });

            await letterControls.start({
                y: -350,
                scale: 1.05,
                opacity: 1,
                zIndex: 50,
                transition: { duration: 1.0, ease: [0.34, 1.56, 0.64, 1] }
            });

            await new Promise(r => setTimeout(r, 300));
            onClick();
        } catch (err) {
            console.error("Animation error:", err);
        } finally {
            setIsAnimating(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (Number.isNaN(dateObj.getTime())) return String(d);
        return dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div
            className="envelope-container"
            style={{
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #fdfaf3 0%, #f7f3e8 100%)',
                boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
                transformStyle: 'preserve-3d',
                perspective: '2000px',
                pointerEvents: 'auto',
                touchAction: 'none'
            }}
        >
            {/* Front of Envelope */}
            <div className="envelope-front">
                <div className="envelope-content">
                    <div className="stamp-area">
                        <div className={`stamp stamp-v${stampType || 1}`}></div>
                        <div className="postmark"></div>
                    </div>
                    <div className="sender-info">
                        <p className="sender-name">{sender}</p>
                        <p className="sender-date">{formatDate(date)}</p>
                    </div>
                    <div className="decorative-lines">
                        <div className="line line-1"></div>
                        <div className="line line-2"></div>
                    </div>
                </div>
            </div>

            {/* Back of Envelope */}
            <div className="envelope-back">
                <div className="envelope-back-body"></div>

                <motion.div
                    className="envelope-flap"
                    initial={{ rotateX: 0, zIndex: 30 }}
                    animate={flapControls}
                    style={{ originY: 0 }}
                >
                    <div className="flap-triangle"></div>
                    <div className="flap-shadow"></div>
                </motion.div>

                <motion.div
                    className="envelope-pop-letter"
                    initial={{ y: 0, opacity: 0 }}
                    animate={letterControls}
                >
                    <div className="tiny-paper"></div>
                </motion.div>
            </div>

            <div
                ref={trapRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    cursor: 'pointer',
                }}
            />

            {/* Delete button on card */}
            {onDelete && (
                <button
                    className="envelope-delete-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete(letter);
                    }}
                    title="删除此信"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default Envelope;
