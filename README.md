<div align="center">

<img src="docs/screenshots/landing-full.png" alt="PocketVeto — one radar for every date your money moves" width="820" />

# PocketVeto

**One radar for every date your money moves.**

Trials, renewals, warranties, gift cards, 0% APR windows, passports,
domains — plotted on a live radar with a `$ at risk` ticker and an
action playbook for every item. Paste a bank statement and it finds
your autopays for you.

[Open the app](#run-it) · [Autopay scan](#autopay-scan-no-bank-link) · [Install as an app](#install-as-an-app)

[![CI](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml/badge.svg)](https://github.com/srivtx/pocketveto/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-3ddc97?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-41%20passing-3ddc97?style=flat-square)](tests/)
[![PWA](https://img.shields.io/badge/PWA-installable%20·%20offline-1c2623?style=flat-square)](#install-as-an-app)
[![Local-first](https://img.shields.io/badge/data-local--first%20·%20no%20telemetry-1c2623?style=flat-square)](#privacy-is-an-architecture)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-3ddc97?style=flat-square)](CONTRIBUTING.md)

**No account. No bank link. No server.** Your data lives in your
browser and never leaves your device. Free, MIT, installable.

</div>

---

<div align="center">
  <img src="docs/screenshots/radar.png" alt="The PocketVeto radar" width="400" /> <img src="docs/screenshots/scan.png" alt="Autopay scan results" width="400" />
</div>

## What's inside

| Area | What it does |
|---|---|
| **Radar** | Every active item is a blip closing in as its date approaches (rings at 7/14/30/60 days; center = now). Click a blip to act. |
| **Autopay scan** | Paste a bank/card activity export — the on-device detector finds recurring charges (cadence, next charge, confidence) and tracks them in one tap. |
| **$-at-risk ticker** | Live sum of what you're about to lose + annualized run-rate + next-7-days strip. Loss-aversion by design. |
| **Playbooks** | Durable cancel paths (Netflix, Adobe, gyms, registrars…), warranty-claim checklists, a ready-to-send cancellation email, per-kind fallbacks. |
| **APR cliff calculator** | The monthly payment that clears a deferred-interest window — and the retroactive damage if you miss it. |
| **Alerts** | T-7 / T-2 / day-of notifications while the app runs, a "while you were away" lapse report, threshold banners. |
| **Data ownership** | Export/import plain JSON (merge-safe), sample data, danger-zone clear. Nothing ever leaves the device. |

## Autopay scan — no bank link

The subscription trackers that find charges for you want your **bank
login**. PocketVeto does it the other way around:

1. **Paste** your bank or card activity (CSV export, or copied lines).
2. The scanner — pure TypeScript, running entirely in your browser —
   groups charges by merchant, strips bank noise (`POS DEBIT`, card
   numbers, refs), and keeps merchants whose dates fit a weekly /
   monthly / quarterly / yearly rhythm with consistent amounts.
3. Each detected autopay shows cadence, next charge date, monthly cost
   and a confidence score. **Track it** turns it into a radar item with
   the right recurrence — one tap, done. Known brands (Netflix, Adobe,
   gyms, registrars, ~30 more) get their cancel playbook attached.

The honest platform note: a web app cannot read your phone's
notifications or SMS — that's an OS boundary, and it's there for good
reasons. Statement paste is the private equivalent, and it works
everywhere. Inbox/bank aggregation (opt-in, via your own Supabase
backend) is on the roadmap.

## Install as an app

PocketVeto is a PWA — installable, then works offline:

- **Android / desktop Chrome & Edge**: tap **Install app** in the header,
  or the install icon in the address bar.
- **iOS Safari**: Share → *Add to Home Screen* (the app shows the path).

Why a PWA and not a Play Store app: one codebase, no store review, no
update lag, works on desktop too. When a native wrapper earns its keep
(a notification-listener detector, for instance), the same code ships
as a Trusted Web Activity — nothing is lost by starting here.

## Run it

```bash
git clone https://github.com/srivtx/pocketveto.git
cd pocketveto
bun install          # frozen lockfile verified in CI; npm/pnpm work too
bun run dev          # http://localhost:3000
bun test             # 41 tests: dates, risk, interest, playbooks, scanner
```

Deploy anywhere Next.js runs. No backend, no database, no environment
variables — by design.

## Privacy is an architecture

No accounts, no analytics, no bank linkage, no server, no push vendor.
Items live in IndexedDB on your device; statement text you scan is
processed locally and never uploaded. Load the app and watch the
network tab stay silent.

## Architecture in one paragraph

Next.js 16 App Router, single route (`/` = landing, `/#app` = the app).
All state is client-side; persistence is IndexedDB with a localStorage
mirror (`store.ts`). Domain logic — dates, risk, deferred interest,
playbooks, alerts, the statement scanner (`scan.ts`) — is pure,
dependency-free TypeScript, fully unit-tested. UI is Tailwind 4 +
shadcn/ui with a custom oklch token system and motion primitives that
respect `prefers-reduced-motion` everywhere. The whole render tree is
hydration-safe (deterministic first paint, `useSyncExternalStore` for
environment-dependent values).

## Roadmap

- [ ] `.ics` calendar export
- [ ] Receipt capture (photo → notes, on-device)
- [ ] Opt-in sync via your own Supabase backend (the store layer is
      already the adapter boundary)
- [ ] Self-hostable push notifier
- [ ] More curated playbooks

## Contributing

Bug reports, playbook corrections and new curated playbooks are the
highest-value contributions — vendor flows drift. Run
`bun test && bun run lint` before opening a PR; CI runs the same.

## License

MIT — see [LICENSE](LICENSE). PocketVeto is an organizational tool,
not financial advice.
