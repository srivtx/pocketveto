'use client';

/**
 * PocketVeto — landing page. The hook is loss aversion with receipts:
 * every stat below carries its source, per the product's honesty rules.
 *
 * Design: quiet mission control. Display type (Space Grotesk) carries the
 * voice, mono carries the data, one signal color carries the intent.
 */

import { Bell, Calculator, HardDriveDownload, Radar, ScanLine, X, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadarChart } from './RadarChart';
import { Logo } from './Logo';
import { Reveal, useCountUp } from './motion';
import type { ItemView } from '@/lib/pocketveto/types';

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
    value: 1080,
    format: (n) => `$${Math.round(n).toLocaleString('en-US')}/yr`,
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
    body: 'Free trials, subscriptions, memberships, warranties, gift cards, 0% APR windows, passports, IDs, domains — every date your money moves, plotted on one live radar. Blips close in as the day approaches.',
  },
  {
    icon: Crosshair,
    title: 'A $-at-risk ticker, not a budget',
    body: 'PocketVeto shows what you are about to LOSE: a live sum of the money at stake across all your dates, annualized run-rate of what renews, and what fires within 7 days. Losses hurt about twice as much as gains feel good — we count the losses.',
  },
  {
    icon: ScanLine,
    title: 'Playbooks, not just reminders',
    body: 'Every item ships with an action playbook: durable cancellation paths for popular services, warranty-claim checklists, gift-card redemption steps, a ready-to-send cancellation email, and the deferred-interest payoff math. A reminder you can\u2019t act on is just anxiety.',
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
  'No account to create',
  'No bank credentials, ever',
  'No analytics or telemetry',
  'No server — nowhere to phone home',
  'No push vendor reading your dates',
];

function scrollToProblem() {
  document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' });
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

export function Landing({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-mist-100">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-ink-800/70 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 text-signal-400" />
            <span className="font-display text-lg font-semibold tracking-tight">PocketVeto</span>
            <span className="pv-num hidden rounded-full border border-ink-800 px-2 py-0.5 text-[10px] text-mist-400 sm:block">
              v1.1
            </span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-mist-400 md:flex" aria-label="Sections">
            <a href="#problem" className="transition-colors hover:text-mist-100">The problem</a>
            <a href="#features" className="transition-colors hover:text-mist-100">Features</a>
            <a href="#privacy" className="transition-colors hover:text-mist-100">Privacy</a>
            <a
              href="https://github.com/srivtx/pocketveto"
              className="transition-colors hover:text-mist-100"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
          <Button
            onClick={onOpenApp}
            size="sm"
            className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
          >
            Open the app
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pv-grid pv-grid-fade absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
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
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-ink-800 bg-transparent px-6 text-base text-mist-300 hover:border-ink-700 hover:bg-ink-900 hover:text-mist-100"
                    onClick={scrollToProblem}
                  >
                    Why this exists
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={280}>
                <p className="pv-label mt-6">No signup · No bank link · Works offline once installed</p>
              </Reveal>
            </div>

            <Reveal delay={180} className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-6 rounded-3xl bg-signal-400/5 blur-3xl" aria-hidden />
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
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
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
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink-800 bg-ink-800 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
            {[
              {
                n: '1',
                t: 'Add the date',
                b: 'Name it, pick the kind, set the date and what it costs you if it fires. Popular services pre-fill their cancel paths. No bank, no email, no account.',
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
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
            <div>
              <Reveal>
                <p className="pv-label mb-4">Privacy</p>
                <h2 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
                  Privacy isn&apos;t a policy here. It&apos;s an architecture.
                </h2>
              </Reveal>
              <Reveal delay={90}>
                <div className="mt-7 space-y-5 text-[15px] leading-relaxed text-mist-300">
                  <p>
                    PocketVeto has no accounts, no analytics, no bank linkage and no server.
                    Your items are stored in your own browser storage (IndexedDB) and every
                    byte stays on your device. The app works fully offline once installed —
                    because there is nowhere for it to phone home to.
                  </p>
                  <p>
                    Moving devices? Use Export to get a plain JSON file and Import it anywhere.
                    It&apos;s your data; the file format is documented in the repository.
                  </p>
                  <p className="text-sm text-mist-500">
                    One honest limit: browser notifications fire while PocketVeto is open or
                    its background worker can run (installed PWAs on Android/desktop do this
                    well; iOS Safari is more restrictive). v1 deliberately ships no push
                    server — a self-hostable notifier is on the roadmap for people who want
                    it.
                  </p>
                </div>
              </Reveal>
            </div>
            <Reveal delay={160} className="self-start">
              <div className="rounded-2xl border border-ink-800 bg-ink-950 p-7">
                <p className="pv-label mb-5">What this app will never ask for</p>
                <ul className="space-y-4">
                  {ABSENCES.map((a) => (
                    <li key={a} className="flex items-center gap-3 text-sm text-mist-300">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cliff-400/30 bg-cliff-400/10">
                        <X className="h-3 w-3 text-cliff-400" strokeWidth={2.5} aria-hidden />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
                <div className="my-6 h-px bg-ink-800" />
                <p className="pv-num text-xs leading-relaxed text-mist-500">
                  storage: IndexedDB, this device only
                  <br />
                  export: plain JSON, yours to keep
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-ink-800/70 bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-mist-400">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <Logo className="h-7 w-7 text-signal-400" />
              <p>
                <span className="font-display font-semibold text-mist-100">PocketVeto</span> —
                your veto before the charge posts.
              </p>
            </div>
            <div className="flex gap-6">
              <a
                href="https://github.com/srivtx/pocketveto"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-mist-100"
              >
                GitHub
              </a>
              <button onClick={onOpenApp} className="transition-colors hover:text-mist-100">
                Open app
              </button>
              <a
                href="https://github.com/srivtx/pocketveto/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-mist-100"
              >
                Changelog
              </a>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-mist-500">
            Stat sources: DealNews/uppermichiganssource unused-gift-card survey (2023,
            $21–23B, 47% of US adults); Ohio State University Extension citing industry data
            (2025, $90/mo average); WalletHub 2026 Deferred Interest Study via CNBC (Dec 2,
            2025, 80% of store cards with 0% APR offers); Hiatus consumer survey via
            GlobeNewswire (62%); Cerillion subscription-trap analysis (52% intend to cancel /
            38% do). PocketVeto is an organizational tool, not financial advice. MIT
            licensed.
          </p>
        </div>
      </footer>
    </div>
  );
}
