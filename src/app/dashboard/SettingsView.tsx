'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Me, Household } from './types';
import { getInitials, getAvatarGradient } from './helpers';

const NAV_H = 64;

interface SettingsViewProps {
  me: Me | null;
  household: Household | null;
  fetchAll: () => Promise<void>;
}

function getMemberColorIndex(userId: number): number {
  return userId % 6;
}

export default function SettingsView({ me, household, fetchAll }: SettingsViewProps) {
  const router = useRouter();

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [householdNameInput, setHouseholdNameInput] = useState('');
  const [savingHouseholdName, setSavingHouseholdName] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showMoveOutConfirm, setShowMoveOutConfirm] = useState(false);
  const [leavingHousehold, setLeavingHousehold] = useState(false);
  const [moveOutError, setMoveOutError] = useState('');

  function copyInviteLink() {
    if (!household) return;
    const link = `${window.location.origin}/household/join?code=${household.inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    });
  }

  function compressImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await compressImage(file, 120, 0.75);
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      if (res.ok) await fetchAll();
    } catch { /* silent */ } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  async function handleSaveDisplayName(e: FormEvent) {
    e.preventDefault();
    const name = displayNameInput.trim();
    if (!name || savingDisplayName) return;
    setSavingDisplayName(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });
      if (res.ok) { setEditingDisplayName(false); await fetchAll(); }
    } catch { /* silent */ } finally { setSavingDisplayName(false); }
  }

  async function handleSaveHouseholdName(e: FormEvent) {
    e.preventDefault();
    const name = householdNameInput.trim();
    if (!name || savingHouseholdName) return;
    setSavingHouseholdName(true);
    try {
      const res = await fetch('/api/household', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) { setEditingHouseholdName(false); await fetchAll(); }
    } catch { /* silent */ } finally { setSavingHouseholdName(false); }
  }

  async function handleMoveOut() {
    if (leavingHousehold) return;
    setLeavingHousehold(true);
    setMoveOutError('');
    try {
      const res = await fetch('/api/household/leave', { method: 'POST' });
      if (res.ok) { router.push('/household'); router.refresh(); }
      else {
        const data = await res.json();
        setMoveOutError(data.error ?? 'Something went wrong.');
        setLeavingHousehold(false);
      }
    } catch {
      setMoveOutError('Something went wrong.');
      setLeavingHousehold(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch { setSigningOut(false); }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: `1.5rem 1.25rem calc(${NAV_H}px + 1.5rem)`, animation: 'viewFadeIn 0.22s ease' }}>

      {/* ── Profile card ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0, display: 'block' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            {me?.avatarUrl ? (
              <img src={me.avatarUrl} alt="Profile" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div className="avatar" style={{ width: 72, height: 72, background: getAvatarGradient(getMemberColorIndex(me?.userId ?? 0)), fontSize: '1.35rem', color: 'white' }}>
                {getInitials(me?.displayName ?? '?')}
              </div>
            )}
            <div
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: uploadingAvatar ? 1 : 0, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => { if (!uploadingAvatar) e.currentTarget.style.opacity = '0'; }}
            >
              {uploadingAvatar ? (
                <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.8)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </div>
          </label>

          {editingDisplayName ? (
            <form onSubmit={handleSaveDisplayName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: 260 }}>
              <input className="input-dark" value={displayNameInput} onChange={e => setDisplayNameInput(e.target.value)} maxLength={40} autoFocus style={{ textAlign: 'center', fontWeight: 600 }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={savingDisplayName || !displayNameInput.trim()} style={{ background: '#8DB654', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 0.9rem', cursor: 'pointer', opacity: savingDisplayName || !displayNameInput.trim() ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                  {savingDisplayName ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditingDisplayName(false)} style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
              <button
                onClick={() => { setDisplayNameInput(me?.displayName ?? ''); setEditingDisplayName(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', borderRadius: 8, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{me?.displayName}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{me?.username}</div>
              {me?.household?.role === 'owner' && (
                <span className="badge" style={{ background: 'rgba(188,155,243,0.1)', color: '#7c3aed', border: '1px solid rgba(188,155,243,0.25)', marginTop: '0.25rem', display: 'inline-block' }}>Owner</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Household card ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🏠 {household?.name}
        </h2>

        <button
          onClick={copyInviteLink}
          style={{ width: '100%', marginBottom: '1rem', background: copiedInvite ? 'rgba(20,184,166,0.1)' : 'rgba(188,155,243,0.08)', border: copiedInvite ? '1.5px solid rgba(20,184,166,0.35)' : '1.5px solid rgba(188,155,243,0.3)', borderRadius: 12, color: copiedInvite ? '#0d7d72' : '#7c3aed', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, padding: '0.65rem 1rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {copiedInvite ? (
            <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Invite link copied!</>
          ) : (
            <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>Copy invite link</>
          )}
        </button>

        {/* Name row */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {editingHouseholdName ? (
            <form onSubmit={handleSaveHouseholdName} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', padding: '0.75rem 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Name</div>
                <input className="input-dark" value={householdNameInput} onChange={e => setHouseholdNameInput(e.target.value)} maxLength={50} autoFocus />
              </div>
              <button type="submit" disabled={savingHouseholdName || !householdNameInput.trim()} style={{ background: '#8DB654', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: '0.85rem', padding: '0.625rem 0.875rem', cursor: 'pointer', opacity: savingHouseholdName || !householdNameInput.trim() ? 0.5 : 1, whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}>
                {savingHouseholdName ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingHouseholdName(false)} style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', padding: '0.625rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
            </form>
          ) : (
            <button
              onClick={() => { if (me?.household?.role === 'owner') { setHouseholdNameInput(household?.name ?? ''); setEditingHouseholdName(true); } }}
              disabled={me?.household?.role !== 'owner'}
              style={{ width: '100%', background: 'none', border: 'none', cursor: me?.household?.role === 'owner' ? 'pointer' : 'default', padding: '0.75rem 0', display: 'flex', alignItems: 'center', borderRadius: 8, transition: 'background 0.15s', textAlign: 'left' }}
              onMouseEnter={e => { if (me?.household?.role === 'owner') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Name</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{household?.name}</div>
              </div>
              {me?.household?.role === 'owner' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
              )}
            </button>
          )}
        </div>

        {/* Members row */}
        <button
          onClick={() => setShowMembersModal(true)}
          style={{ width: '100%', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', padding: '0.75rem 0', display: 'flex', alignItems: 'center', transition: 'background 0.15s', textAlign: 'left' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Members</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex' }}>
                {household?.members.slice(0, 4).map((m, i) => (
                  <div key={m.user_id} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fdfcf8', marginLeft: i > 0 ? -9 : 0, zIndex: 4 - i, position: 'relative', flexShrink: 0, overflow: 'hidden', background: getAvatarGradient(i), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt={m.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>{getInitials(m.display_name)}</span>
                    }
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {household?.members.length === 1 ? '1 member' : `${household?.members.length ?? 0} members`}
              </span>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Move out */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.125rem' }}>
          {moveOutError && <div className="msg-error" style={{ marginBottom: '0.625rem', fontSize: '0.82rem' }}>{moveOutError}</div>}
          {showMoveOutConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 500, margin: 0, textAlign: 'center' }}>
                Leave <strong>{household?.name}</strong>? You won&apos;t be able to see chores or messages.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={handleMoveOut} disabled={leavingHousehold} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', fontWeight: 600, fontSize: '0.88rem', padding: '0.6rem', cursor: leavingHousehold ? 'default' : 'pointer', opacity: leavingHousehold ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                  {leavingHousehold ? 'Leaving…' : 'Yes, move out'}
                </button>
                <button onClick={() => { setShowMoveOutConfirm(false); setMoveOutError(''); }} style={{ flex: 1, background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.88rem', padding: '0.6rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowMoveOutConfirm(true); setMoveOutError(''); }}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', borderRadius: 8, transition: 'background 0.15s', fontWeight: 600, fontSize: '0.9rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Move out
            </button>
          )}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{ width: '100%', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      {/* Members modal */}
      {showMembersModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowMembersModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#16162a', borderRadius: '20px 20px 0 0', padding: '1.25rem 1.25rem 2rem', animation: 'sheetUpIn 0.28s cubic-bezier(0.32,0.72,0,1)', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 1.25rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                Members <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({household?.members.length})</span>
              </h2>
              <button onClick={() => setShowMembersModal(false)} className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '1rem' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {household?.members.map((m, i) => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < (household.members.length - 1) ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: getAvatarGradient(i), flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt={m.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>{getInitials(m.display_name)}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {m.display_name}
                      {m.user_id === me?.userId && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{m.username}</div>
                  </div>
                  {m.role === 'owner' && (
                    <span className="badge" style={{ background: 'rgba(188,155,243,0.1)', color: '#BC9BF3', border: '1px solid rgba(188,155,243,0.2)', flexShrink: 0 }}>Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
