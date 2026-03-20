'use client';

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
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
  due_date: string | null;
}

interface Me {
  userId: number;
  username: string;
  displayName: string;
  household: { id: number; name: string; inviteCode: string; role: string } | null;
}

interface Message {
  id: number;
  user_id: number;
  display_name: string;
  content: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayStr(): string {
  return dateToStr(new Date());
}

function formatDisplayDate(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (dateStr === dateToStr(tomorrowDate)) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatGroupDate(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (dateStr === dateToStr(tomorrowDate)) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatHistoryGroupDate(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (dateStr === dateToStr(yesterdayDate)) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return dateToStr(d);
}

// Offsets (in days) for each frequency beyond the base occurrence
const FREQUENCY_OFFSETS: Record<string, number[]> = {
  once: [],
  daily: [1, 2, 3, 4, 5, 6, 7],
  'every-other-day': [2, 4, 6, 8, 10, 12, 14],
  weekly: [7, 14, 21, 28],
  'every-other-week': [14, 28, 42, 56],
  monthly: [30, 60, 90],
};

function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────

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
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function getMembersLabel(members: Member[]): string {
  if (members.length === 0) return '';
  if (members.length === 1) return members[0].display_name;
  if (members.length === 2) return `${members[0].display_name} and ${members[1].display_name}`;
  if (members.length === 3) return `${members[0].display_name}, ${members[1].display_name}, and ${members[2].display_name}`;
  return `${members[0].display_name}, ${members[1].display_name}, and ${members.length - 2} others`;
}

// ── DatePickerCalendar component (Things-style floating card) ──────────────────

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
      {/* Backdrop */}
      <div
        onClick={() => triggerClose(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          animation: isClosing ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
        }}
      />

      {/* Floating centered card */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: '#252535',
        borderRadius: '20px',
        width: 'min(340px, calc(100vw - 2rem))',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        overflow: 'hidden',
        animation: isClosing
          ? 'popOut 0.18s ease-in forwards'
          : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* Header: "When?" centred + ✕ */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem' }}>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>When?</span>
          <button
            type="button"
            onClick={() => triggerClose(false)}
            style={{
              position: 'absolute',
              right: '1rem',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#9b9bb8',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ⭐ Today quick row */}
        <button
          type="button"
          onClick={() => {
            setPendingDate(todayStr);
            const now = new Date();
            setViewYear(now.getFullYear());
            setViewMonth(now.getMonth());
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.125rem',
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            color: '#f1f1f8',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500',
            textAlign: 'left',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: '1rem' }}>⭐</span>
          <span>Today</span>
          {isPendingToday && (
            <span style={{ marginLeft: 'auto', color: '#a855f7', fontSize: '1rem' }}>✓</span>
          )}
        </button>

        {/* Month navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 0.875rem 0.375rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{ background: 'none', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '1.3rem', padding: '0.25rem 0.5rem', lineHeight: 1 }}
          >‹</button>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f1f8' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            style={{ background: 'none', border: 'none', color: '#9b9bb8', cursor: 'pointer', fontSize: '1.3rem', padding: '0.25rem 0.5rem', lineHeight: 1 }}
          >›</button>
        </div>

        {/* Calendar grid */}
        <div style={{ padding: '0 0.875rem 0.75rem' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.125rem' }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: '600', color: '#5a5a78', padding: '0.25rem 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const cellStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isToday = cellStr === todayStr;
              const isSelected = cellStr === pendingDate;
              return (
                <button
                  key={i}
                  type="button"
                  className="day-btn"
                  onClick={() => selectDay(d)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: 'none',
                    background: isSelected
                      ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                      : 'transparent',
                    color: isSelected ? 'white' : isToday ? '#a855f7' : '#d4d4e8',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: isSelected || isToday ? '700' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.12s, transform 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,85,247,0.18)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {isToday && !isSelected && (
                    <span style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#a855f7' }} />
                  )}
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer: Done */}
        <div style={{ padding: '0.5rem 0.875rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            type="button"
            onClick={() => triggerClose(true)}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              borderRadius: '14px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '700',
              letterSpacing: '0.01em',
              transition: 'opacity 0.15s, transform 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ── Nav icons ──────────────────────────────────────────────────────────────────

function IconChores({ active }: { active: boolean }) {
  const color = active ? '#a855f7' : '#8b8ba8';
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconBoard({ active }: { active: boolean }) {
  const color = active ? '#a855f7' : '#8b8ba8';
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  const color = active ? '#a855f7' : '#8b8ba8';
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  // Core data
  const [me, setMe] = useState<Me | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Navigation
  const [activeView, setActiveView] = useState<'chores' | 'bulletin' | 'settings'>('chores');

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

  // Settings
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Bulletin board
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

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
      if (householdData.household) setHousehold(householdData.household);

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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (activeView === 'bulletin') {
      fetchMessages();
    }
  }, [activeView, fetchMessages]);

  // Scroll to bottom when messages update in bulletin view
  useEffect(() => {
    if (activeView === 'bulletin' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages, activeView]);

  // ── Handlers ─────────────────────────────────────────────────────────────

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
      const todayStr = getTodayStr();
      setActiveTab(newDueDate > todayStr ? 'upcoming' : 'today');
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

  async function handleDelete(choreId: number) {
    if (!confirm('Remove this chore?')) return;
    try {
      await fetch(`/api/chores/${choreId}`, { method: 'DELETE' });
      await fetchAll();
    } catch { /* silent */ }
  }

  async function handleDeleteNoConfirm(choreId: number) {
    try {
      await fetch(`/api/chores/${choreId}`, { method: 'DELETE' });
      await fetchAll();
    } catch { /* silent */ }
  }

  function copyInviteCode() {
    if (!household) return;
    navigator.clipboard.writeText(household.inviteCode).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    });
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || sendingMessage) return;

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
    if (!confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch { /* silent */ }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

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

  const memberStats = household?.members.map((m, i) => {
    const assigned = chores.filter(c => c.assigned_to === m.user_id);
    const done = assigned.filter(c => c.is_complete);
    return { ...m, assigned: assigned.length, done: done.length, colorIndex: i };
  }) ?? [];

  function getMemberColorIndex(userId: number): number {
    const idx = household?.members.findIndex(m => m.user_id === userId) ?? -1;
    return idx >= 0 ? idx : 0;
  }

  function closeAssignPicker() {
    setIsClosingAssignPicker(true);
    setTimeout(() => { setShowAssignPicker(false); setIsClosingAssignPicker(false); }, 200);
  }

  function closeHistoryPopup() {
    setIsClosingHistory(true);
    setTimeout(() => { setHistoryPopupChore(null); setIsClosingHistory(false); }, 200);
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
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

  const NAV_H = 64;
  const HEADER_H = 48;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>

      {/* Slim sticky header */}
      <header
        style={{
          height: `${HEADER_H}px`,
          background: 'rgba(17,17,32,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.25rem',
          gap: '0.5rem',
        }}
      >
        <span key={activeView} style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', animation: 'headerTitleIn 0.2s ease', flex: 1, textAlign: 'center' }}>
          {{ chores: 'Chores', bulletin: 'Messages', settings: 'Settings' }[activeView]}
        </span>
      </header>

      {/* ══ CHORES VIEW ══════════════════════════════════════════════════════ */}
      {activeView === 'chores' && (
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            padding: `1rem 1.25rem calc(${NAV_H}px + 1.5rem)`,
            animation: 'viewFadeIn 0.22s ease',
          }}
        >
          {/* Tabs + Add chore — very top */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
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
                      background: isActive ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
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

            {activeTab !== 'history' && (
              <button
                onClick={() => { setShowAddForm(s => !s); setAddError(''); }}
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
                  flexShrink: 0,
                }}
              >
                {showAddForm ? '✕ Cancel' : '+ Add chore'}
              </button>
            )}
          </div>

          {/* Add chore form */}
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
                            background: isSel ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(0,0,0,0.05)',
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
                              background: pendingAssigned === '' ? 'rgba(168,85,247,0.15)' : 'transparent',
                              border: 'none', borderRadius: '10px',
                              color: pendingAssigned === '' ? '#a855f7' : '#8b8ba8',
                              cursor: 'pointer', fontSize: '0.95rem',
                              fontWeight: pendingAssigned === '' ? '600' : '400',
                              textAlign: 'left', transition: 'background 0.12s',
                            }}
                          >
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#8b8ba8', flexShrink: 0 }}>
                              —
                            </div>
                            <span>Unassigned</span>
                            {pendingAssigned === '' && <span style={{ marginLeft: 'auto', color: '#a855f7', fontSize: '1rem' }}>✓</span>}
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
                                  background: isActive ? 'rgba(168,85,247,0.15)' : 'transparent',
                                  border: 'none', borderRadius: '10px',
                                  color: isActive ? '#a855f7' : '#f1f1f8',
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
                                {isActive && <span style={{ marginLeft: 'auto', color: '#a855f7', fontSize: '1rem', flexShrink: 0 }}>✓</span>}
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
                            style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}
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
                      onDelete={() => handleDelete(chore.id)}
                    />
                  ))}
                </div>
              )}

              {doneTodayChores.length > 0 && pendingTodayChores.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  All done for today — check the <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', padding: 0 }}>History</button> tab to see completed chores.
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
                              background: 'linear-gradient(135deg, #14b8a6, #6366f1)',
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
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)',
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
        </div>
      )}

      {/* ══ BULLETIN BOARD VIEW ══════════════════════════════════════════════ */}
      {activeView === 'bulletin' && (
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
                      border: m.user_id === me?.userId ? '2px solid #a855f7' : '2px solid transparent',
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
                      style={{
                        background: isOwn
                          ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.2))'
                          : 'rgba(255,255,255,0.06)',
                        border: isOwn ? '1px solid rgba(168,85,247,0.3)' : '1px solid var(--border)',
                        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '0.5rem 0.875rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        lineHeight: '1.45',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
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

                      {isOwn && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.35rem',
                            borderRadius: '6px',
                            opacity: 0.5,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
                          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.5')}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div
            style={{
              flexShrink: 0,
              borderTop: '1px solid var(--border)',
              padding: '0.75rem 1.25rem',
              background: 'rgba(17,17,32,0.8)',
            }}
          >
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
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
                  background: messageInput.trim() ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.06)',
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
                {sendingMessage ? '…' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ SETTINGS VIEW ════════════════════════════════════════════════════ */}
      {activeView === 'settings' && (
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            padding: `1.5rem 1.25rem calc(${NAV_H}px + 1.5rem)`,
            animation: 'viewFadeIn 0.22s ease',
          }}
        >
          {/* Profile card */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                className="avatar"
                style={{ width: '56px', height: '56px', background: getAvatarGradient(getMemberColorIndex(me?.userId ?? 0)), fontSize: '1.1rem', color: 'white', flexShrink: 0 }}
              >
                {getInitials(me?.displayName ?? '?')}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>{me?.displayName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{me?.username}</div>
                {me?.household?.role === 'owner' && (
                  <span className="badge" style={{ background: 'rgba(168,85,247,0.1)', color: '#7c3aed', border: '1px solid rgba(168,85,247,0.25)', marginTop: '0.3rem', display: 'inline-block' }}>
                    Owner
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Household card */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏠</span> {household?.name}
            </h2>

            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                Invite code
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: '800',
                    letterSpacing: '0.25em',
                    fontFamily: 'monospace',
                    background: 'linear-gradient(135deg, #a855f7, #14b8a6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.2,
                  }}
                >
                  {household?.inviteCode}
                </span>
                <button
                  onClick={copyInviteCode}
                  style={{
                    background: copiedInvite ? 'rgba(20,184,166,0.12)' : 'rgba(168,85,247,0.1)',
                    border: copiedInvite ? '1.5px solid rgba(20,184,166,0.4)' : '1.5px solid rgba(168,85,247,0.35)',
                    borderRadius: '10px',
                    color: copiedInvite ? '#0d7d72' : '#7c3aed',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: '0.4rem 0.9rem',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedInvite ? '✓ Copied!' : 'Copy code'}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                Share this with housemates so they can join
              </p>
            </div>

            {/* Members list */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.625rem' }}>
                Members ({household?.members.length ?? 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {household?.members.map((m, i) => (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div className="avatar" style={{ width: '32px', height: '32px', background: getAvatarGradient(i), fontSize: '0.65rem', color: 'white' }}>
                      {getInitials(m.display_name)}
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                      {m.display_name}
                      {m.user_id === me?.userId && <span style={{ color: 'var(--text-muted)', fontWeight: '400', marginLeft: '0.3rem' }}>(you)</span>}
                    </span>
                    {m.role === 'owner' && (
                      <span className="badge" style={{ background: 'rgba(168,85,247,0.08)', color: '#7c3aed', border: '1px solid rgba(168,85,247,0.2)', marginLeft: 'auto' }}>
                        Owner
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(239,68,68,0.08)',
              border: '1.5px solid rgba(239,68,68,0.25)',
              borderRadius: '12px',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.14)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)')}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}

      {/* ══ BOTTOM NAVBAR ════════════════════════════════════════════════════ */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${NAV_H}px`,
          background: 'rgba(11,11,22,0.97)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 50,
        }}
      >
        {(
          [
            { key: 'chores', label: 'Chores', Icon: IconChores },
            { key: 'bulletin', label: 'Messages', Icon: IconBoard },
            { key: 'settings', label: 'Settings', Icon: IconSettings },
          ] as const
        ).map(({ key, label, Icon }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              className="nav-btn"
              onClick={() => setActiveView(key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#a855f7' : 'var(--text-muted)',
                padding: '0.5rem 0',
              }}
            >
              <Icon active={isActive} />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: isActive ? '700' : '500',
                  letterSpacing: '0.01em',
                  color: isActive ? '#a855f7' : 'var(--text-muted)',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
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
  const [closingAssign, setClosingAssign] = useState(false);

  function closeAssign() {
    setClosingAssign(true);
    setTimeout(() => { setShowAssign(false); setClosingAssign(false); }, 180);
  }

  const CARD_COLORS = [
    ['#a855f7', '#ec4899'],
    ['#14b8a6', '#6366f1'],
    ['#f59e0b', '#ec4899'],
    ['#6366f1', '#14b8a6'],
    ['#ec4899', '#f59e0b'],
    ['#14b8a6', '#a855f7'],
  ];

  function cardGradient(index: number): string {
    const [a, b] = CARD_COLORS[index % CARD_COLORS.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }

  const assignedMemberIndex = members.findIndex(m => m.user_id === chore.assigned_to);

  return (
    <div
      className="card-sm"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        opacity: chore.is_complete ? 0.65 : 1,
        transition: 'opacity 0.2s',
        position: 'relative',
      }}
    >
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
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.6')}
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

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {chore.assigned_to ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: cardGradient(assignedMemberIndex >= 0 ? assignedMemberIndex : 0),
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
              <span className="badge" style={{ background: 'rgba(180,83,9,0.08)', color: '#92400e', border: '1px solid rgba(180,83,9,0.2)' }}>
                Unassigned
              </span>
            )}

            {!chore.is_complete && (
              <button
                onClick={() => setShowAssign(true)}
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
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#a855f7';
                  (e.currentTarget as HTMLButtonElement).style.color = '#a855f7';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                Reassign
              </button>
            )}

            {chore.is_complete && chore.completed_by_name && (
              <span style={{ fontSize: '0.78rem', color: '#0d7d72', fontWeight: '500' }}>
                ✓ Done by {chore.completed_by === currentUserId ? 'you' : chore.completed_by_name}
              </span>
            )}
          </div>

          {/* Reassign popup */}
          {showAssign && (
            <>
              {/* Backdrop */}
              <div
                onClick={closeAssign}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 200,
                  background: 'rgba(0,0,0,0.6)',
                  animation: closingAssign ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
                }}
              />
              {/* Floating centered card */}
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 201,
                background: '#252535',
                borderRadius: '20px',
                width: 'min(340px, calc(100vw - 2rem))',
                boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
                overflow: 'hidden',
                animation: closingAssign ? 'popOut 0.18s ease-in forwards' : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                {/* Header */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>Reassign</span>
                  <button
                    type="button"
                    onClick={closeAssign}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: '#9b9bb8',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Options list */}
                <div style={{ padding: '0 0.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', maxHeight: '50vh' }}>
                  {/* Unassign option */}
                  <button
                    type="button"
                    onClick={() => { onAssign(null); closeAssign(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 0.625rem',
                      background: !chore.assigned_to ? 'rgba(168,85,247,0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      color: !chore.assigned_to ? '#a855f7' : '#8b8ba8',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: !chore.assigned_to ? '600' : '400',
                      textAlign: 'left',
                      transition: 'background 0.12s',
                      marginTop: '0.5rem',
                    }}
                    onMouseEnter={e => { if (chore.assigned_to) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (chore.assigned_to) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', color: '#8b8ba8', flexShrink: 0,
                    }}>
                      —
                    </div>
                    <span>Unassigned</span>
                    {!chore.assigned_to && <span style={{ marginLeft: 'auto', color: '#a855f7', fontSize: '1rem' }}>✓</span>}
                  </button>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.25rem 0.625rem' }} />

                  {/* Member options */}
                  {members.map((m, i) => {
                    const isActive = chore.assigned_to === m.user_id;
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => { onAssign(m.user_id); closeAssign(); }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 0.625rem',
                          background: isActive ? 'rgba(168,85,247,0.15)' : 'transparent',
                          border: 'none',
                          borderRadius: '10px',
                          color: isActive ? '#a855f7' : '#f1f1f8',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: isActive ? '600' : '400',
                          textAlign: 'left',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: cardGradient(i),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: '700', color: 'white', flexShrink: 0,
                        }}>
                          {getInitials(m.display_name)}
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.display_name}{m.user_id === currentUserId ? ' (you)' : ''}
                        </span>
                        {isActive && <span style={{ marginLeft: 'auto', color: '#a855f7', fontSize: '1rem', flexShrink: 0 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
