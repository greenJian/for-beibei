import React from 'react';
import { motion } from 'framer-motion';

// 生成年份列表：从最早年份到当前年份
const getYearRange = (letters) => {
    const currentYear = new Date().getFullYear();
    const years = new Set();
    letters.forEach(l => {
        try {
            const d = new Date(l.date);
            if (!isNaN(d.getTime())) years.add(d.getFullYear());
        } catch { }
    });
    // 确保至少包含当前年份
    if (years.size === 0) years.add(currentYear);
    const sorted = [...years].sort((a, b) => b - a);
    return sorted;
};

// 邮筒 SVG 组件
const Mailbox = ({ year, count, onClick, index }) => {
    const colors = [
        { body: '#e57373', top: '#c62828', dark: '#b71c1c' },
        { body: '#ef9a9a', top: '#d32f2f', dark: '#b71c1c' },
        { body: '#e53935', top: '#b71c1c', dark: '#7f0000' },
        { body: '#ff8a80', top: '#c62828', dark: '#8e0000' },
        { body: '#ef5350', top: '#b71c1c', dark: '#7f0000' },
    ];
    const c = colors[index % colors.length];

    return (
        <motion.div
            className="mailbox-item"
            initial={{ opacity: 0, y: 80, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                delay: 0.15 * index,
                duration: 0.7,
                ease: [0.34, 1.56, 0.64, 1]
            }}
            whileHover={{ scale: 1.05, y: -8 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onClick(year)}
            style={{ cursor: 'pointer' }}
        >
            <svg
                width="160"
                height="220"
                viewBox="0 0 160 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* 底座 */}
                <rect x="25" y="180" width="110" height="20" rx="3" fill={c.dark} />
                <rect x="35" y="170" width="90" height="15" rx="2" fill={c.body} />

                {/* 支柱 */}
                <rect x="60" y="120" width="40" height="55" rx="2" fill={c.dark} />

                {/* 邮筒主体 - 圆角矩形 */}
                <rect x="25" y="40" width="110" height="85" rx="12" fill={c.body} />

                {/* 投信口 */}
                <rect x="30" y="65" width="100" height="8" rx="4" fill={c.dark} opacity="0.6" />
                <rect x="35" y="67" width="90" height="4" rx="2" fill="#3e2723" opacity="0.4" />

                {/* 年份标签 */}
                <rect x="35" y="78" width="90" height="30" rx="6" fill="rgba(255,255,255,0.25)" />
                <text
                    x="80"
                    y="99"
                    textAnchor="middle"
                    fill="white"
                    fontSize="20"
                    fontWeight="bold"
                    fontFamily="Georgia, serif"
                >
                    {year}
                </text>

                {/* 邮筒顶部弧顶 */}
                <path
                    d="M25 45 Q25 15 80 15 Q135 15 135 45"
                    fill={c.top}
                />
                <path
                    d="M25 45 Q25 20 80 20 Q135 20 135 45"
                    fill={c.body}
                    opacity="0.3"
                />

                {/* 顶部装饰球 */}
                <circle cx="80" cy="16" r="6" fill={c.dark} />
                <circle cx="80" cy="16" r="3" fill="rgba(255,255,255,0.3)" />

                {/* 阴影 */}
                <ellipse cx="80" cy="205" rx="55" ry="5" fill="rgba(0,0,0,0.08)" />
            </svg>

            {/* 信件数量徽章 */}
            <motion.div
                className="mailbox-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15 * index + 0.5, type: 'spring' }}
            >
                {count} 封
            </motion.div>
        </motion.div>
    );
};

const MailboxScene = ({ letters, onSelectYear, onCreateNew }) => {
    const years = getYearRange(letters);

    const getCountForYear = (year) => {
        return letters.filter(l => {
            try {
                return new Date(l.date).getFullYear() === year;
            } catch { return false; }
        }).length;
    };

    return (
        <motion.div
            className="mailbox-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* 场景装饰 */}
            <div className="mailbox-bg-elements">
                <div className="mailbox-cloud cloud-1" />
                <div className="mailbox-cloud cloud-2" />
                <div className="mailbox-cloud cloud-3" />
                <div className="mailbox-ground" />
            </div>

            {/* 标题 */}
            <motion.div
                className="mailbox-title-area"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
            >
                <div className="mailbox-title-icon">📮</div>
                <h1 className="mailbox-title">时光信箱</h1>
                <p className="mailbox-subtitle">那些藏在心底的话</p>
            </motion.div>

            {/* 邮筒网格 */}
            <div className="mailbox-grid">
                {years.map((year, idx) => (
                    <Mailbox
                        key={year}
                        year={year}
                        count={getCountForYear(year)}
                        onClick={onSelectYear}
                        index={idx}
                    />
                ))}

                {/* 新增年份 - 如果没有任何信件则显示引导 */}
                {years.length === 0 && (
                    <motion.div
                        className="mailbox-empty-prompt"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <div className="mailbox-empty-icon">✉️</div>
                        <p>还没有时光信件</p>
                        <motion.button
                            className="mailbox-create-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onCreateNew}
                        >
                            写第一封信
                        </motion.button>
                    </motion.div>
                )}
            </div>

            {/* 底部写新信按钮 - 已移除，使用右下角统一钢笔图标 */}
        </motion.div>
    );
};

export default MailboxScene;
