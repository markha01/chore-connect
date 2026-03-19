'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinHouseholdPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Could not connect. Check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

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
      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.4s ease-out' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/household"
            style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}
          >
            ← Back
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔑</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.375rem' }}>
            Join a household
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter the 6-character code your housemate shared with you.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label
                htmlFor="code"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Invite code
              </label>
              <input
                id="code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="input-dark"
                placeholder="ABC123"
                maxLength={6}
                autoCapitalize="characters"
                style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.25rem', fontWeight: '700', fontFamily: 'monospace' }}
                required
              />
            </div>

            {error && <div className="msg-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading || inviteCode.length < 3}>
              {loading ? 'Joining…' : 'Join household'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
