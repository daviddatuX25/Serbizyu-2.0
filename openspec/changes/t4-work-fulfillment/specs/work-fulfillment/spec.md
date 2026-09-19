# Capability Spec — Work Fulfillment & Extension Engine (Common Kernel + A1 First Slice)

Change ID: `t4-work-fulfillment`  
Plane: `C`, `T`, `S`  
Stories: `E3-S2` (A1 Linear Project), `E3-S3` (A3 Appointment — sequenced), `E3-S4` (A4 Handoff — sequenced), `E3-S5` (A4 Purchase-on-behalf — sequenced), `E3-S6` (A9 Digital Delivery — sequenced), `E3-S7` (Cancellation & Closure — sequenced), `E3-S9` (Retained Contract-Version Registry)  
Status: PROPOSED / BLOCKED ON T3 ALIGNMENT PREREQUISITES  

---

## ADDED Requirements

### Requirement: Retained Work Contract-Version Registry & Unsupported Version Parking

The platform MUST maintain a `WorkContractRegistry` that resolves capability profile identifiers and shape codes (`A1`, `A3`, `A4`, `A9`) to immutable shape configurations (`shape_code`, `shape_contract_version`, `payload_schema_version`, and concrete shape strategy handlers). Any command referencing an unsupported, unmapped, or legacy shape code/version MUST park safely with error code `WORK_CONTRACT_VERSION_UNSUPPORTED` and MUST NOT mutate database state.

#### Scenario: Registered A1 shape profile resolves successfully
- **Given** a capability profile pinned to shape code `A1` and contract version `1`
- **When** `WorkContractRegistry::resolveForProfile` is invoked with the profile ID
- **Then** the registry returns the `A1` shape configuration with schema version `1` and the `LinearProjectWorkHandler` strategy.

#### Scenario: Unsupported or unmapped legacy shape string parks without state mutation
- **Given** a work instance with legacy shape string `local_service` or unsupported version `A1.v99`
- **When** any work transition command is dispatched against the instance
- **Then** the command fails with error code `WORK_CONTRACT_VERSION_UNSUPPORTED` and status 422
- **And** no rows in `work_instances` are mutated
- **And** no rows in `work_events` or `outbox_messages` are inserted.

---

### Requirement: Work Instance Start & Execution

The provider (or authorized agent operating under active consent) MUST be able to transition a `not_started` work instance to `in_progress` once the parent Order is accepted. Unauthorized actors MUST be denied.

#### Scenario: Provider starts work instance
- **Given** an accepted Order with a linked Work instance in `not_started` state
- **And** the authenticated actor is the Order's provider
- **When** `StartWorkInstance` is executed with valid expected version and idempotency key
- **Then** the Work instance status transitions to `in_progress`
- **And** `started_at` is set to the current timestamp
- **And** a `work_events` row with event type `work.started` and monotonic sequence number `1` is appended
- **And** an outbox event `WorkStarted` is written atomically.

#### Scenario: Unauthorized actor cannot start work
- **Given** an accepted Order with a Work instance in `not_started` state
- **And** the authenticated actor is the Order's buyer (not provider)
- **When** `StartWorkInstance` is executed
- **Then** the command fails with error code `AUTHORIZATION_DENIED` and status 403
- **And** the Work instance remains in `not_started` state.

---

### Requirement: Progress Logging & Deliverable Evidence Attachment

While a Work instance is `in_progress`, the provider MUST be able to record progress notes and attach optional evidence records. Attached evidence IDs MUST be verified against `WorkEvidencePort`.

#### Scenario: Provider logs milestone progress with verified evidence record
- **Given** a Work instance in `in_progress` state
- **And** a verified evidence record `EVD-101` uploaded by the provider
- **When** `RecordWorkProgress` is executed with progress notes and evidence ID `EVD-101`
- **Then** the Work instance remains `in_progress`
- **And** a `work_events` row with event type `work.progress_recorded`, progress notes, and evidence reference is appended
- **And** the Work aggregate `row_version` is incremented.

#### Scenario: Progress log with invalid or quarantined evidence reference is rejected
- **Given** a Work instance in `in_progress` state
- **When** `RecordWorkProgress` is executed with non-existent or quarantined evidence ID `EVD-999`
- **Then** the command fails with error code `INVALID_EVIDENCE_REFERENCE` and status 422
- **And** no `work_events` row is inserted.

---

### Requirement: Two-Step Completion Proposal & Sign-Off Request Progression

When the provider proposes completion, the Work instance MUST transition from `in_progress` to `completion_proposed` with deliverable snapshots, and then immediately trigger the system `RequestSignoff` transition to `awaiting_signoff` with buyer notification intent emission.

#### Scenario: Provider proposes completion transitioning through completion_proposed to awaiting_signoff
- **Given** a Work instance in `in_progress` state
- **And** valid deliverable completion notes and attached evidence `EVD-202`
- **When** `ProposeWorkCompletion` is executed by the provider
- **Then** the Work instance status transitions to `completion_proposed`
- **And** `completion_proposed_at` is set to the current timestamp
- **And** a `work_events` row with event type `work.completion_proposed` is appended
- **And** the system executes `RequestSignoff` transitioning status to `awaiting_signoff`
- **And** `awaiting_signoff_at` is set to the current timestamp
- **And** a `work_events` row with event type `work.signoff_requested` is appended
- **And** an outbox event `WorkSignoffRequested` is written for asynchronous notification delivery.

#### Scenario: Completion proposal without required deliverables is rejected
- **Given** a Work instance in `in_progress` state
- **When** `ProposeWorkCompletion` is executed with empty completion notes
- **Then** the command fails with error code `INVALID_WORK_PAYLOAD` and status 422
- **And** the Work instance remains `in_progress`.

---

### Requirement: Independent Buyer Sign-Off (Payment Decoupled — SCN-01)

The buyer (or authorized agent) MUST be able to review submitted deliverables and sign off on completion. Work completion MUST be completely independent of payment obligation states; payment confirmation or release events MUST NOT cause Work completion.

#### Scenario: Buyer signs off and marks Work completed
- **Given** a Work instance in `awaiting_signoff` state
- **And** the authenticated actor is the Order's buyer
- **And** no active dispute or administrative hold exists on the Order or Work instance
- **When** `SignOffWorkCompletion` is executed
- **Then** the Work instance status transitions to `completed`
- **And** `completed_at` is set to the current timestamp
- **And** a `work_events` row with event type `work.completed` is appended
- **And** an outbox event `WorkCompleted` is written atomically.

#### Scenario: Payment obligation event cannot mark Work completed (SCN-01)
- **Given** a Work instance in `in_progress` or `awaiting_signoff` state
- **When** a payment obligation confirmation or release event is recorded in `PaymentObligations`
- **Then** the Work instance status remains unchanged
- **And** Work is NOT marked `completed`.

---

### Requirement: Active Dispute or Administrative Hold Blocks Sign-Off (SCN-07)

An active dispute or administrative hold on the Order or Work instance MUST immediately prevent the Work instance from transitioning to `completed` and present clear hold status.

#### Scenario: Sign-off rejected when open dispute exists
- **Given** a Work instance in `awaiting_signoff` state
- **And** an open dispute `DSP-301` attached to the Order
- **When** `SignOffWorkCompletion` is executed by the buyer
- **Then** the command fails with error code `WORK_COMPLETION_HELD` and status 422
- **And** the Work instance remains in `awaiting_signoff` state.

#### Scenario: Sign-off allowed after dispute resolution by Operations
- **Given** a Work instance in `awaiting_signoff` state whose attached dispute `DSP-301` has been formally resolved and hold released by Operations
- **When** `SignOffWorkCompletion` is executed by the buyer
- **Then** the command succeeds and the Work instance transitions to `completed`.

---

### Requirement: Work Revision Request & Limit Enforcement

If deliverables require refinement, the buyer MUST be able to request a revision, returning the Work instance to `in_progress` provided revision limits are not exceeded.

#### Scenario: Buyer requests revision within allowed limit
- **Given** a Work instance in `awaiting_signoff` state with `revisions_allowed = 2` and `revisions_used = 0`
- **When** `RequestWorkRevision` is executed by the buyer with revision notes "Adjust alignment"
- **Then** the Work instance status transitions back to `in_progress`
- **And** `revisions_used` is incremented to `1`
- **And** a `work_events` row with event type `work.revision_requested` is appended.

#### Scenario: Revision request exceeding allowed limit is rejected
- **Given** a Work instance in `awaiting_signoff` state with `revisions_allowed = 1` and `revisions_used = 1`
- **When** `RequestWorkRevision` is executed by the buyer
- **Then** the command fails with error code `REVISION_LIMIT_EXCEEDED` and status 422
- **And** the Work instance remains in `awaiting_signoff` state.

---

### Requirement: Ordered Work Events Envelope & Inbox Deduplication / Gap Parking

Work events MUST carry full metadata (monotonic sequence, actor context, correlation/causation IDs, SHA-256 payload checksum), and consumer inboxes MUST detect duplicate events and park sequence gaps safely.

#### Scenario: Monotonic sequence generated for append-only work events
- **Given** a Work instance currently at sequence number `2`
- **When** `RecordWorkProgress` is executed successfully
- **Then** the newly inserted `work_events` row is assigned sequence number `3`
- **And** `payload_checksum` matches the SHA-256 hash of the JSON payload.

#### Scenario: Consumer inbox detects duplicate event and ignores replay
- **Given** an inbox consumer that has already processed event `EVT-001`
- **When** `EVT-001` is received again by the consumer
- **Then** the consumer acknowledges the message with no state mutation and no duplicate processing.

#### Scenario: Consumer inbox detects sequence gap and parks pending event
- **Given** an inbox consumer with last processed sequence `1`
- **When** an incoming event for the aggregate is received with sequence `3`
- **Then** the consumer records the message in `inbox_messages` with status `gapped`
- **And** the consumer triggers an asynchronous gap backfill fetch.

---

### Requirement: Actor Context & Acting-For Consent Enforcement

Commands submitted by an Agent acting for an owner MUST carry an active, unrevoked consent grant covering the specific command scope. Expired or revoked grants MUST be denied.

#### Scenario: Authorized Agent with valid consent grant executes work action
- **Given** an active, unrevoked consent grant `GNT-100` granting Agent `user_agent_1` the scope `work:progress:write` for Provider `user_prov_1`
- **When** Agent `user_agent_1` executes `RecordWorkProgress` on Provider's work instance
- **Then** the command succeeds
- **And** `work_events` attributes `actor_user_id = user_agent_1` and `acting_for_user_id = user_prov_1`.

#### Scenario: Agent with expired or revoked consent grant is denied
- **Given** a consent grant `GNT-200` that has been revoked or expired
- **When** Agent `user_agent_1` attempts to execute `SignOffWorkCompletion`
- **Then** the command fails with error code `CONSENT_GRANT_INVALID` and status 403
- **And** zero database rows are mutated.

---

### Requirement: Notification Intent vs Delivery Decoupling

The execution of domain commands MUST NOT depend synchronously on external notification delivery (SMS/email/push). Notification intent is committed atomically to the Outbox, and delivery is handled asynchronously with retry and dead-letter escalation.

#### Scenario: Work transition succeeds even if notification worker encounters transient error
- **Given** a valid `ProposeWorkCompletion` command
- **When** the transaction commits `awaiting_signoff` and writes `WorkSignoffRequested` to the outbox
- **And** the background notification delivery worker experiences an external SMS timeout
- **Then** the Work instance remains validly in `awaiting_signoff`
- **And** the notification worker retries with exponential backoff without corrupting domain state.

---

### Requirement: Idempotent Command Execution and Concurrency Safety

All mutating Work commands MUST enforce idempotency via `IdempotencyGuard` and optimistic concurrency via `row_version`.

#### Scenario: Duplicate command with identical key returns cached response
- **Given** a previously successful `StartWorkInstance` execution with idempotency key `idem-wk-001`
- **When** `StartWorkInstance` is re-executed with the identical key and fingerprint
- **Then** the engine returns the cached 200 OK response
- **And** no duplicate database rows in `work_events` or `audit_records` are created.

#### Scenario: Command with stale expected version fails with concurrency conflict
- **Given** a Work instance currently at `row_version = 2`
- **When** a mutating command is submitted with `expected_version = 1`
- **Then** the command fails with error code `CONCURRENCY_CONFLICT` and status 409
- **And** no database mutation occurs.

---

### Requirement: Web Surface Integration via Inertia Orders/Show & Low-Data Resilience

All Work actions MUST be accessible through standard Inertia POST actions on the existing `/orders/{order}` route, returning standard redirects, flash banners, and error bags. The interface MUST render cleanly in low-data / minimal-image mode with point-of-risk safety notices.

#### Scenario: Inertia POST action succeeds and redirects with flash message
- **Given** an authenticated provider on `Orders/Show`
- **When** a valid `POST /orders/{order}/work/start` request is submitted
- **Then** the response is a 302 redirect back to `orders.show`
- **And** `session('flash.banner')` contains `"Work started successfully."`
- **And** the updated Work status `in_progress` is reflected on the page.

#### Scenario: Low-data mode renders accessible text deliverables without images
- **Given** a buyer on low-bandwidth connection with low-data mode active
- **When** `Orders/Show` is rendered for an order in `awaiting_signoff`
- **Then** evidence images are replaced with text metadata descriptors and direct download links
- **And** point-of-risk safety guidance is clearly visible inline.
