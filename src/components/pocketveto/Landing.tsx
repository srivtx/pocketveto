'use client';

/**
 * PocketVeto — landing page. The hook is loss aversion with receipts:
 * every stat below carries its source, per the product's honesty rules.
 */

import { Radar, ScanLine, ShieldCheck, Bell, Calculator, HardDriveDownload, Crosshair, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadarChart } from './RadarChart';
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

const STATS = [
  { n: '$23B', label: 'sitting in unused gift cards — 47% of US adults hold one', src: 'DealNews survey, 2023' },
  { n: '$1,080/yr', label: 'average subscription spend per person', src: 'Ohio State Univ. extension, 2025' },
  { n: '80%', label: 'of store cards with 0% APR carry deferred interest', src: 'WalletHub study via CNBC, Dec 2025' },
  { n: '62%', label: 'of consumers waste money on subs they forgot to cancel', src: 'Hiatus consumer survey' },
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
    body: 'Every item ships with an action playbook: durable cancellation paths for popular services, warranty-claim checklists, gift-card redemption steps, and the deferred-interest payoff math. A reminder you can\'t act on is just anxiety.',
  },
  {
    icon: Calculator,
    title: 'The 0% APR cliff calculator',
    body: 'Deferred interest charges retroactively on the ORIGINAL balance if you miss the payoff by even a dollar. PocketVeto computes the monthly payment that clears the cliff — and estimates the damage if you don\'t.',
  },
  {
    icon: HardDriveDownload,
    title: 'Local-first. Actually.',
    body: 'No account. No bank linkage. No server. Your data lives in your browser\'s storage and never leaves your device — the only way it moves is your own Export button. Inspectable open source under MIT.',
  },
  {
    icon: Bell,
    title: 'Alerts before the money moves',
    body: 'T-7, T-2 and day-of alerts while the app or its background worker runs — plus a "while you were away" review every time you open it. Installable as an app (PWA) on phone and desktop, works offline.',
  },
];

export function Landing({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
              <X className="h-4 w-4 text-emerald-400" aria-hidden />
            </span>
            <span className="font-semibold tracking-tight">PocketVeto</span>
            <span className="ml-1 rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
              v1.0
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex" aria-label="Sections">
            <a href="#problem" className="hover:text-zinc-100">The problem</a>
            <a href="#features" className="hover:text-zinc-100">Features</a>
            <a href="#privacy" className="hover:text-zinc-100">Privacy</a>
            <a
              href="https://github.com/srivtx/pocketveto"
              className="hover:text-zinc-100"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
          <Button
            onClick={onOpenApp}
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          >
            Open the app
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              Free · Open source · Nothing leaves your device
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Your veto before the charge posts.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
              PocketVeto is the local-first radar for every date your money moves — the trial
              that converts, the renewal that fires, the warranty that lapses, the gift card
              that decays, the 0% APR window that cliffs. Banks don&apos;t warn you before
              they charge you. This does.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                onClick={onOpenApp}
                size="lg"
                className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
              >
                Start tracking — it&apos;s free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50"
                onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Why this exists
              </Button>
            </div>
            <p className="mt-4 text-xs text-zinc-600">
              No signup. No bank link. Works offline once installed.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-4 rounded-3xl bg-emerald-500/5 blur-2xl" aria-hidden />
            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-zinc-400">Your radar</span>
                <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
                  $2,450 at risk
                </span>
              </div>
              <RadarChart views={DEMO} />
              <p className="mt-2 text-center text-[11px] text-zinc-600">
                Blips close in as the money date approaches · click one to act
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="The numbers" className="border-y border-zinc-900 bg-zinc-900/30">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.n}>
                <p className="text-3xl font-bold tracking-tight text-emerald-400">{s.n}</p>
                <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
                <p className="mt-1 text-[11px] text-zinc-600">{s.src}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Forgetting isn&apos;t your flaw. It&apos;s their business model.
          </h2>
          <div className="mt-6 space-y-4 text-zinc-400 leading-relaxed">
            <p>
              The subscription economy runs on negative-option defaults: you&apos;re enrolled
              automatically, and staying is the default while leaving is buried three menus deep.
              The industry has a name for the money you forget — it&apos;s called
              <em> breakage</em>, and it is revenue. 52% of people walk into a free trial
              intending to cancel. Only 38% do.
            </p>
            <p>
              The tools that promise to fix this want your bank login — the exact trust that
              the category&apos;s own complaint records show to be risky — and then charge a
              subscription to fight your subscriptions. Meanwhile the dates that hurt most
              aren&apos;t even subscriptions: the $75 gift card quietly decaying in a drawer,
              the warranty that lapses the month before the dishwasher dies, the 0% APR
              window that claws back 30% interest on the original $1,200 retroactively.
            </p>
            <p>
              Consumers already proved they&apos;ll track expiry dates — for food. The pantry
              app category thrives. Your money deserves the same radar, without handing a
              startup the keys to your bank.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-zinc-900 bg-zinc-900/30">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              One radar. Every date your money moves.
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 transition-colors hover:border-emerald-500/40"
                >
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <f.icon className="h-5 w-5 text-emerald-400" aria-hidden />
                  </span>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Three steps, two minutes</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
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
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <span className="text-3xl font-bold text-emerald-500/40">{s.n}</span>
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.b}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button
              onClick={onOpenApp}
              size="lg"
              className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
            >
              Open PocketVeto
            </Button>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="border-t border-zinc-900 bg-zinc-900/30">
          <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Privacy isn&apos;t a policy here. It&apos;s an architecture.
            </h2>
            <div className="mt-6 space-y-4 text-zinc-400 leading-relaxed">
              <p>
                PocketVeto has no accounts, no analytics, no bank linkage and no server. Your
                items are stored in your own browser storage (IndexedDB) and every byte stays
                on your device. The app works fully offline once installed — because there is
                nowhere for it to phone home to.
              </p>
              <p>
                Moving devices? Use Export to get a plain JSON file and Import it anywhere.
                It&apos;s your data; the file format is documented in the repository.
              </p>
              <p className="text-sm text-zinc-500">
                One honest limit: browser notifications fire while PocketVeto is open or its
                background worker can run (installed PWAs on Android/desktop do this well;
                iOS Safari is more restrictive). v1 deliberately ships no push server — a
                self-hostable notifier is on the roadmap for people who want it.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p>
              <span className="font-semibold text-zinc-300">PocketVeto</span> — your veto
              before the charge posts. MIT licensed.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/srivtx/pocketveto"
                target="_blank"
                rel="noreferrer"
                className="hover:text-zinc-300"
              >
                GitHub
              </a>
              <button onClick={onOpenApp} className="hover:text-zinc-300">
                Open app
              </button>
            </div>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-zinc-600">
            Stat sources: DealNews/uppermichiganssource unused-gift-card survey (2023, $21–23B,
            47% of US adults); Ohio State University Extension citing industry data (2025,
            $90/mo average); WalletHub 2026 Deferred Interest Study via CNBC (Dec 2, 2025,
            80% of store cards with 0% APR offers); Hiatus consumer survey via GlobeNewswire
            (62%); Cerillion subscription-trap analysis (52% intend to cancel / 38% do).
            PocketVeto is an organizational tool, not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
