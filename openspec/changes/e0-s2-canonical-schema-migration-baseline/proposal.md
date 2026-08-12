# E0-S2 — Canonical schema migration baseline

Status: DRAFT LLD/OpenSpec — awaiting Data/Backend, Architect, and QA readiness review  
Plane: `C`, `S`  
Story: `E0-S2`  
Train: `T0`  
Change ID: `e0-s2-canonical-schema-migration-baseline`

## Why

Planning authority now freezes a **58-table** canonical inventory (observed **47-table** migrated baseline + **eleven** approved initiative additions). The repository still proves only the 47-table catalog. Without a dedicated E0-S2 packet, any permanent migration or T1 work would make code the silent schema authority.

## What changes

This OpenSpec turns accepted BMAD schema/architecture authority into an executable, reviewable implementation boundary:

1. Exact logical **Batch 000–009** migration manifest and physical file names.
2. **Clean-build** and **observed 47-table baseline** paths that both converge on the same 58-table catalog.
3. Backfill/cutover behavior for business-version, lineage, reservation, ledger, inbox, activation, and approval contracts.
4. PostgreSQL constraints, triggers, indexes, and retention fields required by the canonical schema.
5. Catalog assertions for exactly **58** application tables (excluding `migrations` and `spatial_ref_sys`).
6. Rollback and backup/restore rehearsal contracts with evidence ownership.
7. Implementation **stop/go** gate before T1 or feature migrations.

## Scope

- Disposable PostgreSQL 16 rehearsal only.
- Schema/catalog/constraint/index/checkpoint evidence for E0-S2.
- Expand/contract amendments to existing tables required by the 58-table authority.
- Deterministic local/test factories/seeders declared by Batch 009 (no pilot metrics).
- Operator-facing migration/rollback/restore runbooks referenced by UX-020–UX-031 recovery language where schema failure is visible.

## Non-goals

- No production migration or production data import.
- No T1 application kernel implementation.
- No live Xendit/SMS/provider credentials.
- No sensitive-ID collection.
- No financial posting, payout, or connected-money activation beyond schema/negative constraint tests.
- No user-facing Deal-Chaining, integration API, or AI mutation product surfaces.
- No rewrite that silently discards the observed 47-table baseline as obsolete 46-table history.

## Authority (frozen for this packet)

BMAD remains governing authority. This change implements, and must not override:

| Artifact | Path | SHA-256 (workspace freeze) |
| --- | --- | --- |
| Final readiness report | `_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/FINAL-READINESS-REPORT.md` | `9e3f25ba655991af4ae6407dc566db2e52fdfa33c9457f732abbb5a573720776` |
| Architecture spine | `_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/ARCHITECTURE-SPINE.md` | `b966fec9dd8a252e671eab6da82868ca4497708608fc6de833735564cc73a85b` |
| Program plan | `_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/PROGRAM-IMPLEMENTATION-PLAN.md` | `50f7aca1d63e0373f0d6e3db6f96fdc247cf0d9105a87a78e33e00d74c6ed092` |
| Founder decision brief | `_bmad-output/planning-artifacts/architecture/architecture-serbizyu-platform-2026-08-09/FOUNDER-DECISION-BRIEF.md` | `e7d6bb2c71f96dfc566c03ba036d1776a57d748017add13d4070c69c29851bab` |
| Canonical schema | `_bmad-output/planning-artifacts/canonical-schema-rebuilt.md` | `e1a19bd9fb73903917b127c69b2af426faa0d2a54127dcc0120dee5470c6bb0c` |
| Schema/ERD contract | `docs/planning-hardening/07-schema-implementation-and-erd-contract.md` | `dbda0300a1f56370bc59fc8e73b8a4a11a6631a0fd6072b37e806eb500f8cc05` |
| Canonical ERD SVG | `docs/planning-hardening/07-canonical-erd.svg` | `0c9873b257b60b18e5bd11e0b99ec8adb6627886039885c71956fe4adc493671` |
| E0 story pack | `docs/planning-hardening/06-implementation-story-contract-and-e0-pack.md` | `ba7ada93b0bd2ab528c1399bbae70110e329d20a4ffb22350b639c2f0041fde6` |
| PRD | `_bmad-output/planning-artifacts/prd-rebuilt.md` | `31deb49d783a3e1dcc1dad32fd1b24b9ca929283ef45dcc20e61feb5fa2cb4a9` |
| UX | `_bmad-output/planning-artifacts/ux-spec-rebuilt.md` | `137524a13f370da42ef168fa3b1a430f86383ca3788e421409073ad320c74b6f` |
| Domain/state | `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md` | `6c266a69c5f6ea2d84a991481287c50197c0177232d9a690815587b5ab827e65` |
| Epics/stories | `_bmad-output/planning-artifacts/epics-and-stories-rebuilt.md` | `426ba362a22f27e7d5c0fc64774631a3b9dfcdfb17a336e5e0f771d26ba21adc` |
| BMAD/OpenSpec workflow | `docs/planning-hardening/09-development-standards-and-bmad-openspec-contract.md` | `2ba3eaf0d093b116bd0517e37a7636a61c118769cfcda5cbdc15be3c8ed47d64` |

Direct requirement refs: `PRD-024`, `PRD-032`, `PRD-055`–`PRD-076`; `UX-020`–`UX-031`; `ADR-R-001`–`ADR-R-040` excluding retired IDs; Architecture `AD-1`–`AD-29`; story `E0-S2`.

## Observed baseline ( mechanized )

Current `database/migrations/*.php` create exactly these **47** application tables. Catalog contract test currently asserts the same list.

Missing versus 58-table authority (11):

`category_versions`, `listing_capacity_reservations`, `integration_clients`, `integration_credentials`, `integration_object_mappings`, `integration_webhook_subscriptions`, `integration_webhook_deliveries`, `integration_sync_cursors`, `inbox_messages`, `capability_activations`, `command_approvals`

## Supersession impact

- Supersedes any active “46-table” catalog claim as planning truth.
- Does **not** supersede BMAD schema/ERD/spine documents.
- Does **not** authorize production promotion.
- After readiness PASS, this change becomes the only authorized implementation packet for permanent Batch 000–009 schema work under T0.

## Readiness posture

| Gate | State |
| --- | --- |
| Planning authority reconciled | PASS (Final Readiness Report) |
| This LLD/OpenSpec authored | IN PROGRESS (this change) |
| Disposable empty + brownfield rehearsals | NOT STARTED |
| Catalog/constraint/restore evidence | NOT STARTED |
| Data/Backend + Architect + QA approval | NOT STARTED |
| T1 / feature migrations | **BLOCKED** until stop/go PASS |
