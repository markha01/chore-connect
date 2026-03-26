'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ───────────────────────────────────────────────────────────────────────

interface Member {
  user_id: number;
  display_name: string;
  username: string;
  role: string;
  avatar_url?: string | null;
}

type Frequency = 'once' | 'daily' | 'every-other-day' | 'weekly' | 'every-other-week' | 'monthly';

// ── Date helpers ────────────────────────────────────────────────────────────────

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayStr(): string {
  return dateToStr(new Date());
}

function formatDisplayDate(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === dateToStr(tomorrow)) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return dateToStr(d);
}

// ── Avatar helpers ──────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  '#7C3AED', '#0F766E', '#B45309', '#BE185D', '#1D4ED8', '#15803D',
  '#9333EA', '#0369A1', '#C2410C', '#6D28D9', '#047857',
  '#1E40AF', '#9D174D', '#92400E', '#0E7490',
];

function getAvatarGradient(index: number): string {
  return MEMBER_COLORS[((index % MEMBER_COLORS.length) + MEMBER_COLORS.length) % MEMBER_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Frequency offsets ───────────────────────────────────────────────────────────

const FREQUENCY_OFFSETS: Record<string, number[]> = {
  once: [],
  daily: [1, 2, 3, 4, 5, 6, 7],
  'every-other-day': [2, 4, 6, 8, 10, 12, 14],
  weekly: [7, 14, 21, 28],
  'every-other-week': [14, 28, 42, 56],
  monthly: [30, 60, 90],
};

// ── DatePickerCalendar ──────────────────────────────────────────────────────────

function DatePickerCalendar({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}) {
  const todayStr = getTodayStr();
  const parsed = value ? value.split('-').map(Number) : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed[0] : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed[1] - 1 : new Date().getMonth());
  const [pendingDate, setPendingDate] = useState(value || todayStr);
  const [isClosing, setIsClosing] = useState(false);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function triggerClose(confirm: boolean) {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      if (confirm) onChange(pendingDate);
      onClose();
    }, 180);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(d: number) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    setPendingDate(`${viewYear}-${m}-${day}`);
  }

  const isPendingToday = pendingDate === todayStr;

  return (
    <>
      <div
        onClick={() => triggerClose(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          animation: isClosing ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201, background: '#252535', borderRadius: '20px',
        width: 'min(340px, calc(100vw - 2rem))',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75)', overflow: 'hidden',
        animation: isClosing ? 'popOut 0.18s ease-in forwards' : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem' }}>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>When?</span>
          <button type="button" onClick={() => triggerClose(false)} style={{ position: 'absolute', right: '1rem', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <button type="button" onClick={() => { setPendingDate(todayStr); const now = new Date(); setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.125rem', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', color: '#f1f1f8', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500', textAlign: 'left', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: '1rem' }}>⭐</span>
          <span>Today</span>
          {isPendingToday && <span style={{ marginLeft: 'auto', color: '#BC9BF3', fontSize: '1rem' }}>✓</span>}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem 0.375rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '1.3rem', padding: '0.25rem 0.5rem', lineHeight: 1 }}>‹</button>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f1f8' }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '1.3rem', padding: '0.25rem 0.5rem', lineHeight: 1 }}>›</button>
        </div>

        <div style={{ padding: '0 0.875rem 0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.125rem' }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: '600', color: '#5a5a78', padding: '0.25rem 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const cellStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isToday = cellStr === todayStr;
              const isSelected = cellStr === pendingDate;
              return (
                <button key={i} type="button" className="day-btn" onClick={() => selectDay(d)}
                  style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none', background: isSelected ? '#8DB654' : 'transparent', color: isSelected ? 'white' : isToday ? '#BC9BF3' : '#d4d4e8', cursor: 'pointer', fontSize: '0.88rem', fontWeight: isSelected || isToday ? '700' : '400', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s, transform 0.1s', position: 'relative' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(188,155,243,0.18)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {isToday && !isSelected && <span style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#BC9BF3' }} />}
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '0.5rem 0.875rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button type="button" onClick={() => triggerClose(true)}
            style={{ width: '100%', padding: '0.8rem', background: '#8DB654', border: 'none', borderRadius: '14px', color: 'white', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '700', transition: 'opacity 0.15s, transform 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >Done</button>
        </div>
      </div>
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function NewChorePage() {
  const router = useRouter();

  const [me, setMe] = useState<{ userId: number; displayName: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState(getTodayStr);
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [assigned, setAssigned] = useState<number | ''>('');

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    async function load() {
      const [meRes, householdRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/household'),
      ]);
      if (meRes.ok) setMe(await meRes.json());
      if (householdRes.ok) {
        const data = await householdRes.json();
        setMembers(data.household?.members ?? []);
      }
    }
    load();
  }, []);

  function handleBack() {
    setIsExiting(true);
    setTimeout(() => router.back(), 200);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || undefined,
          assignedTo: assigned || null,
          dueDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not add chore.'); return; }

      const offsets = FREQUENCY_OFFSETS[frequency] ?? [];
      for (const offset of offsets) {
        await fetch('/api/chores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: desc.trim() || undefined,
            assignedTo: assigned || null,
            dueDate: addDays(dueDate, offset),
          }),
        });
      }

      setIsExiting(true);
      setTimeout(() => router.push('/dashboard'), 200);
    } catch {
      setError('Could not connect. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const LABEL_STYLE: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    marginBottom: '0.375rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  };

  const FIELD_STYLE: React.CSSProperties = {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        flexDirection: 'column',
        animation: isExiting
          ? 'pageOut 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'
          : 'pageIn 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          background: 'var(--bg-main)',
          borderBottom: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0 0.5rem',
          height: '54px',
          flexShrink: 0,
        }}
      >
        {/* Back button — left column */}
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            padding: '0.5rem 0.75rem',
            borderRadius: '10px',
            transition: 'color 0.15s, background 0.15s',
            justifySelf: 'start',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        {/* Centered title — middle column */}
        <h1
          style={{
            fontSize: '1rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Create a new task
        </h1>

        {/* Save button — right column */}
        <button
          type="submit"
          form="new-chore-form"
          disabled={saving || !title.trim()}
          style={{
            background: 'none',
            border: 'none',
            color: saving || !title.trim() ? 'var(--text-muted)' : '#8DB654',
            cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            padding: '0.5rem 0.75rem',
            borderRadius: '10px',
            transition: 'color 0.15s, opacity 0.15s',
            justifySelf: 'end',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      {/* ── Form ── */}
      <form
        id="new-chore-form"
        onSubmit={handleSave}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        {/* Title */}
        <div style={{ ...FIELD_STYLE, paddingTop: '1.25rem' }}>
          <label htmlFor="chore-title" style={LABEL_STYLE}>What needs doing?</label>
          <input
            id="chore-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-dark"
            placeholder="Vacuum the living room"
            maxLength={100}
            required
            autoFocus
          />
        </div>

        {/* Notes */}
        <div style={FIELD_STYLE}>
          <label htmlFor="chore-desc" style={LABEL_STYLE}>Extra notes (optional)</label>
          <input
            id="chore-desc"
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="input-dark"
            placeholder="Under the couch too"
            maxLength={200}
          />
        </div>

        {/* Date */}
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Date</label>
          <button
            type="button"
            onClick={() => setShowDatePicker(true)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
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
            <span style={{ fontWeight: '500' }}>{formatDisplayDate(dueDate)}</span>
          </button>
          {showDatePicker && (
            <DatePickerCalendar
              value={dueDate}
              onChange={val => { setDueDate(val); setShowDatePicker(false); }}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </div>

        {/* Frequency */}
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Frequency</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {([
              { value: 'once', label: 'Once' },
              { value: 'daily', label: 'Daily' },
              { value: 'every-other-day', label: 'Every other day' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'every-other-week', label: 'Every other week' },
              { value: 'monthly', label: 'Every month' },
            ] as const).map(({ value, label }) => {
              const isSel = frequency === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFrequency(value)}
                  style={{
                    background: isSel ? '#8DB654' : 'rgba(255,255,255,0.06)',
                    border: isSel ? 'none' : '1.5px solid var(--border)',
                    borderRadius: '100px',
                    color: isSel ? 'white' : 'var(--text-muted)',
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

        {/* Assign to */}
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Assign to</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {/* Unassigned chip */}
            <button
              type="button"
              onClick={() => setAssigned('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: assigned === '' ? 'rgba(188,155,243,0.18)' : 'rgba(255,255,255,0.06)',
                border: assigned === '' ? '1.5px solid rgba(188,155,243,0.45)' : '1.5px solid var(--border)',
                borderRadius: '100px',
                color: assigned === '' ? '#BC9BF3' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: assigned === '' ? '600' : '500',
                padding: '0.25rem 0.65rem 0.25rem 0.3rem',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#8b8ba8', flexShrink: 0 }}>—</div>
              Anyone
            </button>

            {/* Member chips */}
            {members.map((m, i) => {
              const isSel = assigned === m.user_id;
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setAssigned(m.user_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: isSel ? 'rgba(188,155,243,0.18)' : 'rgba(255,255,255,0.06)',
                    border: isSel ? '1.5px solid rgba(188,155,243,0.45)' : '1.5px solid var(--border)',
                    borderRadius: '100px',
                    color: isSel ? '#BC9BF3' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
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

        {error && (
          <div style={{ padding: '0 1.25rem' }}>
            <div className="msg-error" style={{ marginTop: '1rem' }}>{error}</div>
          </div>
        )}
      </form>
    </main>
  );
}
