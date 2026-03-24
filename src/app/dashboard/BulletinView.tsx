'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { Me, Household, Message } from './types';
import { getInitials, getAvatarGradient, formatMessageTime, getMembersLabel } from './helpers';

const NAV_H = 64;
const HEADER_H = 48;

interface BulletinViewProps {
  me: Me | null;
  household: Household | null;
  isActive: boolean;
}

export default function BulletinView({ me, household, isActive }: BulletinViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contextMenuMsgId, setContextMenuMsgId] = useState<number | null>(null);
  const [isClosingContextMenu, setIsClosingContextMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  function getMemberColorIndex(userId: number): number {
    const idx = household?.members.findIndex(m => m.user_id === userId) ?? -1;
    return idx >= 0 ? idx : 0;
  }

  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch { /* silent */ }
    finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [isActive, fetchMessages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isActive && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages, isActive]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || sendingMessage) return;

    if (editingMsgId !== null) {
      await handleEditMessage(editingMsgId, content);
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setMessageInput('');
        await fetchMessages();
      }
    } catch { /* silent */ }
    finally {
      setSendingMessage(false);
    }
  }

  async function handleLikeMessage(messageId: number) {
    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, liked_by_me: !m.liked_by_me, like_count: m.liked_by_me ? m.like_count - 1 : m.like_count + 1 }
        : m
    ));
    try {
      await fetch(`/api/messages/${messageId}`, { method: 'PATCH' });
    } catch {
      // Revert — same toggle brings it back to original
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, liked_by_me: !m.liked_by_me, like_count: m.liked_by_me ? m.like_count - 1 : m.like_count + 1 }
          : m
      ));
    }
  }

  async function handleDeleteMessage(messageId: number) {
    setContextMenuMsgId(null);
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch { /* silent */ }
  }

  function closeContextMenu() {
    setIsClosingContextMenu(true);
    setTimeout(() => { setContextMenuMsgId(null); setIsClosingContextMenu(false); }, 200);
  }

  function startLongPress(msgId: number) {
    longPressTimer.current = setTimeout(() => {
      setContextMenuMsgId(msgId);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  async function handleEditMessage(messageId: number, newContent: string) {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: trimmed, is_edited: true } : m));
        setEditingMsgId(null);
        setMessageInput('');
      }
    } catch { /* silent */ }
  }

  function cancelEdit() {
    setEditingMsgId(null);
    setMessageInput('');
  }

  return (
    <div
      style={{
        height: `calc(100vh - ${HEADER_H}px - ${NAV_H}px)`,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '700px',
        margin: '0 auto',
        animation: 'viewFadeIn 0.22s ease',
      }}
    >
      {/* Members strip */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          padding: '0.875rem 1.25rem',
          background: 'rgba(17,17,32,0.6)',
        }}
      >
        <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.625rem' }}>
          {getMembersLabel(household?.members ?? [])}
        </p>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {(household?.members ?? []).slice(0, 6).map((m, i) => (
            <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              <div
                className="avatar"
                style={{
                  width: '48px',
                  height: '48px',
                  background: getAvatarGradient(i),
                  fontSize: '0.9rem',
                  color: 'white',
                  border: m.user_id === me?.userId ? '2px solid #BC9BF3' : '2px solid transparent',
                }}
              >
                {getInitials(m.display_name)}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)', maxWidth: '52px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {m.user_id === me?.userId ? 'You' : m.display_name.split(' ')[0]}
              </span>
            </div>
          ))}
          {(household?.members.length ?? 0) > 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              <div
                className="avatar"
                style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.06)', border: '1.5px solid var(--border)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}
              >
                +{(household?.members.length ?? 0) - 6}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>more</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages scrollable area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {loadingMessages && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.85rem' }}>
            Loading messages…
          </div>
        )}

        {!loadingMessages && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Start the conversation</div>
            <div style={{ fontSize: '0.85rem' }}>Send a message to your household.</div>
          </div>
        )}

        {messages.map(msg => {
          const isOwn = msg.user_id === me?.userId;
          const colorIdx = getMemberColorIndex(msg.user_id);
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isOwn ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '0.5rem',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {/* Avatar — only for others */}
              {!isOwn && (
                <div
                  className="avatar"
                  style={{
                    width: '32px',
                    height: '32px',
                    background: getAvatarGradient(colorIdx),
                    fontSize: '0.65rem',
                    color: 'white',
                    flexShrink: 0,
                    marginBottom: '1.5rem',
                  }}
                >
                  {getInitials(msg.display_name)}
                </div>
              )}

              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                {/* Name + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    {isOwn ? 'You' : msg.display_name}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  onMouseDown={() => startLongPress(msg.id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(msg.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onContextMenu={(e) => { e.preventDefault(); cancelLongPress(); setContextMenuMsgId(msg.id); }}
                  style={{
                    background: isOwn
                      ? 'rgba(115,96,249,0.22)'
                      : 'rgba(255,255,255,0.06)',
                    border: isOwn ? '1px solid rgba(115,96,249,0.35)' : '1px solid var(--border)',
                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '0.5rem 0.875rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: '1.45',
                    wordBreak: 'break-word',
                    userSelect: 'none',
                    cursor: 'default',
                  }}
                >
                  {msg.content}
                  {msg.is_edited && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.5, marginTop: '0.2rem' }}>
                      Edited
                    </div>
                  )}
                </div>

                {/* Like + delete row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                  <button
                    onClick={() => handleLikeMessage(msg.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: msg.liked_by_me ? '#ec4899' : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.35rem',
                      borderRadius: '6px',
                      transition: 'color 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>{msg.liked_by_me ? '♥' : '♡'}</span>
                    {msg.like_count > 0 && <span>{msg.like_count}</span>}
                  </button>

                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message context menu */}
      {contextMenuMsgId !== null && (() => {
        const ctxMsg = messages.find(m => m.id === contextMenuMsgId);
        if (!ctxMsg) return null;
        const ctxIsOwn = ctxMsg.user_id === me?.userId;
        return (
          <>
            <div
              onClick={closeContextMenu}
              style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(0,0,0,0.55)',
                animation: isClosingContextMenu ? 'backdropFadeOut 0.2s ease-in forwards' : 'backdropFade 0.15s ease',
              }}
            />
            <div style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 201,
              background: '#252535',
              borderRadius: '18px',
              boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
              width: 'min(320px, calc(100vw - 2rem))',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: isClosingContextMenu ? 'modalOut 0.18s ease-in forwards' : 'modalIn 0.2s cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}>
              {/* Message preview */}
              <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ctxMsg.content}
                </p>
              </div>

              {/* Actions */}
              <div style={{ padding: '0.375rem' }}>
                {ctxIsOwn && (
                  <button
                    onClick={() => {
                      closeContextMenu();
                      setEditingMsgId(ctxMsg.id);
                      setMessageInput(ctxMsg.content);
                      setTimeout(() => {
                        messageInputRef.current?.focus();
                        const len = ctxMsg.content.length;
                        messageInputRef.current?.setSelectionRange(len, len);
                      }, 50);
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      padding: '0.8rem 1rem',
                      background: 'transparent', border: 'none', borderRadius: '10px',
                      color: '#f1f1f8', cursor: 'pointer', fontSize: '0.95rem',
                      textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Edit message
                  </button>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ctxMsg.content);
                    closeContextMenu();
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    padding: '0.8rem 1rem',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#f1f1f8', cursor: 'pointer', fontSize: '0.95rem',
                    textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Copy message text
                </button>

                <button
                  onClick={() => {
                    closeContextMenu();
                    handleLikeMessage(ctxMsg.id);
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    padding: '0.8rem 1rem',
                    background: 'transparent', border: 'none', borderRadius: '10px',
                    color: '#f1f1f8', cursor: 'pointer', fontSize: '0.95rem',
                    textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {ctxMsg.liked_by_me ? 'Unlike' : 'Like'}
                </button>

                {ctxIsOwn && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.25rem 0.5rem' }} />
                    <button
                      onClick={() => handleDeleteMessage(ctxMsg.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        padding: '0.8rem 1rem',
                        background: 'transparent', border: 'none', borderRadius: '10px',
                        color: '#f87171', cursor: 'pointer', fontSize: '0.95rem',
                        textAlign: 'left', transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* Message input */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'rgba(17,17,32,0.8)',
        }}
      >
        {/* Edit mode banner */}
        {editingMsgId !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.55rem 1rem 0.45rem',
            borderBottom: '1px solid rgba(115,96,249,0.2)',
            background: 'rgba(115,96,249,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Pencil icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(115,96,249,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'rgba(115,96,249,0.9)' }}>
                Edit message
              </span>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.25rem' }}>
          <input
            ref={messageInputRef}
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            className="input-dark"
            placeholder="Send a message…"
            maxLength={500}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || sendingMessage}
            style={{
              background: messageInput.trim() ? (editingMsgId !== null ? '#7360F9' : '#8DB654') : 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              cursor: messageInput.trim() ? 'pointer' : 'default',
              fontWeight: '600',
              fontSize: '0.85rem',
              padding: '0.625rem 1rem',
              flexShrink: 0,
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {sendingMessage ? '…' : editingMsgId !== null ? 'Save' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
