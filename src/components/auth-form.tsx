'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { SignupBackdrop } from './signup-backdrop';
import { Button } from './ui/button';
export function AuthForm({
  mode,
  google,
}: {
  mode: 'login' | 'signup' | 'reset' | 'update';
  google: boolean;
}) {
  const hasStoryBackdrop = mode === 'login' || mode === 'signup';
  const router = useRouter();
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [showPassword, setShowPassword] = useState(false);
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
    <div className={`auth-layout${hasStoryBackdrop ? ' auth-layout-story-backdrop' : ''}`}>
      <aside className="auth-story">
        {hasStoryBackdrop && <SignupBackdrop />}
        <Link href="/" className="brand auth-story-content">
          <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
        </Link>
        <div className="auth-story-content">
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
        <small className="auth-story-content">
          Thoughtfully built for independent businesses.
        </small>
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
              <div className="auth-field-group">
                <label className="auth-field">
                  <span className="auth-field-label">Email address</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={254}
                    required
                  />
                </label>
                <div className="auth-field-meta">
                  <span>Enter your email address</span>
                  <span aria-live="polite">{email.length}/254</span>
                </div>
              </div>
            )}
            {mode !== 'reset' && (
              <div className="auth-field-group">
                <label className="auth-field">
                  <span className="auth-field-label">Password</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </label>
                <div className="auth-field-meta">
                  <span>Use at least 12 characters</span>
                  <span aria-live="polite">{password.length}/128</span>
                </div>
              </div>
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
              onClick={() => void send('google')}
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
