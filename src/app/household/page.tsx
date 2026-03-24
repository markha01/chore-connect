'use client';

import { useRouter } from 'next/navigation';

export default function HouseholdPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--bg-main)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', animation: 'fadeIn 0.4s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: '#8DB654',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.75rem',
              boxShadow: '0 8px 32px rgba(141,182,84,0.4)',
            }}
          >
            🏡
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.375rem' }}>
            Set up your household
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Start fresh or join a household that someone already made.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Create */}
          <button
            onClick={() => router.push('/household/create')}
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#a855f7';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(141,182,84,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Start a new household
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Give it a name and get a shareable invite code for your housemates.
                </div>
              </div>
            </div>
          </button>

          {/* Join */}
          <button
            onClick={() => router.push('/household/join')}
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#14b8a6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(141,182,84,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                }}
              >
                🔑
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Join an existing household
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Enter the invite code that a housemate shared with you.
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}
