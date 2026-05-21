# FinnWeb Strategy & Roadmap (working direction)

Updated: 2026-05-20
Status: **Working strategic direction** for prioritization. NOT a pricing/decision
commitment — `decisions.md` and `pricing-feature-matrix.md` remain unchanged by
owner instruction (product not promoted yet). Verify code state before acting.

## Thesis (the only durable win)

Competitors have **either** strong AI/builder tech (Wix ADI, Durable — English,
generic, no LINE) **or** Thai-SME fit (MakeWebEasy, Readyplanet, Page365 — manual,
dated, samey). Nobody owns the intersection.

FinnWeb wins only by standing on that intersection:
**"AI builds a beautiful + natively-Thai-written + LINE-lead-ready site for a Thai
SME in minutes."** Funnel: found (SEO/GEO) → beautiful site (AI build) →
**lead converts into LINE** → owner closes via chat.

AI-build is the **wedge / acquisition magnet**, not a paywall. Gate the *outcome*
(leads into LINE, custom domain, premium templates, regenerate quota) — not "can
you use AI".

## Win-conditions (priority order, with code status)

1. **LINE OA lead engine that actually sends** — 🔴 NOT BUILT (token stored +
   quota counted for telemetry only; no send path; see
   `line-oa-quota-rollout.md`). **Carries the whole thesis. Highest risk, unowned.**
2. **Native Thai marketing copy (consumer AI-fill)** — 🟡 DeepSeek wired for admin
   import only; needs consumer fill + Thai guardrails. Deterministic fallback exists.
3. **Curated beautiful + motion templates** — 🟡 in progress (Codex: visual/motion
   engine + showcase template). Quality ceiling via curation, not AI roulette.
4. **Thai-context defaults** (LINE/PromptPay CTA, Thai phone/address, trust) — 🟢
   cheap, competitors ignore.
5. **THB pricing + Thai payment rail** — 🟡 Stripe is a bottleneck risk
   (evaluate Omise/2C2P).
6. **Reseller/white-label channel (Pro)** — 🟡 distribution moat; Thai players grow
   via channel, not self-serve.

## Phase plan

- **Phase 1 (must finish in the window):** #1 LINE engine → #3 templates/motion →
  #2 Thai content. Useless individually — ship as one. Codex owns #3 now;
  **#1 LINE engine is the next session and the critical path.**
- **Phase 2 (before broad promo):** #4 Thai defaults; value metric = regenerate
  quota + premium-template gate (justifies Business ฿490 with *buildable* things,
  closing the honesty gap); #5 payment rail.
- **Phase 3 (after Phase 1–2 proven):** #6 reseller; minimal ecommerce/blog/
  analytics only when market demands (owner: "not promoted yet, leave it").

## Adjacent, low-cost (fold into existing work, don't make a new product)

- Technical SEO foundations (semantic HTML, Schema.org JSON-LD per section type,
  SSR meta, sitemap) → free for all tiers; helps Google **and** AI discovery (GEO)
  at once. Fold into renderer work (Codex already touches renderer).
- AI SEO copy/meta (Thai) → Phase 2, gated by regenerate quota.
- Do **not** oversell GEO (measurement murky, Thai AI-search volume still small,
  space volatile). Sell the real technical version, treat "found by AI" as a
  forward marketing hook backed by genuine structured-data work.

## Time window

Not a permanent moat. Wix/global *could* add Thai+LINE but Thailand is too small
to be their priority for ~2–4 quarters. Use that window to lock the memory
"AI + สวย + LINE" in a narrow vertical (clinic/restaurant/trades) and earn
word-of-mouth — not broad-everyone.
