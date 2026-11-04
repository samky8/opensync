'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
export function AuthForm({
  mode,
  google,
}: {
  mode: 'login' | 'signup' | 'reset' | 'update';
  google: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error');
    if (error) setError(error);
  }, []);
  async function send(op: string, data: Record<string, string> = {}) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, ...data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      if (result.url) location.href = result.url;
      else if (result.message) setMessage(result.message);
      else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Link href="/" className="brand">
          <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
        </Link>
        <div>
          <span className="eyebrow">A LITTLE LESS ADMIN. A LOT MORE BUSINESS.</span>
          <h1>
            Your time belongs
            <br />
            to your business.
          </h1>
          <p>
            Keep your hours and updates in sync.
            <br />
            Get back to the things you opened for.
          </p>
          <div className="auth-quote">“One update. Everywhere your customers look.”</div>
        </div>
        <small>Thoughtfully built for independent businesses.</small>
      </aside>
      <main className="auth-panel">
        <Link className="back-link" href="/">
          ← Back to OpenSync
        </Link>
        <div className="auth-form">
          <span className="eyebrow">WELCOME TO OPENSYNC</span>
          <h2>
            {mode === 'signup'
              ? 'Make yourself at home.'
              : mode === 'login'
                ? 'Good to see you again.'
                : mode === 'reset'
                  ? 'Let’s get you back in.'
                  : 'Choose a new password.'}
          </h2>
          <p className="muted">
            {mode === 'signup'
              ? 'Start free. No credit card, no complicated setup.'
              : mode === 'login'
                ? 'Sign in to keep your customers in the know.'
                : 'Use a strong password with at least 12 characters.'}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void send(mode, {
                email: String(data.get('email') || ''),
                password: String(data.get('password') || ''),
              });
            }}
          >
            {mode !== 'update' && (
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@yourbusiness.com"
                  required
                />
              </label>
            )}
            {mode !== 'reset' && (
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  minLength={12}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="At least 12 characters"
                  required
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
            <Button disabled={busy} className="full">
              {busy
                ? 'Please wait…'
                : mode === 'signup'
                  ? 'Create your free account'
                  : mode === 'login'
                    ? 'Sign in'
                    : mode === 'reset'
                      ? 'Send reset link'
                      : 'Save password'}
              <ArrowRight size={17} />
            </Button>
          </form>
          {google && (
            <Button
              className="full"
              variant="outline"
              disabled={busy}
              onClick={() => send('google')}
            >
              Continue with Google
            </Button>
          )}
          <div className="auth-links">
            {mode === 'login' ? (
              <>
                <Link href="/reset-password">Forgot password?</Link>
                <span>
                  New here? <Link href="/signup">Create an account</Link>
                </span>
              </>
            ) : (
              <Link href="/login">Already have an account? Sign in</Link>
            )}
          </div>
          <p className="fineprint">
            By creating an account you agree to our <Link href="/terms">Terms</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
