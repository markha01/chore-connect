'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
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
      {/* Content */}
      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.4s ease-out' }}>

        {/* Logo + header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #b5e048 0%, #6aba1a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 12px 40px rgba(141,182,84,0.45)',
            }}
          >
            <Home size={32} color="white" strokeWidth={1.75} />
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em',
            }}
          >
            ChoreConnect
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Fair chores for everyone you live with
          </p>

          {/* Colorful keyword pills */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{
              background: '#b5e048', color: '#1a3a00',
              fontWeight: '700', fontSize: '0.75rem',
              padding: '0.3rem 0.95rem', borderRadius: '100px',
            }}>fair</span>
            <span style={{
              background: '#f472b6', color: '#5a0030',
              fontWeight: '700', fontSize: '0.75rem',
              padding: '0.3rem 0.95rem', borderRadius: '100px',
            }}>together</span>
            <span style={{
              background: '#2dd4bf', color: '#003530',
              fontWeight: '700', fontSize: '0.75rem',
              padding: '0.3rem 0.95rem', borderRadius: '100px',
            }}>simple</span>
          </div>
        </div>

        {/* Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>
            Welcome back
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
                onChange={(e) => setUsername(e.target.value)}
                className="input-dark"
                placeholder="yourname"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
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
                placeholder="••••••••"
                autoComplete="current-password"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <hr className="divider" style={{ margin: '1.25rem 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            New here?{' '}
            <Link
              href="/signup"
              style={{
                color: 'var(--purple)',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
