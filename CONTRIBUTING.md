# Contributing to PocketVeto

Thanks for wanting to help. The highest-value contributions, in order:

1. **Playbook corrections** — vendor cancellation flows drift quarterly.
   If a step in `src/lib/pocketveto/playbooks.ts` is wrong or outdated,
   open a PR with the current flow and, if you can, a link to the
   vendor's official cancellation page.
2. **New curated playbooks** — same bar: the entry point must be the
   official one, and `watchOut` notes should describe dark patterns
   people will actually hit (retention offers, hidden fees, phone-only
   cancellation).
3. **Bug reports** — steps to reproduce, browser, and whether the app
   was installed as a PWA.
4. **Core-math fixes** — the domain logic is pure and unit-tested; PRs
   that change math must add or adjust the covering test in
   `tests/core.test.ts`.

## Ground rules

- **No telemetry, no network calls, no accounts** — features that
  require any of those will not be merged. The privacy architecture is
  the product; see the README.
- Run `bun test && bun run lint` before opening a PR. CI runs exactly
  that.
- UI follows the token system in `globals.css` (ink / mist / signal /
  cliff / warn) and the motion rules in `motion.tsx` — no hard-coded
  colors outside tokens, and every animation must respect
  `prefers-reduced-motion`.

## Dev quickstart

```bash
bun install
bun run dev      # http://localhost:3000
bun test
bun run lint
```

MIT licensed — by contributing you agree your contributions are MIT
licensed too.
