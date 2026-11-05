'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Gift, LoaderCircle, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';
import { ProBadge } from './ui/pro-badge';
import { proTrialFeatures, type ProTrial } from '@/lib/trial';

export function ProTrialCard({
  trial,
  canClaim,
  demo,
  onClaim,
  onPlans,
}: {
  trial: ProTrial;
  canClaim: boolean;
  demo: boolean;
  onClaim: () => Promise<ProTrial>;
  onPlans: () => void;
}) {
  const [claiming, setClaiming] = useState(false);
  const [celebration, setCelebration] = useState<ProTrial | null>(null);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const plansButton = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!celebration) return;
    const element = dialog.current;
    const returnFocus = plansButton.current;
    element?.showModal();
    return () => {
      element?.close();
      returnFocus?.focus();
    };
  }, [celebration]);
  if (trial.status === 'unavailable') return null;
  const endLabel = (value: string) =>
    new Intl.DateTimeFormat('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  async function claim() {
    if (inFlight.current) return;
    inFlight.current = true;
    setClaiming(true);
    setError('');
    try {
      const [result] = await Promise.all([
        onClaim(),
        new Promise<void>((resolve) => setTimeout(resolve, 650)),
      ]);
      setCelebration(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not start your trial. Please try again.',
      );
    } finally {
      inFlight.current = false;
      setClaiming(false);
    }
  }
  return (
    <>
      <section
        className={`pro-trial-card ${trial.status === 'active' ? 'is-active' : ''}`}
        aria-label="Pro trial"
      >
        <span className="pro-trial-gift" aria-hidden="true">
          <Gift size={25} />
        </span>
        <div className="pro-trial-copy">
          <span className="eyebrow">
            {demo
              ? 'DEMO PREVIEW'
              : trial.status === 'active'
                ? 'PRO UNLOCKED'
                : 'A LITTLE EXTRA, ON US'}
          </span>
          <h3>
            {trial.status === 'active'
              ? 'Your Pro trial is active'
              : trial.status === 'expired'
                ? 'Your Pro trial has ended'
                : 'Try all of Pro. Free for 14 days.'}
          </h3>
          <p>
            {trial.status === 'active' && trial.endsAt
              ? `Full Pro access until ${endLabel(trial.endsAt)}. No automatic charge.`
              : trial.status === 'expired'
                ? 'You’re back on Free. Choose Pro to keep using its features.'
                : 'Schedule announcements, customise your widgets, and explore every Pro feature.'}
          </p>
          {trial.status === 'available' && (
            <small>
              {canClaim
                ? 'No card required. No automatic charge.'
                : 'Ask your workspace owner to activate the trial.'}
            </small>
          )}
        </div>
        {trial.status === 'available' || claiming ? (
          <Button
            className={`pro-trial-claim ${claiming ? 'is-claiming' : ''}`}
            onClick={() => void claim()}
            disabled={!canClaim || claiming}
            aria-busy={claiming}
          >
            {claiming ? (
              <LoaderCircle size={18} className="trial-spinner" />
            ) : (
              <Sparkles size={18} />
            )}
            {claiming ? 'Unlocking Pro…' : demo ? 'Preview free trial' : 'Claim 14 days free'}
          </Button>
        ) : (
          <Button ref={plansButton} variant="outline" onClick={onPlans}>
            View plans <ArrowRight size={16} />
          </Button>
        )}
        {error && (
          <p className="form-error trial-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {celebration && (
        <dialog
          ref={dialog}
          className="modal trial-celebration"
          aria-labelledby="trial-welcome-title"
          aria-describedby="trial-welcome-description"
          onCancel={() => setCelebration(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setCelebration(null);
          }}
        >
          <button
            className="modal-close icon-button"
            aria-label="Close trial welcome"
            onClick={() => setCelebration(null)}
          >
            <X size={20} />
          </button>
          <div className="trial-confetti" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    '--i': i,
                    '--x': `${(i * 37) % 100}%`,
                    '--turn': `${i * 47}deg`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="trial-welcome-icon">
            <Sparkles size={34} />
          </div>
          <span className="eyebrow">{demo ? 'TRIAL PREVIEW' : 'WELCOME TO PRO'}</span>
          <h2 id="trial-welcome-title">
            {demo ? 'This is your Pro welcome!' : 'Congratulations! Pro is yours.'}
          </h2>
          <p id="trial-welcome-description">
            {demo
              ? 'This is a demo preview. Create an account to claim your real 14-day trial.'
              : 'Your 14 days of full Pro access start now. Here’s what you can enjoy:'}
          </p>
          <ul className="trial-feature-list">
            {proTrialFeatures.map((feature, index) => (
              <li key={feature}>
                {index < 2 ? <ProBadge /> : <Check size={17} />}
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <p className="trial-integration-note">
            Google Business Profile connection is included. Automatic Google delivery is currently
            paused.
          </p>
          <div className="trial-expiry-note">
            {!demo && celebration.endsAt && (
              <strong>Free until {endLabel(celebration.endsAt)}.</strong>
            )}{' '}
            No card required, no automatic charge. Choose a paid plan to continue after your trial.
          </div>
          <Button className="trial-explore" onClick={() => setCelebration(null)}>
            Let’s explore Pro <ArrowRight size={17} />
          </Button>
        </dialog>
      )}
    </>
  );
}
