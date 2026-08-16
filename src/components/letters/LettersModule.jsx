import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import BounceCards from './BounceCards';
import Envelope from './Envelope';
import LetterPaper from './LetterPaper';
import WriteLetter from './WriteLetter';
import MailboxScene from './MailboxScene';
import './letters.css';

// 把中文日期 "2026年7月29日" 转为 ISO 格式
const toISODate = (dateStr) => {
    if (!dateStr) return new Date().toISOString();
    // 已经是 ISO 格式
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr + 'T00:00:00+08:00';
    // 中文格式: "2026年7月29日"
    const match = String(dateStr).match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
        const [, y, m, d] = match;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+08:00`;
    }
    return new Date(dateStr).toISOString();
};

// 把 ISO 日期转为中文显示
const toChineseDate = (iso) => {
    try {
        const d = new Date(iso);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    } catch {
        return iso;
    }
};

export default function LettersModule() {
    const { user } = useAuth();
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewState, setViewState] = useState('mailbox'); // 'mailbox' | 'stack' | 'reading' | 'writing'
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [currentEditData, setCurrentEditData] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null); // 待删除的信件（自定义确认用）

    const fetchLetters = useCallback(async () => {
        setLoading(true);
        try {
            const { data: lettersData, error: lettersError } = await supabase
                .from('letters')
                .select('*')
                .eq('is_draft', false)
                .order('date', { ascending: false });

            if (lettersError) throw lettersError;
            setLetters(lettersData || []);

            if (user?.id) {
                const { data: draftData, error: draftError } = await supabase
                    .from('letters')
                    .select('*')
                    .eq('is_draft', true)
                    .eq('author_id', user.id)
                    .order('date', { ascending: false });

                if (draftError) throw draftError;
                setDrafts(draftData || []);
            } else {
                setDrafts([]);
            }

        } catch (error) {
            console.error('Error fetching letters/drafts:', error.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchLetters(); }, [fetchLetters]);

    // 按年份筛选并排序信件（按日期降序，最新的在上面）
    const filteredLetters = (selectedYear
        ? letters.filter(l => {
            try { return new Date(l.date).getFullYear() === selectedYear; }
            catch { return false; }
        })
        : letters
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    const handleOpenLetter = (letter) => {
        setSelectedLetter(letter);
        setViewState('reading');
    };

    const handleCloseLetter = () => {
        setViewState('stack');
        setSelectedLetter(null);
    };

    const handleOpenYear = (year) => {
        setSelectedYear(year);
        setViewState('stack');
    };

    const handleBackToMailbox = () => {
        setViewState('mailbox');
        setSelectedYear(null);
    };

    const handleDeleteLetter = useCallback((letter) => {
        setDeleteTarget(letter); // 用自定义弹窗代替 window.confirm
    }, []);

    const confirmDelete = useCallback(async () => {
        const letter = deleteTarget;
        setDeleteTarget(null);
        if (!letter) return;

        try {
            const { error } = await supabase
                .from('letters')
                .delete()
                .eq('id', letter.id);

            if (error) {
                alert(`删除失败: ${error.message}`);
                return;
            }

            setLetters(prev => prev.filter(l => l.id !== letter.id));
        } catch (err) {
            console.error('删除异常:', err);
            alert(`删除异常: ${err.message}`);
        }
    }, [deleteTarget]);

    const cancelDelete = useCallback(() => {
        setDeleteTarget(null);
    }, []);

    const handleOpenWrite = () => {
        setCurrentEditData(null);
        setViewState('writing');
    };

    const handleOpenDraft = (draft) => {
        setCurrentEditData(draft);
        setViewState('writing');
    };

    const handleDeleteDraft = async (e, draftId) => {
        e.stopPropagation();
        if (!window.confirm('确定要删除这张稿纸吗？')) return;
        try {
            const { error } = await supabase
                .from('letters')
                .delete()
                .eq('id', draftId);
            if (error) throw error;
            await fetchLetters();
        } catch (error) {
            console.error('Error deleting draft:', error);
        }
    };

    const handleSaveDraft = async (draftData) => {
        try {
            if (draftData.id) {
                const { error } = await supabase
                    .from('letters')
                    .update({
                        sender: draftData.sender,
                        recipient: draftData.recipient,
                        date: toISODate(draftData.date),
                        content: draftData.content,
                        is_draft: true
                    })
                    .eq('id', draftData.id);
                if (error) throw error;
            } else {
                if (drafts.length >= 4) {
                    alert('草稿箱已满，请先清理一些草稿。');
                    return;
                }
                const { error } = await supabase
                    .from('letters')
                    .insert([{
                        sender: draftData.sender,
                        recipient: draftData.recipient,
                        date: toISODate(draftData.date),
                        content: draftData.content,
                        is_draft: true,
                        author_id: user?.id || null,
                    }]);
                if (error) throw error;
            }
            await fetchLetters();
            setViewState('stack');
        } catch (error) {
            console.error('Error saving draft:', error);
            alert(`保存草稿失败: ${error.message}`);
        }
    };

    const handleSendLetter = async (newLetterData) => {
        try {
            if (newLetterData.id) {
                const { error } = await supabase
                    .from('letters')
                    .update({
                        sender: newLetterData.sender,
                        recipient: newLetterData.recipient,
                        date: toISODate(newLetterData.date),
                        content: newLetterData.content,
                        is_draft: false
                    })
                    .eq('id', newLetterData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('letters')
                    .insert([{
                        sender: newLetterData.sender,
                        recipient: newLetterData.recipient,
                        date: toISODate(newLetterData.date),
                        content: newLetterData.content,
                        is_draft: false,
                        author_id: user?.id || null,
                    }]);
                if (error) throw error;
            }
            await fetchLetters();
            setViewState('stack');
        } catch (error) {
            console.error('Error sending letter:', error);
            alert(`发送失败: ${error.message || '请检查网络或数据库配置'}`);
        }
    };

    return (
        <div className="letters-module-container">
            {loading && (
                <div className="loading-overlay">
                    <div className="loader"></div>
                    <p>正在载入时光信箱...</p>
                </div>
            )}

            <div className="letters-main-area">
                <AnimatePresence mode="wait">
                    {/* 邮筒入口 */}
                    {viewState === 'mailbox' && (
                        <MailboxScene
                            key="mailbox"
                            letters={letters}
                            onSelectYear={handleOpenYear}
                            onCreateNew={handleOpenWrite}
                        />
                    )}

                    {/* 信封堆叠（按年份筛选） */}
                    {viewState === 'stack' && (
                        <motion.div
                            key={`stack-${selectedYear || 'all'}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="stack-wrapper"
                            style={{ width: '100%', height: '100%' }}
                        >
                            {/* 返回按钮 */}
                            <div className="stack-header">
                                <button className="mailbox-back-btn" onClick={handleBackToMailbox}>
                                    ← 邮筒
                                </button>
                            </div>

                            {filteredLetters.length > 0 ? (
                                <BounceCards>
                                    {filteredLetters.map((letter) => (
                                        <Envelope
                                            key={letter.id}
                                            sender={letter.sender}
                                            date={letter.date}
                                            stampType={(String(letter.id || '').charCodeAt(0) || 0) % 6 + 1}
                                            onClick={() => handleOpenLetter(letter)}
                                            onDelete={handleDeleteLetter}
                                            letter={letter}
                                        />
                                    ))}
                                </BounceCards>
                            ) : (
                                <div className="empty-state">
                                    <p>这一年还没有信件</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {viewState === 'reading' && selectedLetter && (
                        <LetterPaper
                            key="reading"
                            letter={selectedLetter}
                            onClose={handleCloseLetter}
                        />
                    )}

                    {viewState === 'writing' && (
                        <WriteLetter
                            key="writing"
                            initialData={currentEditData}
                            onSend={handleSendLetter}
                            onSaveDraft={handleSaveDraft}
                            onCancel={() => setViewState('stack')}
                        />
                    )}
                </AnimatePresence>
            </div>

            {letters.length === 0 && viewState === 'mailbox' && !loading && (
                <div className="empty-state">
                    <p>还没有信件，点右下角写一封吧 ✍️</p>
                </div>
            )}

            {/* Drafts Tray */}
            {viewState === 'stack' && drafts.length > 0 && (
                <div className="drafts-tray">
                    {drafts.map((draft) => (
                        <div
                            key={draft.id}
                            className="draft-item"
                            onClick={() => handleOpenDraft(draft)}
                            title="点击继续编辑草稿"
                        >
                            <button
                                className="delete-draft-btn"
                                onClick={(e) => handleDeleteDraft(e, draft.id)}
                            >
                                &times;
                            </button>
                            <div className="draft-sender-preview">{draft.sender || '无署名'}</div>
                            <div className="draft-lines-preview"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Corner Write Button */}
            {(viewState === 'stack' || viewState === 'mailbox') && (
                <motion.div
                    className="corner-pen-illustration"
                    onClick={handleOpenWrite}
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    <svg width="200" height="200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5 6.5L17.5 10.5" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 20L5 15L16 4C16.5304 3.46957 17.25 3.17157 18 3.17157C18.75 3.17157 19.4696 3.46957 20 4C20.5304 4.53043 20.8284 5.25 20.8284 6C20.8284 6.75 20.5304 7.46957 20 8L9 19L4 20Z" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 20H8" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 20H20" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="pen-label">Write</div>
                </motion.div>
            )}

            {/* 自定义确认弹窗（替代 window.confirm，不中断音频） */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        className="delete-confirm-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={cancelDelete}
                    >
                        <motion.div
                            className="delete-confirm-dialog"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <p className="delete-confirm-text">
                                确定要删除<br />
                                「{deleteTarget.sender || '未知'}」写给「{deleteTarget.recipient || '...'}」<br />
                                的信吗？此操作不可撤销。
                            </p>
                            <div className="delete-confirm-actions">
                                <button className="delete-confirm-btn cancel" onClick={cancelDelete}>取消</button>
                                <button className="delete-confirm-btn confirm" onClick={confirmDelete}>确认删除</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
