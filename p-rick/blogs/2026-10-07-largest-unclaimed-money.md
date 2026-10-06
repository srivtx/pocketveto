---
title: "The Largest Pool of Unclaimed Money in the Economy Is Yours"
date: 2026-10-07
author: p-rick research program
paper: p-002-consumer-rights-dead-capital
---

# The Largest Pool of Unclaimed Money in the Economy Is Yours

Some numbers first, because they're the whole argument:

- €3–6 billion a year in EU flight-delay compensation goes unclaimed. 87% of eligible passengers never file.
- US class-action settlements pay out at claims rates of 10% or less. Three hundred-plus settlements are open right now; the money of the 90% who never claim goes... back, or to lawyers, or to cy pres.
- $70 billion sits in state unclaimed-property funds. Roughly $4.5 billion a year finds its way back — the slowest bank run in history, in reverse.
- $3 billion a year evaporates from unused gift cards.

Tens of billions a year, in the US and EU alone. Legally owed. Individually collectible. Collectively untouched.

Economists have a term for an asset that exists on paper but can't be exercised: **dead capital**. Hernando de Soto coined it for houses without titles — wealth you can see but can't leverage. Your consumer rights are dead capital in exactly that sense. The law says you're owed. There is simply no machinery for collecting.

## The reason isn't ignorance. It's friction.

The standard story is that people don't know their rights. That's part of it, but it's not the binding constraint — and getting this wrong is why most "solutions" fail.

The binding constraint is that exercising a right is a *process*, and the process is priced to repel. You must notice the trigger (the delay, the renewal, the delivery), identify the rule, gather evidence, compute the deadline, draft the claim, file through the right channel, follow up, and escalate when ignored. Administrative-burden researchers call these learning costs, compliance costs, and psychological costs. The dark-patterns literature documents the other side of the coin: counterparties *engineer* exactly this friction where it pays. One-click to subscribe, an obstacle course to cancel. Airlines that attribute everything to "extraordinary circumstances" and make first-round claims fail by design.

Here's the economic punchline: the cost of exercising is roughly *fixed* per claim, invariant to the size of the claim. A €400 flight claim might clear the bar — which is why AirHelp exists and takes 35% for doing the walking. A $6 delivery refund, a $9 price-drop difference, a single month of a subscription credit? Those rights are *fiction*. Written, valid, and economically unreachable. There's a de facto claims floor in every jurisdiction, and everything below it is dead capital forever.

Software moves the floor.

## Why nobody has built this (and the five that tried)

We surveyed every adjacent attempt, and the pattern is eerie — not one refutation, five partial proofs:

- **AirHelp/Flightright** prove full-stack claim execution is a business — for flights only, at 25–50% fees, with you doing the discovery.
- **Earny/Paribus** proved automated email-scanning + filing *worked mechanically* — and died when merchants revoked the voluntary price-protection rails they ran on. Lesson: build on statutory rails, not voluntary ones.
- **DoNotPay** proved the demand is enormous — and got FTC-settled $193K for "robot lawyer" posturing without real computation. Lesson: be an authorized agent with traceable, cited rule-matching, not a persona of counsel.
- **The EU's own ODR platform** proved institutional will exists — and was discontinued in July 2025 for being "hardly used." Lesson: destination platforms still charge learning costs; distribution must be ambient.
- **Incogni/DeleteMe** prove the authorized-agent model is legal and scales — for exactly one right (data deletion). One row of the corpus, as an entire company.

Every component is in production somewhere. The composition — event ingestion × machine-readable rights corpus × deadline ledger × delegated filing — exists nowhere. We gave it a name in the paper: the **personal entitlement engine**.

## What the engine actually is

Four layers. It subscribes to your life's event stream (that's our P-001, the personal event bus — this is why we built that layer first: the entitlement engine is its highest-value customer). It matches events against a versioned, machine-readable corpus of consumer-rights rules — EU261, chargeback windows, auto-renewal statutes, warranty law, open settlements — each rule carrying its statutory citation, its deadline function, and its filing procedure. It maintains a **deadline ledger**: the one UI feature that matters, because a right you don't exercise before the window closes was never a right. And it files and escalates as your authorized agent — merchant channel, then chargeback, then regulator, then small-claims — walking the escalation ladder that exists in law and is never walked because walking it is exhausting.

The economics flip when you see it as a portfolio. Per-claim costs near zero mean $6 claims clear *in aggregate*. Your entitlement stream, bundled, is worth a monthly notification: "You're owed $61 across 4 claims — approve filing?"

## What we're not claiming

Three things, stated plainly, because the graveyard is full of overclaimers:

1. **We can't prove absence.** A local event log shows what was *observed*, not what didn't happen. Claims that rest on non-observation (e.g., "no consent notice arrived") get flagged for your attestation before anything is filed. The paper is explicit about this — a machine that files statutory-violation claims on unprovable premises is a liability machine.
2. **The corpus is forever-work.** Statutes shift; the click-to-cancel rule was vacated by the Eighth Circuit in July 2025 and the fight continues. Our answer is an open, versioned, community-maintained corpus — rules-as-code pointed at consumers instead of governments. That's a research contribution in itself, and it's the moat and the chore at once.
3. **An industrial claimant can be weaponized.** Mass nuisance filing, false positives at volume — we treat misuse as a design constraint (rate limits, per-rule kill switches, attestation gates), not a footnote.

## The thesis, compressed

Consumer protection law has spent fifty years perfecting the *issuing* of rights and left the *executing* to individuals facing counterparties whose business model includes making execution expensive. That's why the money is dead. The entitlement engine is the execution institution the rights never had.

The full argument — formal model, state machine, escalation ladder, corpus governance, legal analysis, honest limitations — is in our second paper: [Consumer Rights as Dead Capital: The Case for a Personal Entitlement Engine](../papers/p-002-consumer-rights-dead-capital.md).

Dead capital is called dead because no institution could execute it. Software is the first institution cheap enough to try. We're building the claim-execution layer, and we think it's the most asymmetrically useful thing a personal-event infrastructure can do first.
