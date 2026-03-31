'use client';

import { useState, FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { Me, Household, Chore } from './types';
import {
  getTodayStr,
  formatDisplayDate,
  formatGroupDate,
  formatHistoryGroupDate,
  addDays,
  FREQUENCY_OFFSETS,
  getInitials,
  getAvatarGradient,
} from './helpers';
import DatePickerCalendar from './DatePickerCalendar';
import ChoreCard from './ChoreCard';

const NAV_H = 64;

interface ChoresViewProps {
  me: Me | null;
  household: Household | null;
  chores: Chore[];
  fetchAll: () => Promise<void>;
}

export default function ChoresView({ me, household, chores, fetchAll }: ChoresViewProps) {
  // Chores tab
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'history'>('today');

  // Add chore form
  const [showAddForm, setShowAddForm] = useState(false);
  const [isClosingAddForm, setIsClosingAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigned, setNewAssigned] = useState<number | ''>('');
  const [newDueDate, setNewDueDate] = useState(getTodayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newFrequency, setNewFrequency] = useState<'once' | 'daily' | 'every-other-day' | 'weekly' | 'every-other-week' | 'monthly'>('once');
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [isClosingFrequencyPicker, setIsClosingFrequencyPicker] = useState(false);

  // History tab
  const [historyPopupChore, setHistoryPopupChore] = useState<Chore | null>(null);
  const [isClosingHistory, setIsClosingHistory] = useState(false);

  // Delete confirm popup
  const [deleteConfirmChoreId, setDeleteConfirmChoreId] = useState<number | null>(null);
  const [isClosingDeleteConfirm, setIsClosingDeleteConfirm] = useState(false);

  // ── Derived data ────────────────────────────────────────────────────────────

  const todayStr = getTodayStr();
  const todayChores = chores.filter(c => !c.due_date || c.due_date <= todayStr);
  const upcomingChores = chores.filter(c => c.due_date && c.due_date > todayStr && !c.is_complete);
  const pendingTodayChores = todayChores.filter(c => !c.is_complete);
  const doneTodayChores = todayChores.filter(c => c.is_complete);
  // Progress: only count chores due exactly today, not overdue chores from past days
  const todayProgressChores = chores.filter(c => c.due_date === todayStr || !c.due_date);
  const totalToday = todayProgressChores.length;
  const completedToday = todayProgressChores.filter(c => c.is_complete).length;
  const progressPct = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

  const upcomingGroups: { dateStr: string; chores: Chore[] }[] = (() => {
    const map = new Map<string, Chore[]>();
    upcomingChores.forEach(c => {
      const key = c.due_date!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, chorelist]) => ({ dateStr, chores: chorelist }));
  })();

  const historyChores = chores.filter(c => c.is_complete);
  const historyGroups: { dateStr: string; chores: Chore[] }[] = (() => {
    const map = new Map<string, Chore[]>();
    historyChores.forEach(c => {
      const key = c.completed_at ? c.completed_at.slice(0, 10) : (c.due_date ?? c.created_at.slice(0, 10));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateStr, chorelist]) => ({ dateStr, chores: chorelist }));
  })();

  function getMemberColorIndex(userId: number): number {
    const idx = household?.members.findIndex(m => m.user_id === userId) ?? -1;
    return idx >= 0 ? idx : 0;
  }
  void getMemberColorIndex;

  function openAddForm() {
    setNewTitle('');
    setNewDesc('');
    setNewAssigned('');
    setNewDueDate(getTodayStr());
    setNewFrequency('once');
    setAddError('');
    setShowAddForm(true);
  }

  function closeAddForm() {
    setIsClosingAddForm(true);
    setTimeout(() => { setShowAddForm(false); setIsClosingAddForm(false); }, 180);
  }

  function closeFrequencyPicker() {
    setIsClosingFrequencyPicker(true);
    setTimeout(() => { setShowFrequencyPicker(false); setIsClosingFrequencyPicker(false); }, 180);
  }

  function closeHistoryPopup() {
    setIsClosingHistory(true);
    setTimeout(() => { setHistoryPopupChore(null); setIsClosingHistory(false); }, 200);
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAddChore(e: FormEvent) {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || undefined,
          assignedTo: newAssigned || null,
          dueDate: newDueDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? 'Could not add chore.'); return; }

      // Create future occurrences for recurring frequencies
      const offsets = FREQUENCY_OFFSETS[newFrequency] ?? [];
      for (const offset of offsets) {
        await fetch('/api/chores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTitle,
            description: newDesc || undefined,
            assignedTo: newAssigned || null,
            dueDate: addDays(newDueDate, offset),
          }),
        });
      }

      setNewTitle('');
      setNewDesc('');
      setNewAssigned('');
      setNewDueDate(getTodayStr());
      setNewFrequency('once');
      closeAddForm();
      const currentTodayStr = getTodayStr();
      setActiveTab(newDueDate > currentTodayStr ? 'upcoming' : 'today');
      await fetchAll();
    } catch {
      setAddError('Could not connect. Try again.');
    } finally {
      setAdding(false);
    }
  }

  async function handleComplete(choreId: number, currentlyComplete: boolean) {
    try {
      await fetch(`/api/chores/${choreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: currentlyComplete ? 'uncomplete' : 'complete' }),
      });
      await fetchAll();
    } catch { /* silent */ }
  }

  async function handleAssign(choreId: number, assignedTo: number | null) {
    try {
      await fetch(`/api/chores/${choreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', assignedTo }),
      });
      await fetchAll();
    } catch { /* silent */ }
  }

  async function handleChoreEdit(choreId: number, updates: { title: string; description: string | null; dueDate: string | null }) {
    try {
      await fetch(`/api/chores/${choreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', ...updates }),
      });
      await fetchAll();
    } catch { /* silent */ }
  }

  function handleDelete(choreId: number) {
    setDeleteConfirmChoreId(choreId);
  }

  function closeDeleteConfirm() {
    setIsClosingDeleteConfirm(true);
    setTimeout(() => { setDeleteConfirmChoreId(null); setIsClosingDeleteConfirm(false); }, 200);
  }

  async function handleConfirmDelete() {
    if (deleteConfirmChoreId === null) return;
    const id = deleteConfirmChoreId;
    closeDeleteConfirm();
    try {
      await fetch(`/api/chores/${id}`, { method: 'DELETE' });
      await fetchAll();
    } catch { /* silent */ }
  }

  async function handleDeleteNoConfirm(choreId: number) {
    try {
      await fetch(`/api/chores/${choreId}`, { method: 'DELETE' });
      await fetchAll();
    } catch { /* silent */ }
  }

  return (
    <div
      style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: `1rem 1.25rem calc(${NAV_H}px + 1.5rem)`,
        animation: 'viewFadeIn 0.22s ease',
      }}
    >
      {/* Tabs — very top */}
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'inline-flex',
            gap: '0.25rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '3px',
          }}
        >
          {(['today', 'upcoming', 'history'] as const).map(tab => {
            const count = tab === 'today' ? todayChores.length : tab === 'upcoming' ? upcomingChores.length : historyChores.length;
            const isActive = activeTab === tab;
            const label = tab === 'today' ? 'Today' : tab === 'upcoming' ? 'Upcoming' : 'History';
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (showAddForm) closeAddForm(); }}
                style={{
                  background: isActive ? '#8DB654' : 'transparent',
                  border: 'none',
                  borderRadius: '7px',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? '700' : '500',
                  padding: '0.375rem 0.625rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {label}
                <span
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    borderRadius: '100px',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    padding: '0.05rem 0.35rem',
                    lineHeight: '1.6',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAB — Add chore (bottom-right, fixed, hidden on history tab) */}
      {activeTab !== 'history' && (
        <button
          onClick={openAddForm}
          style={{
            position: 'fixed',
            bottom: `${NAV_H + 16}px`,
            right: 'max(16px, calc((100vw - 700px) / 2 - 96px))',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#8DB654',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            zIndex: 40,
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Add chore"
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="13" y1="3" x2="13" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="3" y1="13" x2="23" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      {/* ── Add chore modal ── */}
      {showAddForm && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeAddForm}
            style={{
              position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
              animation: isClosingAddForm ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
            }}
          />
          {/* Centered card */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 201,
            background: '#252535',
            borderRadius: '20px',
            width: 'min(400px, calc(100vw - 2rem))',
            maxHeight: 'min(680px, calc(100vh - 4rem))',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
            overflow: 'hidden',
            animation: isClosingAddForm ? 'popOut 0.18s ease-in forwards' : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {/* Header */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem', flexShrink: 0 }}>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>New chore</span>
              <button
                type="button"
                onClick={closeAddForm}
                style={{
                  position: 'absolute', right: '1rem',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  color: '#9b9bb8', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {/* Scrollable form body */}
            <form
              onSubmit={handleAddChore}
              style={{
                overflowY: 'auto',
                padding: '0 1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                borderTop: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ marginTop: '0.875rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  What needs doing?
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Vacuum the living room"
                  maxLength={100}
                  required
                  autoFocus
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                    color: '#f1f1f8', fontSize: '0.9rem', padding: '0.6rem 0.75rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Extra notes (optional)
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Under the couch too"
                  maxLength={200}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                    color: '#f1f1f8', fontSize: '0.9rem', padding: '0.6rem 0.75rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date
                </label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                    color: '#f1f1f8', fontSize: '0.9rem', padding: '0.6rem 0.75rem',
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    boxSizing: 'border-box',
                  }}
                >
                  <CalendarDays size={15} color="#ef4444" strokeWidth={1.75} />
                  <span style={{ fontWeight: '500' }}>{formatDisplayDate(newDueDate)}</span>
                </button>
                {showDatePicker && (
                  <DatePickerCalendar
                    value={newDueDate}
                    onChange={val => { setNewDueDate(val); setShowDatePicker(false); }}
                    onClose={() => setShowDatePicker(false)}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Frequency
                </label>
                {(() => {
                  const FREQ_OPTIONS = [
                    { value: 'once', label: 'Once', desc: 'Just this one time' },
                    { value: 'daily', label: 'Daily', desc: 'Every day for a week' },
                    { value: 'every-other-day', label: 'Every other day', desc: 'Every 2 days for 2 weeks' },
                    { value: 'weekly', label: 'Weekly', desc: 'Every week for a month' },
                    { value: 'every-other-week', label: 'Every other week', desc: 'Every 2 weeks for 2 months' },
                    { value: 'monthly', label: 'Every month', desc: 'Monthly for 3 months' },
                  ] as const;
                  const selected = FREQ_OPTIONS.find(o => o.value === newFrequency)!;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowFrequencyPicker(true)}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.06)',
                          border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                          color: '#f1f1f8', fontSize: '0.9rem', padding: '0.6rem 0.75rem',
                          textAlign: 'left', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span style={{ flex: 1, fontWeight: '500' }}>{selected.label}</span>
                        <span style={{ color: '#6b6b88', fontSize: '0.7rem' }}>▾</span>
                      </button>

                      {showFrequencyPicker && (
                        <>
                          <div
                            onClick={closeFrequencyPicker}
                            style={{
                              position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)',
                              animation: isClosingFrequencyPicker ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
                            }}
                          />
                          <div style={{
                            position: 'fixed', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 301, background: '#252535', borderRadius: '20px',
                            width: 'min(340px, calc(100vw - 2rem))',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.75)', overflow: 'hidden',
                            animation: isClosingFrequencyPicker ? 'popOut 0.18s ease-in forwards' : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem' }}>
                              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>Frequency</span>
                              <button type="button" onClick={closeFrequencyPicker} style={{ position: 'absolute', right: '1rem', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                              {FREQ_OPTIONS.map(({ value, label, desc }) => {
                                const isSel = newFrequency === value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => { setNewFrequency(value); closeFrequencyPicker(); }}
                                    style={{
                                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      gap: '0.75rem', padding: '0.8rem 1.125rem',
                                      background: isSel ? 'rgba(141,182,84,0.12)' : 'transparent',
                                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)',
                                      color: isSel ? '#8DB654' : '#f1f1f8',
                                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                                    }}
                                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <div>
                                      <div style={{ fontSize: '0.9rem', fontWeight: isSel ? '600' : '500' }}>{label}</div>
                                      <div style={{ fontSize: '0.75rem', color: isSel ? 'rgba(141,182,84,0.8)' : '#6b6b88', marginTop: '0.1rem' }}>{desc}</div>
                                    </div>
                                    {isSel && <span style={{ color: '#8DB654', fontSize: '1rem', flexShrink: 0 }}>✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assign to
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {/* Unassigned chip */}
                  <button
                    type="button"
                    onClick={() => setNewAssigned('')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      background: newAssigned === '' ? 'rgba(188,155,243,0.18)' : 'rgba(255,255,255,0.06)',
                      border: newAssigned === '' ? '1.5px solid rgba(188,155,243,0.45)' : '1.5px solid rgba(255,255,255,0.12)',
                      borderRadius: '100px',
                      color: newAssigned === '' ? '#BC9BF3' : '#9b9bb8',
                      cursor: 'pointer', fontSize: '0.82rem',
                      fontWeight: newAssigned === '' ? '600' : '500',
                      padding: '0.25rem 0.65rem 0.25rem 0.3rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#8b8ba8', flexShrink: 0 }}>—</div>
                    Anyone
                  </button>

                  {/* Member chips */}
                  {household?.members.map((m, i) => {
                    const isSel = newAssigned === m.user_id;
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => setNewAssigned(m.user_id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.375rem',
                          background: isSel ? 'rgba(188,155,243,0.18)' : 'rgba(255,255,255,0.06)',
                          border: isSel ? '1.5px solid rgba(188,155,243,0.45)' : '1.5px solid rgba(255,255,255,0.12)',
                          borderRadius: '100px',
                          color: isSel ? '#BC9BF3' : '#9b9bb8',
                          cursor: 'pointer', fontSize: '0.82rem',
                          fontWeight: isSel ? '600' : '500',
                          padding: '0.25rem 0.65rem 0.25rem 0.3rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: getAvatarGradient(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '700', color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt={m.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : getInitials(m.display_name)
                          }
                        </div>
                        {m.display_name}{m.user_id === me?.userId ? ' (you)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {addError && <div className="msg-error">{addError}</div>}

              <button
                type="submit"
                disabled={adding}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: '#8DB654', border: 'none', borderRadius: '12px',
                  color: 'white', fontSize: '0.95rem', fontWeight: '600',
                  cursor: adding ? 'not-allowed' : 'pointer',
                  opacity: adding ? 0.7 : 1,
                  marginTop: '0.25rem',
                }}
              >
                {adding ? 'Adding…' : 'Add chore'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ── TODAY tab ── */}
      {activeTab === 'today' && (
        <>
          {/* Progress card */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.125rem' }}>Today&apos;s progress</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {completedToday} of {totalToday} {totalToday === 1 ? 'chore' : 'chores'} done
                </p>
              </div>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: '#8DB654',
                }}
              >
                {progressPct}%
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            {totalToday === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem', textAlign: 'center' }}>
                Add chores for today to start tracking progress!
              </p>
            )}
            {progressPct === 100 && totalToday > 0 && (
              <p style={{ color: '#0d7d72', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center', fontWeight: '600' }}>
                🎉 All done for today — great work everyone!
              </p>
            )}
          </div>

          {/* Today chore list */}
          {pendingTodayChores.length === 0 && !showAddForm && doneTodayChores.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '16px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No chores for today</div>
              <div style={{ fontSize: '0.85rem' }}>Tap the + button below to get started.</div>
            </div>
          )}

          {pendingTodayChores.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
              {pendingTodayChores.map(chore => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  members={household?.members ?? []}
                  currentUserId={me?.userId ?? 0}
                  onComplete={() => handleComplete(chore.id, false)}
                  onAssign={assignedTo => handleAssign(chore.id, assignedTo)}
                  onEdit={updates => handleChoreEdit(chore.id, updates)}
                  onDelete={() => handleDelete(chore.id)}
                />
              ))}
            </div>
          )}

          {doneTodayChores.length > 0 && pendingTodayChores.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              All done for today — check the <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: '#BC9BF3', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', padding: 0 }}>History</button> tab to see completed chores.
            </div>
          )}
        </>
      )}

      {/* ── UPCOMING tab ── */}
      {activeTab === 'upcoming' && (
        <>
          {upcomingGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '16px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No upcoming chores</div>
              <div style={{ fontSize: '0.85rem' }}>Pick a future date when adding a chore to schedule it here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {upcomingGroups.map(({ dateStr, chores: groupChores }) => (
                <div key={dateStr}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {formatGroupDate(dateStr)}
                    </h3>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{groupChores.length} pending</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupChores.map(chore => (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        members={household?.members ?? []}
                        currentUserId={me?.userId ?? 0}
                        onComplete={() => handleComplete(chore.id, false)}
                        onAssign={assignedTo => handleAssign(chore.id, assignedTo)}
                        onEdit={updates => handleChoreEdit(chore.id, updates)}
                        onDelete={() => handleDelete(chore.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY tab ── */}
      {activeTab === 'history' && (
        <>
          {historyGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '16px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🕐</div>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No completed chores yet</div>
              <div style={{ fontSize: '0.85rem' }}>Completed chores will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {historyGroups.map(({ dateStr, chores: groupChores }) => (
                <div key={dateStr}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {formatHistoryGroupDate(dateStr)}
                    </h3>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{groupChores.length} done</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupChores.map(chore => (
                      <button
                        key={chore.id}
                        onClick={() => setHistoryPopupChore(chore)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          background: 'var(--card-bg, rgba(255,255,255,0.04))',
                          border: '1px solid var(--border)',
                          borderRadius: '14px',
                          padding: '0.75rem 0.875rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          opacity: 0.72,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.72')}
                      >
                        {/* Filled checkmark */}
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                          background: '#8DB654',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.65rem', fontWeight: '700',
                        }}>✓</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontWeight: '600', fontSize: '0.9rem',
                            textDecoration: 'line-through',
                            color: 'var(--text-muted)',
                            display: 'block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {chore.title}
                          </span>
                          {chore.completed_by_name && (
                            <span style={{ fontSize: '0.78rem', color: '#0d7d72', fontWeight: '500', marginTop: '0.2rem', display: 'block' }}>
                              ✓ Done by {chore.completed_by === me?.userId ? 'you' : chore.completed_by_name}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── History chore action popup ── */}
      {historyPopupChore && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeHistoryPopup}
            style={{
              position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
              animation: isClosingHistory ? 'backdropFadeOut 0.2s ease-in forwards' : 'backdropFade 0.15s ease',
            }}
          />
          {/* Floating card */}
          <div style={{
            position: 'fixed',
            bottom: `${NAV_H + 16}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 201,
            background: '#252535',
            borderRadius: '20px',
            width: 'min(360px, calc(100vw - 2rem))',
            boxShadow: '0 -8px 48px rgba(0,0,0,0.75)',
            overflow: 'hidden',
            animation: isClosingHistory ? 'popUpOut 0.2s ease-in forwards' : 'popUpIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#3d3d5a' }} />
            </div>

            {/* Header */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 2.5rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#f1f1f8', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {historyPopupChore.title}
              </span>
              <button
                onClick={closeHistoryPopup}
                style={{
                  position: 'absolute', right: '1rem',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  color: '#9b9bb8', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {/* Completed info */}
            {historyPopupChore.completed_by_name && (
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#8b8ba8', fontSize: '0.82rem', textAlign: 'center' }}>
                ✓ Done by {historyPopupChore.completed_by === me?.userId ? 'you' : historyPopupChore.completed_by_name}
                {historyPopupChore.completed_at && (
                  <> · {new Date(historyPopupChore.completed_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button
                onClick={async () => {
                  const id = historyPopupChore.id;
                  closeHistoryPopup();
                  await handleComplete(id, true);
                }}
                style={{
                  width: '100%', padding: '0.875rem',
                  background: '#8DB654',
                  border: 'none', borderRadius: '14px',
                  color: 'white', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: '700',
                }}
              >
                Undo
              </button>
              <button
                onClick={async () => {
                  const id = historyPopupChore.id;
                  closeHistoryPopup();
                  await handleDeleteNoConfirm(id);
                }}
                style={{
                  width: '100%', padding: '0.875rem',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '14px',
                  color: '#ef4444', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: '600',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete chore confirmation popup ── */}
      {deleteConfirmChoreId !== null && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDeleteConfirm}
            style={{
              position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
              animation: isClosingDeleteConfirm ? 'backdropFadeOut 0.2s ease-in forwards' : 'backdropFade 0.15s ease',
            }}
          />
          {/* Floating card */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 201,
            background: '#252535',
            borderRadius: '20px',
            width: 'min(360px, calc(100vw - 2rem))',
            boxShadow: '0 8px 48px rgba(0,0,0,0.75)',
            overflow: 'hidden',
            animation: isClosingDeleteConfirm ? 'modalOut 0.18s ease-in forwards' : 'modalIn 0.2s cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}>
            {/* Header */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 2.5rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#f1f1f8', textAlign: 'center' }}>
                Delete chore?
              </span>
              <button
                onClick={closeDeleteConfirm}
                style={{
                  position: 'absolute', right: '1rem',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  color: '#9b9bb8', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '1rem 1.25rem 0', color: '#8b8ba8', fontSize: '0.88rem', textAlign: 'center' }}>
              Are you sure you want to delete this chore?
            </div>

            {/* Buttons */}
            <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={closeDeleteConfirm}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
                  color: '#c4c4d8', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: '600',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '14px',
                  color: '#ef4444', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: '600',
                }}
              >
                Delete chore
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
