# Product improvement inbox

Updated: 2026-11-05. Use this file to collect reviewer observations before making more changes.

## Shareable test site

**Preview:** https://118c-136-239-226-125.ngrok-free.app

- Password-protected; share the access details privately with invited reviewers.
- Uses retained synthetic QA data, not the normal developer database.
- Debug/Boost instrumentation and external payment/notification providers are disabled. Admin/development paths are blocked at the tunnel.
- Use test details only: no real payments, IDs, phone numbers or other personal information.
- The preview password opens the site; application sign-in is separate. Do not share staff credentials.
- This temporary link needs this machine, Docker and both preview processes running. A tunnel restart may change its URL.

Private access details: `/tmp/serbizyu-feedback-20261105-58368cf9/access.json` (outside the repository; do not echo or commit its contents).

Running service names: `serbizyu-feedback-ngrok` and `serbizyu-feedback-preview`; both were set to persist across context clearing. The preview uses `serbizyu_pilot_qa_f04_20261103`, private storage under `/tmp/serbizyu-controlled-pilot-qa-f04-20261103`, and an isolated listener on port 8114. The normal app remains separate on port 8080. Recheck availability when resuming; this is not a production deployment.

## Where to put findings

Reviewers can send you a screenshot and a short description. Paste them into this file or the next chat; record one observation per entry.

```text
IMP-001 — Short title
Page / steps:
What happened:
What should happen:
Screenshot or video:
Device / browser / signed-in role:
Status: New
Related GitHub issue: add after triage
```

**Inbox:** No new, untriaged observations recorded yet. Start with IMP-001 when the next finding is supplied; do not invent missing details.

## How we turn notes into work

1. Collect the observations first; do not patch each screenshot immediately.
2. Group repeated issues by shared cause and affected journey.
3. Prioritize blocked/unsafe actions first, then broken behavior, then usability/polish.
4. Match each group to an existing GitHub finish ticket or agree a new bounded issue. GitHub remains the execution source of truth; this file is only the intake.
5. Implement one agreed group with explicit acceptance criteria, focused checks and actual mobile/desktop verification. Record evidence before calling it done.

## Resume after clearing context

Read this file, [the implementation handoff](39-controlled-pilot-implementation-handoff.md), and [the mobile change/evidence record](../../_bmad-output/implementation-artifacts/spec-mobile-layout-collisions.md).

Current UI decisions: five bottom actions; Invitations inside Notifications; mobile cards keep named location rather than distance; Notifications belongs inside each page's existing header, not a separate stacked strip. Preserve these unless new feedback explicitly changes them.

The latest header cut passed 44 focused tests and TypeScript/Vite build, with viewport checks and isolated authenticated smoke. That does not qualify the whole system or physical phones. Existing user WIP and accepted history must remain intact. Re-fetch live #34/child issue states and comments before choosing execution work; do not infer GitHub closure from chat or document summaries.

Next-session prompt:

> Read docs/planning-hardening/40-product-improvement-intake.md. Help me collect and group reviewer feedback before coding. Check the existing GitHub #34 finish scope so we do not duplicate work. Propose one prioritized, bounded improvement group with acceptance criteria, then implement the agreed scope and verify it. Preserve existing WIP and data; no resets, live migrations or broad redesigns. Recheck the protected ngrok preview and keep its credentials private.
