'use client';

/**
 * Welcome — the first-run tutorial, shown once and only inside the
 * Android APK.
 *
 * v1.4.3: rebuilt as a full-screen onboarding flow (the native pattern)
 * instead of a centered modal. The old card had no height budget — on
 * short viewports it grew past the top and bottom of the screen and the
 * Next button drifted out of reach ("I have to scroll too much"). This
 * layout owns the whole viewport (h-dvh) and divides it into three fixed
 * bands: top bar, center content (the only part that may scroll, and
 * only if a tiny viewport ever demands it), and a bottom action bar that
 * is always on screen. Buttons can never be pushed off.
 *
 * Skip is always one tap away — the tutorial is a courtesy, never a gate.
 * Settings can replay it (replayIntro dispatches pv:replay-intro).
 */

import { useEffect, useState } from 'react';
import { BellPlus, ChevronLeft, ChevronRight, Radar, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { getNativeBridge } from '@/lib/pocketveto/native';

const SEEN_KEY = 'pv.native.welcomed.v1';
const REPLAY_EVENT = 'pv:replay-intro';

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

/** Settings → "Replay the intro": shows the tutorial again, once. */
export function replayIntro(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

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
    const onReplay = () => {
      setStep(0);
      setShow(true);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => {
      alive = false;
      window.removeEventListener(REPLAY_EVENT, onReplay);
    };
  }, []);

  /* While the flow is open, the page behind must not scroll — a modal
     that lets the background drag along feels like a website, not an app. */
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [show]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to PocketVeto"
      className="pv-fade fixed inset-0 z-50 flex h-dvh flex-col bg-ink-950"
    >
      {/* Top bar — brand on the left, skip always one tap away */}
      <div className="flex shrink-0 items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-7 text-signal-400" />
          <span className="font-display text-[15px] font-semibold tracking-tight">PocketVeto</span>
        </div>
        <button
          type="button"
          onClick={done}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-mist-500 transition-colors hover:bg-ink-900 hover:text-mist-200"
          aria-label="Skip the tutorial"
        >
          Skip
        </button>
      </div>

      {/* Center — the only band that may scroll, and only if a tiny
          viewport ever demands it. Buttons live outside it, below. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4 text-center">
        <div key={step} className="pv-rise mx-auto max-w-xs">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-800 bg-ink-925 text-signal-400">
            <s.icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 className="mt-6 font-display text-[22px] font-semibold leading-snug tracking-tight text-mist-100">
            {s.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mist-400">{s.body}</p>
        </div>
      </div>

      {/* Bottom — dots + actions, always on screen */}
      <div className="shrink-0 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 flex max-w-xs justify-center gap-2" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-signal-400' : 'w-1.5 bg-ink-700'
              }`}
            />
          ))}
        </div>
        <div className="mx-auto flex max-w-xs items-center justify-center gap-3">
          {step > 0 ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 shrink-0 rounded-xl border border-ink-800 text-mist-400 hover:bg-ink-900"
              onClick={() => setStep(step - 1)}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
          ) : (
            <span className="h-11 w-11 shrink-0" aria-hidden />
          )}
          {s.action === 'allow' ? (
            <Button
              size="lg"
              className="h-11 flex-1 rounded-xl bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
              onClick={() => {
                getNativeBridge()?.openNotifAccess();
                // They may flip the switch and come back — continue on.
                setStep(step + 1);
              }}
            >
              <BellPlus className="h-4 w-4" aria-hidden /> Allow capture
            </Button>
          ) : last ? (
            <Button
              size="lg"
              className="h-11 flex-1 rounded-xl bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
              onClick={done}
            >
              Start tracking <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-11 flex-1 rounded-xl bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
              onClick={() => setStep(step + 1)}
            >
              Next <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
