# Codex Prompting & Review Rubric (orchestrator session)

Updated: 2026-05-20
For the session that writes Codex prompts and reviews Codex output.
Read `strategy-roadmap.md` first for *why*. This file is the *how to keep work
on-rails*.

## Hard guardrails — reject any Codex output that violates these

1. **Editor UX untouched.** Builder stays schema-driven + autosave. No
   drag-drop / Webflow-style editor. Quality work targets
   renderer/templates/motion, NOT the editor.
2. **Public render = `PublishLog.snapshot` only.** Never read draft Page/Section
   rows in any public path.
3. **No arbitrary JS / raw HTML injection** into the public path. Animation is
   driven by `props.motion` JSON through the first-party engine only.
4. **Public CSS namespaced** under `.fw-site-{siteId}.fw-version-{version}`.
   No template-specific CSS leaking into `globals.css`.
5. **Progressive enhancement.** Content visible by default (SSR); JS off /
   reduced-motion → content intact, no CLS, motion degrades gracefully.
6. **Thai-first** customer-facing copy/fallback; **Deep Space dark** default
   theme; FinnWeb color tokens; Kanit, body line-height ≥ 1.7.
7. Public URL = `*.finnweb.site` (never `finnweb.co`).
8. **Secrets:** never log/leak `lineOaAccessToken` or any token in
   logs/errors/responses.

## Risky-task review gate (require a design note BEFORE coding)

For tasks where a wrong assumption wastes the whole task, the Codex prompt MUST
include a Phase-0 "design note, stop for approval" step. Currently this applies to:

- **LINE OA send path:** what token type `lineOaAccessToken` is, **who/what the
  push destination is** (LINE Messaging API `push` needs an explicit target —
  "send to the OA owner" is non-trivial; LINE Notify is deprecated). Approve the
  delivery model before any sender code is written.

## Per-task review checklist

- [ ] Strategy fit: does it advance a win-condition in `strategy-roadmap.md`
      (esp. #1 LINE, #2 Thai content, #3 templates/motion)? Not scope creep.
- [ ] All 8 hard guardrails respected — **read the diff, not just Codex's summary**
      (trust but verify; the summary describes intent, not what shipped).
- [ ] No regression to existing flows (public lead submit + honeypot `_hp`
      silent-success + response shape; quota telemetry numbers).
- [ ] `pnpm typecheck` + `pnpm build` pass repo-wide; relevant tests added & pass.
- [ ] Browser-verified where UI: desktop 1440 / mobile 390 / reduced-motion /
      **JS off**.
- [ ] `project-context/changelog.md` + `tasks.json` updated per `AGENTS.md`
      (and `line-oa-quota-rollout.md` when the LINE send path lands).
- [ ] For risky tasks: Phase-0 design note was approved before coding.

## Sequencing reminder

Codex currently owns #3 (visual/motion + showcase template). **Next session =
#1 LINE OA lead engine** (send path + send-time quota enforcement + async via
existing BullMQ worker + email fallback). It is the highest-risk, thesis-bearing,
currently-unowned piece — do not let #3 finish without #1 queued.
