'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Home, User } from 'lucide-react';
import { Me, Household } from './types';
import { getInitials, getAvatarGradient } from './helpers';

const NAV_H = 64;
const CROP_FRAME = 280;
const CROP_RADIUS = 120;

interface SettingsViewProps {
  me: Me | null;
  household: Household | null;
  fetchAll: () => Promise<void>;
}

export default function SettingsView({ me, household, fetchAll }: SettingsViewProps) {
  const router = useRouter();

  const [copiedInvite, setCopiedInvite] = useState(false);

  // Sign out
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  // Display name editing
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Change password
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');

  // Household
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [householdNameInput, setHouseholdNameInput] = useState('');
  const [savingHouseholdName, setSavingHouseholdName] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showMoveOutConfirm, setShowMoveOutConfirm] = useState(false);
  const [leavingHousehold, setLeavingHousehold] = useState(false);
  const [moveOutError, setMoveOutError] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropMinZoom, setCropMinZoom] = useState(1);
  const [cropImgDims, setCropImgDims] = useState({ w: 0, h: 0 });
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropDragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const myColorIndex = (household?.members.findIndex(m => m.user_id === (me?.userId ?? -1)) ?? 0);

  function copyInviteCode() {
    if (!household) return;
    navigator.clipboard.writeText(household.inviteCode).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    });
  }

  // ── Crop helpers ─────────────────────────────────────────────────────────────

  function handleCropImageLoad() {
    const img = cropImgRef.current;
    if (!img) return;
    const minZoom = Math.max((2 * CROP_RADIUS) / img.naturalWidth, (2 * CROP_RADIUS) / img.naturalHeight);
    setCropImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    setCropMinZoom(minZoom);
    setCropZoom(minZoom);
    setCropOffset({ x: 0, y: 0 });
  }

  function handleCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragRef.current = { startX: e.clientX, startY: e.clientY, startOffX: cropOffset.x, startOffY: cropOffset.y };
  }

  function handleCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!cropDragRef.current || !cropImgRef.current) return;
    const dx = e.clientX - cropDragRef.current.startX;
    const dy = e.clientY - cropDragRef.current.startY;
    const img = cropImgRef.current;
    const maxX = Math.max(0, (img.naturalWidth * cropZoom) / 2 - CROP_RADIUS);
    const maxY = Math.max(0, (img.naturalHeight * cropZoom) / 2 - CROP_RADIUS);
    setCropOffset({
      x: Math.max(-maxX, Math.min(maxX, cropDragRef.current.startOffX + dx)),
      y: Math.max(-maxY, Math.min(maxY, cropDragRef.current.startOffY + dy)),
    });
  }

  function handleCropPointerUp() {
    cropDragRef.current = null;
  }

  function handleZoomChange(newZoom: number) {
    const img = cropImgRef.current;
    if (!img) return;
    const maxX = Math.max(0, (img.naturalWidth * newZoom) / 2 - CROP_RADIUS);
    const maxY = Math.max(0, (img.naturalHeight * newZoom) / 2 - CROP_RADIUS);
    setCropZoom(newZoom);
    setCropOffset(prev => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x)),
      y: Math.max(-maxY, Math.min(maxY, prev.y)),
    }));
  }

  function handleCropWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newZoom = Math.max(cropMinZoom, Math.min(cropMinZoom * 4, cropZoom + delta * cropMinZoom));
    handleZoomChange(newZoom);
  }

  function closeCropModal() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropImgDims({ w: 0, h: 0 });
  }

  async function applyCrop() {
    const img = cropImgRef.current;
    if (!img || !cropSrc) return;

    const OUTPUT_SIZE = 240;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const srcRadius = CROP_RADIUS / cropZoom;
    const srcCX = img.naturalWidth / 2 - cropOffset.x / cropZoom;
    const srcCY = img.naturalHeight / 2 - cropOffset.y / cropZoom;
    ctx.drawImage(img, srcCX - srcRadius, srcCY - srcRadius, srcRadius * 2, srcRadius * 2, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      if (res.ok) await fetchAll();
    } catch { /* silent */ } finally {
      setUploadingAvatar(false);
    }
  }

  // ── Avatar upload / reset ────────────────────────────────────────────────────

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOffset({ x: 0, y: 0 });
    setCropZoom(1);
  }

  async function handleResetAvatar() {
    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });
      if (res.ok) await fetchAll();
    } catch { /* silent */ } finally {
      setUploadingAvatar(false);
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

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (changingPassword) return;
    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordError('New passwords do not match.');
      return;
    }
    if (newPasswordInput.length < 6) {
      setChangePasswordError('New password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    setChangePasswordError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPasswordInput, newPassword: newPasswordInput }),
      });
      if (res.ok) {
        setEditingPassword(false);
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        const data = await res.json();
        setChangePasswordError(data.error ?? 'Something went wrong.');
      }
    } catch {
      setChangePasswordError('Something went wrong.');
    } finally {
      setChangingPassword(false);
    }
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
    setSignOutError('');
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSignOutError(data.error ?? 'Could not sign out. Please try again.');
        setSigningOut(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setSignOutError('Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setDeleteAccountError('');
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setDeleteAccountError(data.error ?? 'Something went wrong.');
        setDeletingAccount(false);
      }
    } catch {
      setDeleteAccountError('Something went wrong.');
      setDeletingAccount(false);
    }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: `1.5rem 1.25rem calc(${NAV_H}px + 1.5rem)`, animation: 'viewFadeIn 0.22s ease' }}>

      {/* Hidden file input */}
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />

      {/* ── My Profile card ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={16} strokeWidth={2} style={{ flexShrink: 0 }} /> My Profile
        </h2>

        {/* Profile picture row */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{ width: '100%', background: 'none', border: 'none', cursor: uploadingAvatar ? 'default' : 'pointer', padding: '0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: 8, transition: 'background 0.15s', textAlign: 'left' }}
            onMouseEnter={e => { if (!uploadingAvatar) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="avatar" style={{ width: 44, height: 44, background: getAvatarGradient(myColorIndex >= 0 ? myColorIndex : 0), fontSize: '0.88rem', color: 'white' }}>
                  {getInitials(me?.displayName ?? '?')}
                </div>
              )}
              {uploadingAvatar && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.8)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Profile picture</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {uploadingAvatar ? 'Uploading…' : 'Change photo'}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {me?.avatarUrl && !uploadingAvatar && (
            <div style={{ paddingBottom: '0.5rem' }}>
              <button
                onClick={handleResetAvatar}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.1rem 0', borderRadius: 6, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Remove photo
              </button>
            </div>
          )}
        </div>

        {/* Name row */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {editingDisplayName ? (
            <form onSubmit={handleSaveDisplayName} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', padding: '0.75rem 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Name</div>
                <input className="input-dark" value={displayNameInput} onChange={e => setDisplayNameInput(e.target.value)} maxLength={40} autoFocus />
              </div>
              <button type="submit" disabled={savingDisplayName || !displayNameInput.trim()} style={{ background: '#8DB654', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: '0.85rem', padding: '0.625rem 0.875rem', cursor: 'pointer', opacity: savingDisplayName || !displayNameInput.trim() ? 0.5 : 1, whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}>
                {savingDisplayName ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingDisplayName(false)} style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', padding: '0.625rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>Cancel</button>
            </form>
          ) : (
            <button
              onClick={() => { setDisplayNameInput(me?.displayName ?? ''); setEditingDisplayName(true); }}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 0', display: 'flex', alignItems: 'center', borderRadius: 8, transition: 'background 0.15s', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Name</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{me?.displayName}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>

        {/* Change password row */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {editingPassword ? (
            <form onSubmit={handleChangePassword} style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Change password</div>
              <input
                className="input-dark"
                type="password"
                placeholder="Current password"
                value={currentPasswordInput}
                onChange={e => setCurrentPasswordInput(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
              <input
                className="input-dark"
                type="password"
                placeholder="New password"
                value={newPasswordInput}
                onChange={e => setNewPasswordInput(e.target.value)}
                autoComplete="new-password"
              />
              <input
                className="input-dark"
                type="password"
                placeholder="Confirm new password"
                value={confirmPasswordInput}
                onChange={e => setConfirmPasswordInput(e.target.value)}
                autoComplete="new-password"
              />
              {changePasswordError && (
                <div className="msg-error" style={{ fontSize: '0.82rem' }}>{changePasswordError}</div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={changingPassword || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput}
                  style={{ background: '#8DB654', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: '0.85rem', padding: '0.55rem 1rem', cursor: 'pointer', opacity: changingPassword || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput ? 0.5 : 1, transition: 'opacity 0.15s' }}
                >
                  {changingPassword ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingPassword(false); setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmPasswordInput(''); setChangePasswordError(''); }}
                  style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', padding: '0.55rem 0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setEditingPassword(true)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 0', display: 'flex', alignItems: 'center', borderRadius: 8, transition: 'background 0.15s', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Password</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '0.12em' }}>••••••••</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>

        {/* Sign out row */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.125rem' }}>
          {signOutError && <div className="msg-error" style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}>{signOutError}</div>}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', borderRadius: 8, transition: 'background 0.15s', fontWeight: 600, fontSize: '0.9rem', opacity: signingOut ? 0.6 : 1 }}
            onMouseEnter={e => { if (!signingOut) e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* ── Household card ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Home size={16} strokeWidth={2} style={{ flexShrink: 0 }} /> {household?.name}
        </h2>

        {/* Invite code section */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>Invite code</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: '#8DB654', letterSpacing: '0.1em' }}>
              {household?.inviteCode?.split('').join(' ')}
            </span>
            <button
              onClick={copyInviteCode}
              style={{ flexShrink: 0, background: copiedInvite ? 'rgba(141,182,84,0.15)' : 'rgba(188,155,243,0.15)', border: 'none', borderRadius: 100, color: copiedInvite ? '#8DB654' : '#BC9BF3', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: '0.35rem 0.85rem', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            >
              {copiedInvite ? '✓ Copied!' : 'Copy code'}
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Share this with housemates so they can join</div>
        </div>

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
              <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 500, margin: 0, textAlign: 'center' }}>
                Are you sure you want to leave <strong>{household?.name}</strong>? This action cannot be undone.
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

      {/* ── Delete Account ── */}
      {deleteAccountError && <div className="msg-error" style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}>{deleteAccountError}</div>}
      {showDeleteConfirm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 500, margin: 0, textAlign: 'center' }}>
            Are you sure? <strong>This will permanently delete your account</strong> and cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', fontWeight: 600, fontSize: '0.88rem', padding: '0.6rem', cursor: deletingAccount ? 'default' : 'pointer', opacity: deletingAccount ? 0.6 : 1, transition: 'opacity 0.15s' }}
            >
              {deletingAccount ? 'Deleting…' : 'Yes, delete my account'}
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeleteAccountError(''); }}
              style={{ flex: 1, background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.88rem', padding: '0.6rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowDeleteConfirm(true); setDeleteAccountError(''); }}
          style={{ width: '100%', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        >
          Delete Account
        </button>
      )}

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

      {/* ── Crop modal ── */}
      {cropSrc && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={closeCropModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#1a1a2e', borderRadius: 20, padding: '1.25rem', width: 'min(340px, 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', animation: 'popIn 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f1f8' }}>Crop photo</span>
              <button onClick={closeCropModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#9b9bb8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>✕</button>
            </div>

            {/* Crop viewport */}
            <div
              style={{ width: CROP_FRAME, height: CROP_FRAME, position: 'relative', overflow: 'hidden', cursor: 'grab', borderRadius: 12, background: '#000', touchAction: 'none', userSelect: 'none' }}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerLeave={handleCropPointerUp}
              onWheel={handleCropWheel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={cropImgRef}
                src={cropSrc}
                alt="Crop preview"
                onLoad={handleCropImageLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  width: cropImgDims.w > 0 ? cropImgDims.w * cropZoom : 'auto',
                  height: cropImgDims.h > 0 ? cropImgDims.h * cropZoom : 'auto',
                  left: cropImgDims.w > 0 ? CROP_FRAME / 2 + cropOffset.x - (cropImgDims.w * cropZoom) / 2 : 0,
                  top: cropImgDims.h > 0 ? CROP_FRAME / 2 + cropOffset.y - (cropImgDims.h * cropZoom) / 2 : 0,
                  pointerEvents: 'none',
                  maxWidth: 'none',
                }}
              />
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: CROP_RADIUS * 2, height: CROP_RADIUS * 2, borderRadius: '50%', boxShadow: `0 0 0 ${CROP_FRAME}px rgba(0,0,0,0.6)`, pointerEvents: 'none', zIndex: 2 }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: CROP_RADIUS * 2, height: CROP_RADIUS * 2, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.65)', pointerEvents: 'none', zIndex: 3 }} />
            </div>

            {/* Zoom slider */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              <input
                type="range"
                min={cropMinZoom}
                max={cropMinZoom * 4}
                step={cropMinZoom * 0.01}
                value={cropZoom}
                onChange={e => handleZoomChange(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#BC9BF3' }}
              />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
              Drag to reposition · Scroll to zoom
            </p>

            <div style={{ display: 'flex', gap: '0.625rem', width: '100%' }}>
              <button onClick={closeCropModal} style={{ flex: 1, background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.88rem', padding: '0.65rem', cursor: 'pointer' }}>Cancel</button>
              <button onClick={applyCrop} style={{ flex: 2, background: '#8DB654', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, fontSize: '0.88rem', padding: '0.65rem', cursor: 'pointer' }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
