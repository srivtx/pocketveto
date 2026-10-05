'use client';

/**
 * PocketVeto — landing page. The hook is loss aversion with receipts:
 * every stat below carries its source, per the product's honesty rules.
 *
 * Design: quiet mission control. Display type (Space Grotesk) carries the
 * voice, mono carries the data, one signal color carries the intent.
 */

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Calculator, EyeOff, HardDriveDownload, Landmark, Radar, ScanLine, ServerOff, UserX, X, Crosshair, Share2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadarChart } from './RadarChart';
import { Logo } from './Logo';
import { InstallButton } from './InstallButton';
import { Reveal, useCountUp } from './motion';
import { APK_LATEST_URL, isAndroidBrowser } from '@/lib/pocketveto/platform';
import type { ItemView } from '@/lib/pocketveto/types';

/** Smooth-scroll to a landing section WITHOUT touching the hash — the hash
 *  belongs to the route (landing vs app), and hashchanges scroll-fight. */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

/** The reel — a 1px signal hairline tracking reading progress under the
 *  sticky nav. scaleX only (GPU), rAF-throttled, purely functional. */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute bottom-[-1px] left-0 h-px w-full origin-left scale-x-0 bg-signal-400/70"
    />
  );
}

function demoBlip(id: string, kind: ItemView['kind'], name: string, days: number, cost: number): ItemView {
  const now = new Date().toISOString();
  return {
    id,
    kind,
    name,
    costAtStake: cost,
    start: now.slice(0, 10),
    end: now.slice(0, 10),
    recurrence: 'once',
    autoAdvance: false,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    daysLeft: days,
    urgency: days <= 2 ? 'critical' : days <= 7 ? 'warning' : days <= 30 ? 'headsUp' : 'clear',
    lapsedCycles: 0,
    annualized: 0,
  };
}

const DEMO: ItemView[] = [
  demoBlip('d1', 'trial', 'Adobe trial', 1, 66),
  demoBlip('d2', 'subscription', 'Gym membership', 4, 45),
  demoBlip('d3', 'promo', '0% APR window', 9, 1200),
  demoBlip('d4', 'giftcard', 'Gift card', 16, 75),
  demoBlip('d5', 'warranty', 'Dishwasher warranty', 26, 899),
  demoBlip('d6', 'document', 'Passport (6-mo rule)', 41, 165),
];

const STATS: { value: number; format: (n: number) => string; label: string; src: string }[] = [
  {
    value: 23,
    format: (n) => `$${Math.round(n)}B`,
    label: 'sitting in unused gift cards — 47% of US adults hold one',
    src: 'DealNews survey, 2023',
  },
  {
    value: 90,
    format: (n) => `$${Math.round(n)}/mo`,
    label: 'average subscription spend per person',
    src: 'Ohio State Univ. extension, 2025',
  },
  {
    value: 80,
    format: (n) => `${Math.round(n)}%`,
    label: 'of store cards with 0% APR carry deferred interest',
    src: 'WalletHub study via CNBC, Dec 2025',
  },
  {
    value: 62,
    format: (n) => `${Math.round(n)}%`,
    label: 'of consumers waste money on subs they forgot to cancel',
    src: 'Hiatus consumer survey',
  },
];

const FEATURES = [
  {
    icon: Radar,
    title: 'Every money date, one radar',
    body: 'Free trials, subscriptions, memberships, warranties, gift cards, 0% APR windows, passports, IDs, domains — every date your money moves, plotted on one live radar. Paste a statement and the scanner finds your autopays for you.',
  },
  {
    icon: ScanLine,
    title: 'Autopay detection, without the bank link',
    body: 'Share a payment notification from any app straight into PocketVeto, or paste a bank/card export — the on-device detector finds charges that repeat, with cadence, next charge date and a confidence score. One tap turns each into a tracked date. The text never leaves your device.',
  },
  {
    icon: Crosshair,
    title: 'A $-at-risk ticker, not a budget',
    body: 'PocketVeto shows what you are about to LOSE: a live sum of the money at stake across all your dates, annualized run-rate of what renews, and what fires within 7 days. Losses hurt about twice as much as gains feel good — we count the losses.',
  },
  {
    icon: Calculator,
    title: 'The 0% APR cliff calculator',
    body: 'Deferred interest charges retroactively on the ORIGINAL balance if you miss the payoff by even a dollar. PocketVeto computes the monthly payment that clears the cliff — and estimates the damage if you don\u2019t.',
  },
  {
    icon: HardDriveDownload,
    title: 'Local-first. Actually.',
    body: 'No account. No bank linkage. No server. Your data lives in your browser\u2019s storage and never leaves your device — the only way it moves is your own Export button. Inspectable open source under MIT.',
  },
  {
    icon: Bell,
    title: 'Alerts before the money moves',
    body: 'T-7, T-2 and day-of alerts while the app or its background worker runs — plus a \u201Cwhile you were away\u201D review every time you open it. Installable as an app (PWA) on phone and desktop, works offline.',
  },
];

const ABSENCES = [
  { icon: UserX, label: 'No account', sub: 'nothing to create' },
  { icon: Landmark, label: 'No bank credentials', sub: 'no logins, ever' },
  { icon: EyeOff, label: 'No analytics', sub: 'zero telemetry' },
  { icon: ServerOff, label: 'No server', sub: 'nowhere to phone home' },
  { icon: BellOff, label: 'No push vendor', sub: 'nobody reads your dates' },
];

/** Android-strip — “you're on a phone, get the app that auto-detects.”
 * Only in Android browsers (never the APK itself, never desktop),
 * dismissible, stays dismissed. Hydration-safe: flips in an effect. */
function AndroidStrip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // async gap (house pattern): state lands outside the sync effect scope
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (!alive) return;
      if (!isAndroidBrowser()) return;
      if ('PocketVetoNative' in window) return;
      if (window.matchMedia('(display-mode: standalone)').matches) return;
      try {
        if (localStorage.getItem('pv.android.strip.dismissed')) return;
      } catch {
        /* show it — a broken storage read is not a reason to hide */
      }
      setShow(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  if (!show) return null;
  return (
    <div className="pv-rise border-b border-signal-500/25 bg-signal-400/[0.07]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <p className="flex min-w-0 flex-1 items-center gap-2.5 text-[13px] leading-snug text-signal-200">
          <Smartphone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>
            You&apos;re on Android — the PocketVeto app installs in one tap and
            auto-detects payments from your notifications.
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={APK_LATEST_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-signal-400 px-3.5 py-1.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-signal-300"
          >
            Get the APK
          </a>
          <button
            type="button"
            onClick={() => {
              setShow(false);
              try {
                localStorage.setItem('pv.android.strip.dismissed', '1');
              } catch {
                /* non-fatal */
              }
            }}
            className="rounded-md p-1.5 text-signal-300/60 transition-colors hover:bg-signal-400/10 hover:text-signal-200"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ stat, delay }: { stat: (typeof STATS)[number]; delay: number }) {
  const n = useCountUp(stat.value, 1100);
  return (
    <Reveal delay={delay}>
      <p className="pv-num text-3xl font-semibold tracking-tight text-signal-400 md:text-4xl">
        {stat.format(n)}
      </p>
      <p className="mt-2 text-sm leading-snug text-mist-300">{stat.label}</p>
      <p className="mt-1.5 text-[11px] text-mist-500">{stat.src}</p>
    </Reveal>
  );
}

/** SweepBand — the footer's only decoration, the customs-style crafted
 * edge in PocketVeto's language: one signal hairline passing under the
 * content, fading at both ends, with three hand-placed blips — the last
 * one cliff-red, a charge caught at the line. Static paint, tokens only. */
function SweepBand() {
  return (
    <div className="relative h-6" aria-hidden>
      <svg viewBox="0 0 1600 24" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-signal-400">
        <defs>
          <linearGradient id="ft-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.5" stopColor="currentColor" stopOpacity="0.45" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="12" x2="1600" y2="12" stroke="url(#ft-sweep)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <circle cx="412" cy="12" r="2.5" fill="currentColor" opacity="0.4" />
        <circle cx="984" cy="12" r="3.5" fill="currentColor" opacity="0.7" />
        <circle cx="1318" cy="12" r="2.5" fill="#ff6367" opacity="0.6" />
      </svg>
    </div>
  );
}

/** Footer — customs-clean: a brand column (mark, one © line, the source
 * pill), quiet link columns, and a single honest line at the bottom.
 * A footer says where things are; it does not repeat the site. */
function Footer({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <footer className="mt-auto">
      <SweepBand />
      <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-8 sm:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* brand column */}
          <div className="flex shrink-0 flex-col lg:w-[240px]">
            <div className="flex items-center gap-2.5">
              <Logo className="h-6 w-6 text-signal-400" />
              <span className="font-display text-[15px] font-semibold leading-none tracking-tight">
                PocketVeto
              </span>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-mist-500">
              © 2026 PocketVeto · MIT
              <br />
              An organizational tool, not financial advice.
            </p>
            <div className="mt-5 lg:mt-auto lg:pt-6">
              <a
                href="https://github.com/srivtx/pocketveto"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-ink-800 py-1.5 pl-2.5 pr-3 text-[11px] font-medium text-mist-500 transition-colors hover:border-ink-700 hover:text-mist-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-400"
              >
                <svg aria-hidden className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                srivtx/pocketveto
              </a>
            </div>
          </div>

          {/* quiet link columns */}
          <nav className="flex flex-1 flex-wrap gap-x-14 gap-y-8" aria-label="footer">
            <div className="flex flex-col">
              <span className="mb-1.5 text-[13px] font-medium text-mist-300">Product</span>
              <div className="flex flex-col items-start gap-1">
                <button type="button" onClick={onOpenApp} className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">Open the app</button>
                <button type="button" onClick={() => scrollToSection('problem')} className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">The problem</button>
                <button type="button" onClick={() => scrollToSection('features')} className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">Features</button>
                <button type="button" onClick={() => scrollToSection('privacy')} className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">Privacy</button>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="mb-1.5 text-[13px] font-medium text-mist-300">Source</span>
              <div className="flex flex-col items-start gap-1">
                <a href="https://github.com/srivtx/pocketveto/issues" target="_blank" rel="noreferrer" className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">Issues</a>
                <a href="https://github.com/srivtx/pocketveto/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">Contributing</a>
                <a href="https://github.com/srivtx/pocketveto/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer" className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">Changelog</a>
                <a href="https://github.com/srivtx/pocketveto/releases" target="_blank" rel="noreferrer" className="text-[13px] leading-relaxed text-mist-500 transition-colors hover:text-mist-100">Android APK</a>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="mb-1.5 text-[13px] font-medium text-mist-300">Principles</span>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[13px] leading-relaxed text-mist-500">No bank credentials, ever</span>
                <span className="text-[13px] leading-relaxed text-mist-500">No analytics or telemetry</span>
                <span className="text-[13px] leading-relaxed text-mist-500">Plain-JSON export, yours to keep</span>
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-ink-800/70 pt-5">
          <p className="pv-num text-[11px] text-mist-500">
            No account · No bank link · No server — local-first by architecture, not policy
          </p>
        </div>
      </div>
    </footer>
  );
}

export function Landing({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-mist-100">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-ink-800/70 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 text-signal-400" />
            <span className="font-display text-lg font-semibold tracking-tight">PocketVeto</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-mist-400 md:flex" aria-label="Sections">
            <button type="button" onClick={() => scrollToSection('problem')} className="transition-colors hover:text-mist-100">
              The problem
            </button>
            <button type="button" onClick={() => scrollToSection('features')} className="transition-colors hover:text-mist-100">
              Features
            </button>
            <button type="button" onClick={() => scrollToSection('privacy')} className="transition-colors hover:text-mist-100">
              Privacy
            </button>
            <a
              href="https://github.com/srivtx/pocketveto"
              className="transition-colors hover:text-mist-100"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <InstallButton size="sm" />
            </div>
            <Button
              onClick={onOpenApp}
              size="sm"
              className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
            >
              Open the app
            </Button>
          </div>
        </div>
        <ScrollProgress />
      </header>

      {/* Android visitors: the app is the better install */}
      <AndroidStrip />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pv-grid pv-grid-fade absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
            <div>
              <Reveal>
                <p className="pv-label mb-5 flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="pv-ping absolute inline-flex h-full w-full rounded-full bg-signal-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal-400" />
                  </span>
                  Local-first · Open source · Nothing leaves your device
                </p>
              </Reveal>
              <Reveal delay={70}>
                <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                  Your <span className="text-signal-400">veto</span> before the charge posts.
                </h1>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-6 max-w-lg text-base leading-relaxed text-mist-300 md:text-lg">
                  PocketVeto is the local-first radar for every date your money moves — the
                  trial that converts, the renewal that fires, the warranty that lapses, the
                  gift card that decays, the 0% APR window that cliffs. Banks don&apos;t warn
                  you before they charge you. This does.
                </p>
              </Reveal>
              <Reveal delay={210}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={onOpenApp}
                    size="lg"
                    className="h-12 bg-signal-400 px-7 text-base font-semibold text-ink-950 hover:bg-signal-300"
                  >
                    Start tracking — it&apos;s free
                  </Button>
                  <InstallButton size="lg" />
                </div>
              </Reveal>
              <Reveal delay={280}>
                <p className="pv-label mt-6">No signup · No bank link · Works offline once installed</p>
              </Reveal>
            </div>

            <Reveal delay={180} className="relative mx-auto w-full max-w-sm">
              <div className="pv-breathe absolute -inset-6 rounded-3xl bg-signal-400/5 blur-3xl" aria-hidden />
              <div className="relative rounded-2xl border border-ink-800 bg-ink-925/90 p-4 shadow-2xl shadow-black/40">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="pv-label">Your radar · live preview</span>
                  <span className="pv-num rounded-full bg-cliff-400/15 px-2.5 py-0.5 text-xs font-semibold text-cliff-300">
                    $2,450 at risk
                  </span>
                </div>
                <RadarChart views={DEMO} />
                <p className="mt-2 text-center text-[11px] text-mist-500">
                  Blips close in as the money date approaches · tap one to act
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="The numbers" className="border-y border-ink-800/70 bg-ink-925/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Stat key={s.src} stat={s} delay={i * 90} />
            ))}
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <Reveal>
                <p className="pv-label mb-4">The problem</p>
                <h2 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
                  Forgetting isn&apos;t your flaw. It&apos;s their business model.
                </h2>
              </Reveal>
              <Reveal delay={90}>
                <div className="mt-7 max-w-2xl space-y-5 text-[15px] leading-relaxed text-mist-300">
                  <p>
                    The subscription economy runs on negative-option defaults: you&apos;re
                    enrolled automatically, and staying is the default while leaving is buried
                    three menus deep. The industry has a name for the money you forget —
                    it&apos;s called <em className="text-mist-100">breakage</em>, and it is
                    revenue. 52% of people walk into a free trial intending to cancel. Only
                    38% do.
                  </p>
                  <p>
                    The tools that promise to fix this want your bank login — the exact trust
                    that the category&apos;s own complaint records show to be risky — and then
                    charge a subscription to fight your subscriptions. Meanwhile the dates
                    that hurt most aren&apos;t even subscriptions: the $75 gift card quietly
                    decaying in a drawer, the warranty that lapses the month before the
                    dishwasher dies, the 0% APR window that claws back 30% interest on the
                    original $1,200 retroactively.
                  </p>
                  <p>
                    Consumers already proved they&apos;ll track expiry dates — for food. The
                    pantry app category thrives. Your money deserves the same radar, without
                    handing a startup the keys to your bank.
                  </p>
                </div>
              </Reveal>
            </div>
            <Reveal delay={160} className="self-start">
              <div className="rounded-xl border border-ink-800 bg-ink-925/60 p-6">
                <p className="pv-num text-xs text-mist-500">break·age&nbsp;(n.)</p>
                <p className="mt-3 font-display text-xl font-medium leading-snug text-mist-100">
                  Revenue earned from the thing you forgot to use.
                </p>
                <div className="my-5 h-px bg-ink-800" />
                <ul className="space-y-3 text-sm leading-relaxed text-mist-400">
                  <li className="flex gap-3">
                    <span className="pv-num shrink-0 text-cliff-400">52%</span>
                    enter a free trial intending to cancel
                  </li>
                  <li className="flex gap-3">
                    <span className="pv-num shrink-0 text-cliff-400">38%</span>
                    actually do (Cerillion)
                  </li>
                  <li className="flex gap-3">
                    <span className="pv-num shrink-0 text-cliff-400">$175</span>
                    average unused balance per gift card
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-ink-800/70 bg-ink-925/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <Reveal>
              <p className="pv-label mb-4">Features</p>
              <h2 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
                One radar. Every date your money moves.
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink-800 bg-ink-800 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 80} className="h-full">
                  <div className="group flex h-full flex-col bg-ink-950 p-7 transition-colors duration-300 hover:bg-ink-925">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-800 bg-ink-925 text-signal-400 transition-colors duration-300 group-hover:border-signal-500/40">
                        <f.icon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="pv-num text-[11px] text-mist-500">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{f.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-mist-400">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <Reveal>
            <p className="pv-label mb-4">How it works</p>
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
              Three steps, two minutes
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {[
              {
                n: '1',
                t: 'Add the date — or don&apos;t',
                b: 'Name it, pick the kind, set the date and what it costs you if it fires. Or share a payment notification from your phone — or paste a statement — and let the scanner find your autopays for you. No bank, no email, no account.',
              },
              {
                n: '2',
                t: 'Watch it close in',
                b: 'The radar plots every active item; alerts fire at T-7, T-2 and day-of while the app runs. The $-at-risk ticker keeps the stakes visible.',
              },
              {
                n: '3',
                t: 'Veto, claim, or pay off',
                b: 'Act from the playbook — cancel steps, warranty checklist, redemption path, or the payoff number that beats the APR cliff. Mark it done and watch the saved ledger grow.',
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 110}>
                <div className="relative border-t border-ink-700 pt-6">
                  <span className="pv-num absolute -top-[13px] left-0 bg-ink-950 pr-3 text-sm font-semibold text-signal-400">
                    {s.n}
                  </span>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{s.t}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-mist-400">{s.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="mt-14 text-center">
              <Button
                onClick={onOpenApp}
                size="lg"
                className="h-12 bg-signal-400 px-8 text-base font-semibold text-ink-950 hover:bg-signal-300"
              >
                Open PocketVeto
              </Button>
            </div>
          </Reveal>
        </section>

        {/* Privacy */}
        <section id="privacy" className="border-t border-ink-800/70 bg-ink-925/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
            <div>
              <Reveal>
                <p className="pv-label mb-4">Privacy</p>
                <h2 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
                  Privacy isn&apos;t a policy here. It&apos;s an architecture.
                </h2>
              </Reveal>
              <Reveal delay={90}>
                <div className="mt-7 max-w-xl space-y-5 text-[15px] leading-relaxed text-mist-300">
                  <p>
                    No accounts, no analytics, no bank linkage, no server. Your
                    items — and any statement or notification text you scan — live
                    in this device&apos;s storage and are parsed by code running
                    right here. The app works fully offline because there is
                    nowhere for it to phone home to.
                  </p>
                  <p>
                    Moving devices? Export gives you a plain JSON file — your
                    data, documented format, yours to keep — and Import brings it
                    back anywhere.
                  </p>
                  <p className="text-sm text-mist-500">
                    One honest limit: browser alerts fire while PocketVeto can
                    run (installed PWAs do this well; iOS Safari is stricter).
                    The Android app covers the rest — no push server, ever.
                  </p>
                </div>
              </Reveal>
            </div>
            <Reveal delay={160} className="self-start">
              <div className="rounded-2xl border border-ink-800 bg-ink-950 p-6">
                <p className="pv-label mb-5">What this app will never ask for</p>
                <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                  {ABSENCES.map((a, i) => (
                    <Reveal key={a.label} delay={i * 70} className="h-full">
                      <div className="group flex h-full items-center gap-3 rounded-xl border border-ink-800/80 bg-ink-925/40 px-3.5 py-3 transition-colors duration-300 hover:border-signal-500/40">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-800 bg-ink-950 text-mist-400 transition-colors duration-300 group-hover:text-cliff-300">
                          <a.icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium leading-tight text-mist-200">
                            {a.label}
                          </span>
                          <span className="pv-num block truncate text-[11px] leading-tight text-mist-500">
                            {a.sub}
                          </span>
                        </span>
                      </div>
                    </Reveal>
                  ))}
                </div>
                <div className="mt-5 border-t border-ink-800/70 pt-4">
                  <p className="pv-num text-[11px] leading-relaxed text-mist-500">
                    storage → IndexedDB, this device only
                    <br />
                    export → plain JSON, yours to keep
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer onOpenApp={onOpenApp} />
    </div>
  );
}
