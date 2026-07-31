# Serbizyu 2.0 OpenSpec Workspace

This directory is the change-spec layer for implementation-sized work and the later connected mockup.

BMAD remains the governing product, UX, domain, schema, ADR, architecture, epic, and readiness authority. OpenSpec changes may implement an approved BMAD story or propose a change that reopens the affected BMAD artifact; they may not silently override it.

Read first:

1. `../docs/planning-hardening/09-development-standards-and-bmad-openspec-contract.md`
2. `../docs/planning-hardening/05-artifact-authority-and-supersession-map.md`
3. The selected canonical BMAD artifact and hardened story contract.
4. `../_bmad-output/planning-artifacts/mockup-experience-expansion-bridge.md` for future mockup changes.

Expected layout:

```text
openspec/
├── project.md
├── specs/
│   ├── product/
│   ├── ux/
│   ├── domain/
│   └── mockup/
└── changes/
    └── <change-id>/
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── specs/<capability>/spec.md
```

A draft OpenSpec change is now present for the UX/UI reference dossier:

`changes/create-ux-ui-reference-dossier/`

It is not an approved implementation change. Founder/designer review is still required before the dossier is treated as a locked design input.
