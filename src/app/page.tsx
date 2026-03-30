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
        background: 'linear-gradient(145deg, #1b0a3e 0%, #2a1060 35%, #0e1f4a 70%, #061228 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative SVG shapes */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Large lime-green blob — lower left, bleeds off corner */}
        <path
          d="M 10,560 C 80,535 170,565 210,600 C 250,635 225,745 190,790 C 160,825 30,820 -20,800 C -80,780 -90,720 -60,680 C -30,640 -30,585 10,560 Z"
          fill="#96d420" opacity="0.45"
        />
        {/* Pink blob — upper right, bleeds off corner */}
        <path
          d="M 280,40 C 320,20 380,-25 410,-10 C 445,10 455,50 440,80 C 425,110 415,175 390,200 C 365,225 275,185 250,140 C 225,95 250,60 280,40 Z"
          fill="#f06da8" opacity="0.42"
        />
        {/* Small teal blob — lower right */}
        <path
          d="M 330,560 C 362,543 404,552 420,578 C 436,604 430,648 408,666 C 386,684 350,680 332,656 C 314,632 308,577 330,560 Z"
          fill="#1bbfad" opacity="0.4"
        />
        {/* Small lavender blob — upper left */}
        <path
          d="M 22,76 C 57,60 102,73 112,110 C 122,147 106,190 68,200 C 30,210 -8,188 -16,150 C -24,112 -13,92 22,76 Z"
          fill="#b490f0" opacity="0.35"
        />
      </svg>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.4s ease-out', position: 'relative', zIndex: 1 }}>

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
