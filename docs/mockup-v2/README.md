# Serbizyu 2.0 — Connected Mockup (lo-fi, reference only)

Status: SCAFFOLDING IN PROGRESS · REFERENCE ONLY · no backend · fictional fixtures
Built from: `docs/design-kit/` element suite, guided by `docs/design-kit/SCAFFOLD-GUIDE.md`

## Open it

```bash
cd /home/user/Serbizyu-2.0
python3 -m http.server 4173 --bind 127.0.0.1
# → http://127.0.0.1:4173/docs/mockup-v2/
```

## What exists

| Area | Status |
|---|---|
| Shell (picker, shared assets, mockup.js) | ✅ |
| SCN-01 — A1 low-value service · External Cash (17 screens, 3 role views) | ✅ |
| SCN-02 … SCN-09 | ⏳ in progress |

## How to review SCN-01

1. Open the picker → `SCN-01`.
2. Walk the route: Discover → Order → Work + Payment → Completion.
3. Use the role switcher (Buyer / Provider / Admin) — the fixture state is shared; only permissions and next actions change.
4. Try the recovery branch: on `PAY-003`/`PAY-004` press `Report a mismatch` (or leave the Provider side unreported).
5. Answer the feedback task: *Did Serbizyu receive or hold the ₱80?* Intended answer: **No** — the Buyer paid the Provider directly; Serbizyu only records declarations.

## Hard rules applied

- One file per canonical screen ID; each carries its ID badge, actor badge, goal, primary action, recovery variant, and prev/next route links.
- Payment ≠ Work everywhere (separation panel).
- External Cash is two-sided: `buyer_reported` / `provider_reported` / `mutually_acknowledged`.
- Sandbox/reference labels are part of every element and never removable.
- No invented policy: anything undefined uses the policy-TBD pattern or an explicit "support" route.
- Only fictional fixture data (BUYER-01, PROVIDER-01, ₱80, capstone_demo).

## Files

```text
docs/mockup-v2/
├── index.html          ← scenario picker (SYS-001)
├── assets/
│   ├── dk.css          ← copy of docs/design-kit/styles.css (do not edit here)
│   └── mockup.js       ← role switcher, two-sided cash demo, guard checklist, modal
├── scn-01/             ← SCN-01 route screens (17 files)
└── README.md
```

## Open questions (for David)

- None yet — anything undefined was routed to "support" or the policy-TBD pattern instead of invented.
