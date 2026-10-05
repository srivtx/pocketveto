# AGENT-GOALS — PocketVeto work order

This file is the standing work order for any agent (human or AI) working
on PocketVeto. Goals are ordered: **Goal 0 gates everything.**

## Goal 0 — build gate (MUST pass before any other work)

- [x] `bun test` green (26/26) — pure core in `src/lib/pocketveto/`
- [x] `bun run lint` clean (0 errors)
- [x] App verified end-to-end in a real browser: landing → `#app` →
      sample data → radar blips → playbook + APR calculator → veto →
      saved ledger → add item → clear data (agent-browser session,
      2026-10-05)
- [x] No secrets in repo (`ghp_` scan clean), MIT LICENSE present,
      CI green from first commit

**Re-verify triggers:** any change to `src/lib/pocketveto/*` (re-run all
of Goal 0), any change to storage format (add a migration note below),
any new dependency (justify why local-first is preserved).

## Goal 1 — keep the core deterministic and tested

The product's credibility lives in the pure core: date math, recurrence
advance, risk sums, deferred-interest estimates, playbook content. Every
bug fixed there gets a regression test (see the `Array.map`-safety test
for the pattern). No DOM imports in `src/lib/pocketveto/` except
`store.ts`/`notifications.ts`/`seed.ts` which must fail soft when
browser APIs are absent.

## Goal 2 — never break the privacy architecture

No accounts. No bank linkage. No server calls. No analytics. No remote
fonts after build. Any feature that wants a network call must be
opt-in, documented, and default-off (the roadmap's self-hostable push
notifier is the canonical example). If a PR adds a `fetch` to anywhere
other than same-origin static assets, reject it.

## Goal 3 — honesty in UX copy

Every stat shown to users carries a source (landing + README). The
notification limits are stated in-app, not buried. The APR estimate is
labeled a floor, not a ceiling. Never claim warranty-unclaimed dollar
figures — that stat was never verified (R16, q06).

## Goal 4 — roadmap (in order)

1. Receipt photo capture (local, stored in IDB as blobs — keep quota
   warnings honest)
2. Optional self-hostable push notifier (separate repo, default-off)
3. Calendar export (.ics) of all money dates
4. Service-playbook expansion (curated, durable paths only)
5. Localization pass (the radar is language-neutral; copy is EN-first)

## Standing constraints

- Local-first is non-negotiable (Goal 2).
- No paid tier, no ads, no "premium" reminders — the category paywalls
  the core value; we don't.
- Name is PocketVeto. It was collision-checked (GitHub 0, web/app stores
  clean) on 2026-10-05; re-check before any commercial use.
- Product status: **v1.0.0 shipped 2026-10-05** from registry row 15
  (consumer money-dates lens, track report R16).
