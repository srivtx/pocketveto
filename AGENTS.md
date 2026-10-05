# AGENTS.md — PocketVeto conventions

PocketVeto is a **local-first PWA**: one Next.js 16 app route, zero
backend, all data in browser storage. Read `AGENT-GOALS.md` first —
Goal 0 gates all work.

## Ground rules

1. **Pure core, dumb UI.** All money/date logic lives in
   `src/lib/pocketveto/` as dependency-free pure TypeScript. Components
   consume it; they never re-implement it. Bug fixed in the core →
   regression test added in `tests/core.test.ts`.
2. **Fail soft, always.** Storage and notification code must degrade
   gracefully when browser APIs are missing (private mode, old Safari,
   SSR). The app never crashes because IndexedDB is blocked.
3. **No network.** No analytics, no fonts CDN at runtime, no API calls,
   no telemetry. The service worker caches same-origin assets only.
4. **Tests + lint before push.** `bun test && bun run lint` must be
   green. CI (`.github/workflows/ci.yml`) runs the same on every push.
5. **Honest copy.** Stats cite sources; limitations are stated in the
   UI where the feature lives; estimates are labeled as estimates.

## Code style

- TypeScript strict; no `any` in the core lib.
- shadcn/ui components over hand-rolled UI; Tailwind 4 classes.
- Client components (`'use client'`) everywhere except `layout.tsx`
  metadata; the app is fully client-side by design.
- Emojis in `KIND_META` are product copy (used in filters/blips), not
  decoration — keep them semantic.

## Commit / release

- Conventional-ish subjects; reference the goal ("playbook: add
  registrar watch-out", "fix: map-index leak in toView").
- `CHANGELOG.md` entry per release; version tags follow semver.
