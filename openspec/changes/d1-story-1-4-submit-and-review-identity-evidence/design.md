# Design — D1-Story-1.4: Submit and Review Identity Evidence Safely

## Change ID
`d1-story-1-4-submit-and-review-identity-evidence`

## Architectural Context
Serbizyu 2.0 enforces a strict distinction between device-level performance degradation tiers (`L0`–`L4`) and human trust dimensions:
1. **Market Roles**: `Buyer`, `Provider`, `Merchant`, `Agent`, `Admin`
2. **Participation Mode**: `Direct` vs `Agent-Assisted`
3. **Trust & Verification Ladder**:
   - `Level 1: Phone Verified` (OTP verified canonical E.164 mobile)
   - `Level 2: Barangay Endorsed` (Barangay certificate reviewed & approved)
   - `Level 3: Formally Verified` (Government ID or Trade License reviewed & approved)

Sensitive documents must never be placed in world-readable buckets or public asset folders. All uploads target private disk storage (`Storage::disk('private')` or root `storage_path('app/private')`) with SHA-256 integrity verification, virus scan flags, and retention policies.

---

## 1. Domain Entities & Database Schema

### `evidence_files` (Existing Schema)
- `id` (UUID): Primary identifier.
- `owner_user_id` (UUID FK): Uploader account.
- `storage_key` (Text Unique): Path within private storage disk (e.g. `evidence/identity/{owner_id}/{id}.{ext}`).
- `media_type` (Text): Validated MIME type (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
- `size_bytes` (BigInt): File size in bytes.
- `content_hash` (Char 64): SHA-256 digest of raw bytes.
- `evidence_type` (Text): `barangay_certificate`, `government_id`, `trade_license`.
- `data_class` (Text): `RESTRICTED_PII`.
- `scan_status` (Text Check): `pending`, `clean`, `quarantined`, `infected`, `failed`.
- `visibility` (Text): `private`.
- `retention_policy` (Text): `standard_7y` or `identity_retention_90d`.
- `deleted_at` (TimestampTz Nullable): Soft/purged deletion marker.

### `identity_verifications` (Existing Schema)
- `id` (UUID): Verification attempt identifier.
- `user_id` (UUID FK): Subject participant.
- `verification_type` (Text): `barangay_certificate`, `government_id`, `trade_license`.
- `status` (Text Check): `pending`, `more_info`, `approved`, `rejected`, `expired`.
- `provider` (Text): `manual_review`.
- `reviewed_by_user_id` (UUID FK Nullable): Reviewer user ID (must hold `admin` role).
- `evidence_file_id` (UUID FK Nullable): Linked `evidence_files.id`.
- `reason` (Text Nullable): Sanitized non-disclosing rejection reason code.
- `reviewed_at` (TimestampTz Nullable): Decision timestamp.
- `retention_class` (Text): `identity_evidence_p1`.

### `retention_holds` (Existing Schema)
- `id` (UUID): Primary hold record.
- `evidence_file_id` (UUID FK): Target evidence file.
- `hold_type` (Text): `legal_compliance`, `active_dispute`, `regulatory_audit`.
- `status` (Text Check): `active`, `released`, `expired`.
- `placed_by_user_id` (UUID FK): Operator who placed the hold.
- `starts_at` (TimestampTz): Hold start.
- `released_at` (TimestampTz Nullable): Release timestamp.

### PostgreSQL Database Trigger Guard
- `evidence_files_retention_hold_guard`: Prevents row deletion in `evidence_files` when an active hold exists in `retention_holds`.

---

## 2. State Transition & Monotonic Progression

```
[Level 0: Unverified]
       |
       | Mobile OTP Verified (phone_verified_at set)
       v
[Level 1: Phone Verified]
       |
       | Submit & Approve 'barangay_certificate'
       v
[Level 2: Barangay Endorsed]
       |
       | Submit & Approve 'government_id' or 'trade_license'
       | (requires serbizyu.identity.live_government_id_collection = true)
       v
[Level 3: Formally Verified]
```

### Invariants:
1. **No Level Skipping**: User cannot apply for or attain Level 3 without having first attained Level 2.
2. **Rejection Never Demotes**: If a Level 2 user submits a Government ID that is subsequently rejected, the user remains Level 2.
3. **Pending Never Demotes**: A pending re-verification does not alter the currently achieved approved level.
4. **Baseline Invariant**: A phone-verified user never demotes below Level 1.

---

## 3. Non-Disclosing Rejection Reasons

To protect internal security signals and avoid leaking sensitive personal information or fraud detection heuristics, reviewer rejections MUST select from the following authorized dictionary:

| Reason Code | Non-Disclosing Message |
|---|---|
| `DOCUMENT_UNREADABLE` | "The submitted document is unreadable, blurry, or low quality." |
| `NAME_MISMATCH` | "The name on the document does not match the account profile." |
| `DOCUMENT_EXPIRED` | "The submitted document has expired." |
| `INVALID_DOCUMENT_TYPE` | "The document provided is not an accepted document type." |
| `INCOMPLETE_DOCUMENT` | "The document is incomplete, cropped, or missing required pages." |
| `SUSPECTED_ALTERATION` | "The document cannot be verified in its current state." |

---

## 4. Security & Privacy Boundaries

1. **Storage Isolation**: Raw evidence is written to the private disk with restricted file permissions and non-guessable UUID storage keys.
2. **Access Control**:
   - `GET /account/identity/evidence/{id}/file`: Accessible ONLY by the document owner or an authenticated user with the active `admin` role. All other users receive HTTP 403.
   - Quarantined or infected documents (`scan_status != 'clean'`) cannot be downloaded directly.
3. **Maker-Checker Separation**: An admin cannot approve their own verification (`reviewer_id != subject_user_id`).
4. **Public Trust Projections**: Public views (`GET /users/{id}/trust-profile`) emit only:
   - `trust_level`: `1` | `2` | `3`
   - `trust_badge`: `phone_verified` | `barangay_endorsed` | `formally_verified`
   - `trust_label`: Human-readable label
   Under no circumstances are raw document URLs, file IDs, or storage keys exposed in public projections.

---

## 5. Audit Logging Architecture

Every verification review event emits an entry into `audit_events` via `AuditRecorder`:
- `action`: `identity_verification.approved` | `identity_verification.rejected`
- `actor_user_id`: Reviewer's user ID
- `target_type`: `identity_verification`
- `target_id`: Verification UUID
- `previous_value_summary`: `{"status": "pending"}`
- `new_value_summary`: `{"status": "approved"|"rejected", "reason": "..."}`
- `correlation_id`: Current request correlation UUID
- `occurred_at`: Review timestamp
