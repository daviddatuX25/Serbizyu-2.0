# Serbizyu 2.0 — Reference Prototype v2

This is a disposable visual feedback prototype, not application implementation.

## Scope

- Static HTML/CSS/JS only.
- No backend, database, authentication, real persistence, live payments, or identity verification.
- Hash routes provide organized navigation.
- Small in-memory demo state lets a few buttons show the intended relationship between Buyer, Provider, and Operations views.
- The old phone wrapper is intentionally removed; screens are presented as a desktop/workspace reference layout.

## Open it

Serve the repository with any static server and open:

```text
docs/mockup-v2/index.html
```

Example:

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173/docs/mockup-v2/index.html`.

## Current routes

- `#/buyer/home`
- `#/buyer/discover`
- `#/buyer/request`
- `#/buyer/review`
- `#/provider/inbox`
- `#/provider/work`
- `#/admin/operations`
- `#/admin/audit`

## Feedback boundary

Review the copy, hierarchy, action placement, role perspective, payment/work separation, support language, and safety cues. Do not treat the demo state as a backend design or proof that the business behavior is implemented.

Historical screens remain under `old-docs/` and are visual input only. This v2 prototype is the current disposable reference surface for feedback, but it is not yet canonical product behavior.
