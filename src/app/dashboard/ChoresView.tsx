'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  // Chores tab
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'history'>('today');

  // Add chore form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigned, setNewAssigned] = useState<number | ''>('');
  const [newDueDate, setNewDueDate] = useState(getTodayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newFrequency, setNewFrequency] = useState<'once' | 'daily' | 'every-other-day' | 'weekly' | 'every-other-week' | 'monthly'>('once');
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [isClosingAssignPicker, setIsClosingAssignPicker] = useState(false);
  const [pendingAssigned, setPendingAssigned] = useState<number | ''>('');

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
  const totalToday = todayChores.length;
  const completedToday = doneTodayChores.length;
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

  function closeAssignPicker() {
    setIsClosingAssignPicker(true);
    setTimeout(() => { setShowAssignPicker(false); setIsClosingAssignPicker(false); }, 200);
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
      setShowAssignPicker(false);
      setPendingAssigned('');
      setShowAddForm(false);
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
                onClick={() => { setActiveTab(tab); setShowAddForm(false); }}
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
          onClick={() => router.push('/dashboard/chores/new')}
          style={{
            position: 'fixed',
            bottom: `${NAV_H + 20}px`,
            right: '20px',
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

      {/* Add chore form — replaced by /dashboard/chores/new page */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem' }}>New chore</h3>
          <form onSubmit={handleAddChore} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                What needs doing?
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="input-dark"
                placeholder="Vacuum the living room"
                maxLength={100}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Extra notes (optional)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="input-dark"
                placeholder="Under the couch too"
                maxLength={200}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Date
              </label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.04)',
                  border: '1.5px solid #d5cfbf',
                  borderRadius: '10px',
                  color: '#1a1827',
                  fontSize: '0.9rem',
                  padding: '0.625rem 0.875rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'border-color 0.2s',
                }}
              >
                <span>📅</span>
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
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Frequency
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {([
                  { value: 'once', label: 'Once' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'every-other-day', label: 'Every other day' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'every-other-week', label: 'Every other week' },
                  { value: 'monthly', label: 'Every month' },
                ] as const).map(({ value, label }) => {
                  const isSel = newFrequency === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewFrequency(value)}
                      style={{
                        background: isSel ? '#8DB654' : 'rgba(0,0,0,0.05)',
                        border: isSel ? 'none' : '1.5px solid #d5cfbf',
                        borderRadius: '100px',
                        color: isSel ? 'white' : '#6b6882',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: isSel ? '600' : '500',
                        padding: '0.3rem 0.75rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Assign to
              </label>
              {/* Trigger button — same style as the date picker */}
              <button
                type="button"
                onClick={() => { setPendingAssigned(newAssigned); setShowAssignPicker(true); }}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.04)',
                  border: '1.5px solid #d5cfbf',
                  borderRadius: '10px',
                  color: '#1a1827',
                  fontSize: '0.9rem',
                  padding: '0.625rem 0.875rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'border-color 0.2s',
                }}
              >
                {newAssigned ? (() => {
                  const idx = household?.members.findIndex(m => m.user_id === newAssigned) ?? 0;
                  const member = household?.members.find(m => m.user_id === newAssigned);
                  return (
                    <>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: getAvatarGradient(idx >= 0 ? idx : 0), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                        {getInitials(member?.display_name ?? '?')}
                      </div>
                      <span style={{ fontWeight: '500' }}>
                        {member?.display_name}{newAssigned === me?.userId ? ' (you)' : ''}
                      </span>
                    </>
                  );
                })() : (
                  <span style={{ color: '#9b95aa' }}>Unassigned — anyone can pick it up</span>
                )}
                <span style={{ marginLeft: 'auto', color: '#9b95aa', fontSize: '0.7rem' }}>▾</span>
              </button>

              {/* Mobile bottom-sheet popup */}
              {showAssignPicker && (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={closeAssignPicker}
                    style={{
                      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
                      animation: isClosingAssignPicker ? 'backdropFadeOut 0.2s ease-in forwards' : 'backdropFade 0.15s ease',
                    }}
                  />
                  {/* Sheet */}
                  <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 201,
                    background: '#252535',
                    borderRadius: '20px 20px 0 0',
                    boxShadow: '0 -12px 48px rgba(0,0,0,0.75)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: isClosingAssignPicker ? 'sheetDownOut 0.2s ease-in forwards' : 'sheetUpIn 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
                  }}>
                    {/* Drag handle */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
                      <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
                    </div>

                    {/* Header */}
                    <div style={{ padding: '0.5rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#f1f1f8' }}>Assign to</h3>
                    </div>

                    {/* Options list */}
                    <div style={{ padding: '0.5rem', overflowY: 'auto', maxHeight: '45vh' }}>
                      {/* Unassigned */}
                      <button
                        type="button"
                        onClick={() => setPendingAssigned('')}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 0.625rem',
                          background: pendingAssigned === '' ? 'rgba(188,155,243,0.15)' : 'transparent',
                          border: 'none', borderRadius: '10px',
                          color: pendingAssigned === '' ? '#BC9BF3' : '#8b8ba8',
                          cursor: 'pointer', fontSize: '0.95rem',
                          fontWeight: pendingAssigned === '' ? '600' : '400',
                          textAlign: 'left', transition: 'background 0.12s',
                        }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#8b8ba8', flexShrink: 0 }}>
                          —
                        </div>
                        <span>Unassigned</span>
                        {pendingAssigned === '' && <span style={{ marginLeft: 'auto', color: '#BC9BF3', fontSize: '1rem' }}>✓</span>}
                      </button>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.25rem 0.625rem' }} />

                      {household?.members.map((m, i) => {
                        const isActive = pendingAssigned === m.user_id;
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => setPendingAssigned(m.user_id)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.75rem 0.625rem',
                              background: isActive ? 'rgba(188,155,243,0.15)' : 'transparent',
                              border: 'none', borderRadius: '10px',
                              color: isActive ? '#BC9BF3' : '#f1f1f8',
                              cursor: 'pointer', fontSize: '0.95rem',
                              fontWeight: isActive ? '600' : '400',
                              textAlign: 'left', transition: 'background 0.12s',
                            }}
                          >
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getAvatarGradient(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                              {getInitials(m.display_name)}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.display_name}{m.user_id === me?.userId ? ' (you)' : ''}
                            </span>
                            {isActive && <span style={{ marginLeft: 'auto', color: '#BC9BF3', fontSize: '1rem', flexShrink: 0 }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer — Cancel + Done */}
                    <div style={{ padding: '0.75rem 1.25rem 2rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={closeAssignPicker}
                        style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#8b8ba8', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewAssigned(pendingAssigned); closeAssignPicker(); }}
                        style={{ flex: 1, padding: '0.75rem', background: '#8DB654', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {addError && <div className="msg-error">{addError}</div>}

            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? 'Adding…' : 'Add chore'}
            </button>
          </form>
        </div>
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
              <div style={{ fontSize: '0.85rem' }}>Hit &ldquo;+ Add chore&rdquo; to get started.</div>
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
