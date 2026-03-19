'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Member {
  user_id: number;
  display_name: string;
  username: string;
  role: string;
}

interface Household {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  members: Member[];
}

interface Chore {
  id: number;
  title: string;
  description: string | null;
  assigned_to: number | null;
  assigned_display_name: string | null;
  is_complete: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  completed_at: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
}

interface Me {
  userId: number;
  username: string;
  displayName: string;
  household: { id: number; name: string; inviteCode: string; role: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#a855f7', '#ec4899'],
  ['#14b8a6', '#6366f1'],
  ['#f59e0b', '#ec4899'],
  ['#6366f1', '#14b8a6'],
  ['#ec4899', '#f59e0b'],
  ['#14b8a6', '#a855f7'],
];

function getAvatarGradient(index: number): string {
  const [a, b] = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add chore form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigned, setNewAssigned] = useState<number | ''>('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  // Invite code
  const [showInvite, setShowInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Sign out
  const [signingOut, setSigningOut] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [meRes, householdRes, choresRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/household'),
        fetch('/api/chores'),
      ]);

      if (!meRes.ok) {
        router.push('/');
        return;
      }

      const meData: Me = await meRes.json();
      setMe(meData);

      if (!meData.household) {
        router.push('/household');
        return;
      }

      const householdData = await householdRes.json();
      if (householdData.household) {
        setHousehold(householdData.household);
      }

      if (choresRes.ok) {
        const choresData = await choresRes.json();
        setChores(choresData.chores ?? []);
      }
    } catch {
      setError('Could not load your household. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? 'Could not add chore.');
        return;
      }

      setNewTitle('');
      setNewDesc('');
      setNewAssigned('');
      setShowAddForm(false);
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
    } catch {
      // silent — user can retry
    }
  }

  async function handleAssign(choreId: number, assignedTo: number | null) {
    try {
      await fetch(`/api/chores/${choreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', assignedTo }),
      });
      await fetchAll();
    } catch {
      // silent
    }
  }

  async function handleDelete(choreId: number) {
    if (!confirm('Remove this chore?')) return;
    try {
      await fetch(`/api/chores/${choreId}`, { method: 'DELETE' });
      await fetchAll();
    } catch {
      // silent
    }
  }

  function copyInviteCode() {
    if (!household) return;
    navigator.clipboard.writeText(household.inviteCode).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    });
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const totalChores = chores.length;
  const completedChores = chores.filter((c) => c.is_complete).length;
  const progressPct = totalChores === 0 ? 0 : Math.round((completedChores / totalChores) * 100);

  const pendingChores = chores.filter((c) => !c.is_complete);
  const doneChores = chores.filter((c) => c.is_complete);

  const memberStats = household?.members.map((m, i) => {
    const assigned = chores.filter((c) => c.assigned_to === m.user_id);
    const done = assigned.filter((c) => c.is_complete);
    return { ...m, assigned: assigned.length, done: done.length, colorIndex: i };
  }) ?? [];

  // ── Loading / error states ────────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }}>⟳</div>
          <div>Loading your household…</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>😕</div>
          <div className="msg-error" style={{ marginBottom: '1rem' }}>{error}</div>
          <button className="btn-secondary" onClick={() => { setError(''); setLoading(true); fetchAll(); }} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '3rem' }}>
      {/* Header */}
      <header
        style={{
          background: 'rgba(17,17,32,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🏠</span>
            <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
              {household?.name ?? 'My Household'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setShowInvite((s) => !s)}
              className="btn-ghost"
              style={{ fontSize: '0.8rem' }}
              title="Invite people"
            >
              + Invite
            </button>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: getAvatarGradient(0),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: 'white',
                flexShrink: 0,
              }}
            >
              {getInitials(me?.displayName ?? '?')}
            </div>
            <button
              onClick={handleSignOut}
              className="btn-ghost"
              style={{ fontSize: '0.8rem' }}
              disabled={signingOut}
            >
              {signingOut ? '…' : 'Sign out'}
            </button>
          </div>
        </div>

        {/* Invite code panel */}
        {showInvite && (
          <div
            style={{
              borderTop: '1px solid var(--border)',
              background: 'rgba(10,10,18,0.95)',
              padding: '1rem 1.25rem',
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Share this code with your housemates
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    letterSpacing: '0.2em',
                    fontFamily: 'monospace',
                    background: 'linear-gradient(135deg, #a855f7, #14b8a6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {household?.inviteCode}
                </div>
              </div>
              <button
                onClick={copyInviteCode}
                className="btn-secondary"
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {copiedInvite ? '✓ Copied!' : 'Copy code'}
              </button>
            </div>
          </div>
        )}
      </header>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>

        {/* Progress section */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.125rem' }}>
                Household progress
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {completedChores} of {totalChores} {totalChores === 1 ? 'chore' : 'chores'} done
              </p>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {progressPct}%
            </div>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {totalChores === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem', textAlign: 'center' }}>
              Add your first chore below to get started!
            </p>
          )}
          {progressPct === 100 && totalChores > 0 && (
            <p style={{ color: '#5eead4', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center', fontWeight: '600' }}>
              🎉 All done — great work everyone!
            </p>
          )}
        </div>

        {/* Members */}
        {memberStats.length > 0 && (
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>
              Who&apos;s doing what
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {memberStats.map((m) => {
                const pct = m.assigned === 0 ? 0 : Math.round((m.done / m.assigned) * 100);
                return (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div
                      className="avatar"
                      style={{
                        width: '38px',
                        height: '38px',
                        background: getAvatarGradient(m.colorIndex),
                        fontSize: '0.75rem',
                        color: 'white',
                      }}
                    >
                      {getInitials(m.display_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.display_name}
                          {m.user_id === me?.userId && (
                            <span style={{ color: 'var(--text-muted)', fontWeight: '400', marginLeft: '0.375rem', fontSize: '0.8rem' }}>
                              (you)
                            </span>
                          )}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {m.done}/{m.assigned}
                        </span>
                      </div>
                      <div className="progress-bar" style={{ height: '6px' }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chores list */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>Chores</h2>
          <button
            onClick={() => { setShowAddForm((s) => !s); setAddError(''); }}
            style={{
              background: showAddForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: showAddForm ? '1px solid var(--border)' : 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              padding: '0.4rem 0.875rem',
              transition: 'opacity 0.2s',
            }}
          >
            {showAddForm ? '✕ Cancel' : '+ Add chore'}
          </button>
        </div>

        {/* Add chore form */}
        {showAddForm && (
          <div className="card" style={{ marginBottom: '1rem', animation: 'slideUp 0.2s ease-out' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem' }}>New chore</h3>
            <form onSubmit={handleAddChore} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  What needs doing?
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
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
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input-dark"
                  placeholder="Under the couch too"
                  maxLength={200}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assign to
                </label>
                <select
                  value={newAssigned}
                  onChange={(e) => setNewAssigned(e.target.value ? Number(e.target.value) : '')}
                  className="input-dark"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Unassigned — anyone can pick it up</option>
                  {household?.members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}{m.user_id === me?.userId ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {addError && <div className="msg-error">{addError}</div>}

              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button type="submit" className="btn-primary" disabled={adding} style={{ flex: 1 }}>
                  {adding ? 'Adding…' : 'Add chore'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pending chores */}
        {pendingChores.length === 0 && !showAddForm && doneChores.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--text-muted)',
              border: '2px dashed var(--border)',
              borderRadius: '16px',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No chores yet</div>
            <div style={{ fontSize: '0.85rem' }}>Hit &ldquo;+ Add chore&rdquo; to get started.</div>
          </div>
        )}

        {pendingChores.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
            {pendingChores.map((chore) => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                members={household?.members ?? []}
                currentUserId={me?.userId ?? 0}
                onComplete={() => handleComplete(chore.id, false)}
                onAssign={(assignedTo) => handleAssign(chore.id, assignedTo)}
                onDelete={() => handleDelete(chore.id)}
              />
            ))}
          </div>
        )}

        {/* Completed chores */}
        {doneChores.length > 0 && (
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Done ({doneChores.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {doneChores.map((chore) => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  members={household?.members ?? []}
                  currentUserId={me?.userId ?? 0}
                  onComplete={() => handleComplete(chore.id, true)}
                  onAssign={(assignedTo) => handleAssign(chore.id, assignedTo)}
                  onDelete={() => handleDelete(chore.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── ChoreCard component ────────────────────────────────────────────────────────

function ChoreCard({
  chore,
  members,
  currentUserId,
  onComplete,
  onAssign,
  onDelete,
}: {
  chore: Chore;
  members: Member[];
  currentUserId: number;
  onComplete: () => void;
  onAssign: (assignedTo: number | null) => void;
  onDelete: () => void;
}) {
  const [showAssign, setShowAssign] = useState(false);

  const AVATAR_COLORS = [
    ['#a855f7', '#ec4899'],
    ['#14b8a6', '#6366f1'],
    ['#f59e0b', '#ec4899'],
    ['#6366f1', '#14b8a6'],
    ['#ec4899', '#f59e0b'],
    ['#14b8a6', '#a855f7'],
  ];

  function getAvatarGradient(index: number): string {
    const [a, b] = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }

  const assignedMemberIndex = members.findIndex((m) => m.user_id === chore.assigned_to);

  return (
    <div
      className="card-sm"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        opacity: chore.is_complete ? 0.65 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Complete toggle */}
      <button
        onClick={onComplete}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: chore.is_complete ? 'none' : '2px solid var(--border)',
          background: chore.is_complete ? 'linear-gradient(135deg, #14b8a6, #6366f1)' : 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: '1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.65rem',
          fontWeight: '700',
          transition: 'all 0.2s',
        }}
        title={chore.is_complete ? 'Mark as not done' : 'Mark as done'}
      >
        {chore.is_complete ? '✓' : ''}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span
            style={{
              fontWeight: '600',
              fontSize: '0.9rem',
              textDecoration: chore.is_complete ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: chore.is_complete ? 'var(--text-muted)' : 'var(--text-primary)',
            }}
          >
            {chore.title}
          </span>
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              padding: '0 0.25rem',
              lineHeight: 1,
              flexShrink: 0,
              opacity: 0.6,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.6')}
            title="Remove chore"
          >
            ✕
          </button>
        </div>

        {chore.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: 1.4 }}>
            {chore.description}
          </p>
        )}

        {/* Assignment row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {chore.assigned_to ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: getAvatarGradient(assignedMemberIndex >= 0 ? assignedMemberIndex : 0),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.55rem',
                  fontWeight: '700',
                  color: 'white',
                }}
              >
                {chore.assigned_display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {chore.assigned_to === currentUserId ? 'You' : chore.assigned_display_name}
              </span>
            </div>
          ) : (
            <span
              className="badge"
              style={{
                background: 'rgba(245,158,11,0.12)',
                color: '#fcd34d',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              Unassigned
            </span>
          )}

          {!chore.is_complete && (
            <button
              onClick={() => setShowAssign((s) => !s)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#a855f7';
                (e.currentTarget as HTMLButtonElement).style.color = '#a855f7';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              {showAssign ? 'Cancel' : 'Reassign'}
            </button>
          )}

          {chore.is_complete && chore.completed_by_name && (
            <span style={{ fontSize: '0.78rem', color: '#5eead4' }}>
              ✓ Done by {chore.completed_by === currentUserId ? 'you' : chore.completed_by_name}
            </span>
          )}
        </div>

        {/* Assign dropdown */}
        {showAssign && (
          <div style={{ marginTop: '0.5rem', animation: 'slideUp 0.15s ease-out' }}>
            <select
              defaultValue={chore.assigned_to ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                onAssign(val);
                setShowAssign(false);
              }}
              className="input-dark"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', cursor: 'pointer' }}
            >
              <option value="">Remove assignment</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}{m.user_id === currentUserId ? ' (you)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
