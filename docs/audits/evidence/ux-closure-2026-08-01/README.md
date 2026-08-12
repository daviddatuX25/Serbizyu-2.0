# UX Closure E2E Evidence — 2026-08-01

This directory preserves the parent audit’s bounded public-site headless-Chrome evidence.

Files:

- `serbizyu-e2e-cdp.py` — raw Chrome DevTools Protocol runner.
- `shell.json` — Home/Me/Browse/listing identity/unknown Payments route trace.
- `quickdeal.json` — Quick Deal happy-path and Activity-linkage trace.
- `activity.json` — related-work insertion, Manage Listing, refresh, and Me trace.
- `subagents/route-screen-audit.txt` — successful independent route/screen reviewer report.
- `subagents/canonical-journey-audit.txt` — successful independent canonical-journey reviewer report.
- `subagents/complex-branches-audit.txt` — successful independent complex-branch reviewer report.

Execution target recorded by each trace:

`https://daviddatux25.github.io/Serbizyu-2.0/app/?independent-e2e=1#/`

Example reproduction from repository root:

```bash
python3 docs/audits/evidence/ux-closure-2026-08-01/serbizyu-e2e-cdp.py shell
python3 docs/audits/evidence/ux-closure-2026-08-01/serbizyu-e2e-cdp.py quickdeal
python3 docs/audits/evidence/ux-closure-2026-08-01/serbizyu-e2e-cdp.py activity
```

Prerequisites:

- `/usr/bin/google-chrome`
- Python 3
- Python packages `requests` and `websocket-client`
- network access to the public GitHub Pages target

Limitations:

- The earlier three subagent batches failed; the later batch `deleg_c88715e7` completed three independent browser reviews successfully. Its full summaries are preserved under `subagents/`.
- Parent traces remain useful for exact machine-readable assertions; the subagent reports provide independent corroboration and additional live-navigation evidence.
- JavaScript DOM clicks through real headless Chrome verify the bounded single-browser paths only.
- They do not prove independent two-device or two-party behavior.
- They do not cover camera permission acceptance, backend persistence, live QR transport, real payment, identity, messaging, or server synchronization.
- Screenshots used for the 360×800 review were temporary and are not included here.
