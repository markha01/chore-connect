'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Me, Household, Chore } from './types';
import ChoresView from './ChoresView';
import BulletinView from './BulletinView';
import SettingsView from './SettingsView';

const NAV_H = 64;
const HEADER_H = 48;

// ── Nav icons ──────────────────────────────────────────────────────────────────

function IconChores({ active }: { active: boolean }) {
  const color = active ? '#BC9BF3' : '#8b8ba8';
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconBoard({ active }: { active: boolean }) {
  const color = active ? '#BC9BF3' : '#8b8ba8';
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  const color = active ? '#BC9BF3' : '#8b8ba8';
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

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

      {/* Views */}
      {activeView === 'chores' && (
        <ChoresView me={me} household={household} chores={chores} fetchAll={fetchAll} />
      )}

      {activeView === 'bulletin' && (
        <BulletinView me={me} household={household} isActive={activeView === 'bulletin'} />
      )}

      {activeView === 'settings' && (
        <SettingsView me={me} household={household} fetchAll={fetchAll} />
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
                color: isActive ? '#BC9BF3' : 'var(--text-muted)',
                padding: '0.5rem 0',
              }}
            >
              <Icon active={isActive} />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: isActive ? '700' : '500',
                  letterSpacing: '0.01em',
                  color: isActive ? '#BC9BF3' : 'var(--text-muted)',
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
