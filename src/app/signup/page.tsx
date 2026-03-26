'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push('/household');
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
              boxShadow: '0 8px 32px rgba(141,182,84,0.4)',
            }}
          >
            <Home size={30} color="white" strokeWidth={1.75} />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: '#8DB654',
              marginBottom: '0.375rem',
            }}
          >
            ChoreConnect
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Create your account to get started
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>
            Create your account
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label
                htmlFor="displayName"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Your name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-dark"
                placeholder="Alex Johnson"
                autoComplete="name"
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                This is what your housemates will see.
              </p>
            </div>

            <div>
              <label
                htmlFor="username"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="input-dark"
                placeholder="alexj"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Letters, numbers, and underscores only.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirm"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-dark"
                placeholder="Same password again"
                autoComplete="new-password"
                required
              />
            </div>

            {error && <div className="msg-error">{error}</div>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '0.25rem' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <hr className="divider" style={{ margin: '1.25rem 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link
              href="/"
              style={{ color: 'var(--purple)', fontWeight: '600', textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
