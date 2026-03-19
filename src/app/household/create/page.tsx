'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateHouseholdPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ name: string; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      setCreated({ name: data.household.name, inviteCode: data.household.inviteCode });
    } catch {
      setError('Could not connect. Check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!created) return;
    navigator.clipboard.writeText(created.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (created) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.12) 0%, transparent 60%), var(--bg-main)',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.4s ease-out', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            {created.name} is ready!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Share this code with your housemates so they can join.
          </p>

          <div
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(20,184,166,0.12))',
              border: '2px dashed rgba(168,85,247,0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              Invite code
            </div>
            <div
              style={{
                fontSize: '2.25rem',
                fontWeight: '800',
                letterSpacing: '0.25em',
                background: 'linear-gradient(135deg, #a855f7, #14b8a6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'monospace',
              }}
            >
              {created.inviteCode}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ marginBottom: '0.75rem' }}
          >
            {copied ? '✓ Copied!' : 'Copy code'}
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary"
          >
            Go to my household →
          </button>
        </div>
      </main>
    );
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
            style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            ← Back
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.375rem' }}>
            Name your household
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Pick something everyone will recognise.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label
                htmlFor="name"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Household name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark"
                placeholder="The Sunny Street House"
                maxLength={60}
                required
              />
            </div>

            {error && <div className="msg-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create household'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
