# Domain Docs

How engineering skills consume this repo's domain documentation.

## Before exploring

- Read root `CONTEXT.md`, or `CONTEXT-MAP.md` if it exists.
- Read relevant decisions in `docs/adr/`.
- If these files don't exist, proceed silently; create them only when a domain term or decision needs recording.

## Layout

This is a single-context repo:

/
├── CONTEXT.md
└── docs/adr/

## Use the glossary

Use terms as defined in `CONTEXT.md`. If the concept is missing, note the gap rather than inventing a project term.

## Flag conflicts

If a proposed decision contradicts an ADR, surface the conflict instead of silently overriding it.
