'use client';

/**
 * Welcome — the first-run tutorial, shown once and only inside the
 * Android APK. A phone app should open like an app; the one-time
 * intro earns the capture permission and explains the loop in three
 * quiet cards. Skip is always one tap away — the tutorial is a
 * courtesy, never a gate.
 */

import { useEffect, useState } from 'react';
import { BellPlus, Radar, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { getNativeBridge } from '@/lib/pocketveto/native';

const SEEN_KEY = 'pv.native.welcomed.v1';

const STEPS = [
  {
    icon: Radar,
    title: 'Every money date, one radar',
    body: 'Trials, renewals, warranties, gift cards, APR windows — plotted as blips closing in, with alerts before the money moves.',
  },
  {
    icon: BellPlus,
    title: 'Flip one switch',
    body: 'Allow “Notification access” once and payment notifications — PhonePe, GPay, Paytm, banks — land in the Scan tab as ready-to-track cards. On this phone only; nothing is uploaded.',
    action: 'allow' as const,
  },
  {
    icon: ScanLine,
    title: 'Review, track, veto',
    body: 'Captured payments are parsed on-device into review cards — or add a date by hand. Veto before the charge posts and watch the saved ledger grow.',
  },
];

export function Welcome() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Client-only, once per install — and off the sync effect scope
    // (house pattern), so the first run paints no extra render cascade.
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (!alive) return;
      if (!('PocketVetoNative' in window)) return;
      try {
        if (localStorage.getItem(SEEN_KEY)) return;
      } catch {
        return;
      }
      setShow(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  function done() {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* private mode et al — worst case it shows again next launch */
    }
    setShow(false);
  }

  if (!show) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop recipe (empirically pinned, v1.4.1 — see the note in
         globals.css): the blur lives inside its own isolated stacking
         subtree; the card is a sibling fixed element OUTSIDE that subtree,
         never a normal-flow child of a full-screen wrapper — that combo
         blurs the card into the backdrop in Chromium (black frame). */}
      <div className="fixed inset-0 z-50 isolate" aria-hidden>
        <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
      </div>
      {/* transparent click-catcher (below the card, above the blur) */}
      <div className="fixed inset-0 z-50" onClick={done} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to PocketVeto"
        className="pv-pop fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ink-800 bg-ink-925 p-6 shadow-2xl shadow-black/50"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="h-6 w-6 text-signal-400" />
            <span className="font-display text-[15px] font-semibold tracking-tight">PocketVeto</span>
          </div>
          <button
            type="button"
            onClick={done}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist-500 transition-colors hover:bg-ink-900 hover:text-mist-200"
            aria-label="Skip the tutorial"
          >
            Skip <X className="h-3 w-3" aria-hidden />
          </button>
        </div>

        <div key={step} className="pv-rise">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-800 bg-ink-950 text-signal-400">
            <s.icon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-mist-100">
            {s.title}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-mist-400">{s.body}</p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-5 bg-signal-400' : 'w-1.5 bg-ink-700'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="ghost" className="text-mist-400" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {s.action === 'allow' ? (
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                onClick={() => {
                  getNativeBridge()?.openNotifAccess();
                  // They may flip the switch and come back — continue on.
                  setStep(step + 1);
                }}
              >
                Allow capture
              </Button>
            ) : last ? (
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                onClick={done}
              >
                Start tracking
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
