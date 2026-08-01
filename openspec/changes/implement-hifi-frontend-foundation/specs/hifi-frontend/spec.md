# High-Fidelity Frontend Foundation Capability

Status: ACTIVE IMPLEMENTATION SLICE
Change: `implement-hifi-frontend-foundation`

## Requirement 1 — Real frontend foundation

The system SHALL provide a compiling React 19.2 + TypeScript 5.9 + Vite 7 frontend whose presentation code can migrate into the future Laravel/Inertia application.

### Scenario: Production build

- **Given** the frontend dependencies are installed,
- **When** typecheck and production build run,
- **Then** they complete without errors and emit the GitHub Pages review artifact.

## Requirement 2 — One role-adaptive shell

The frontend SHALL use one application shell with a persistent Buyer / Provider / Admin role switcher rather than duplicating each UX flow into separate static pages.

### Scenario: Switch role in shared context

- **Given** a shared fictional Order is open,
- **When** the reviewer switches role,
- **Then** hierarchy, allowed actions, and next-responsible guidance change while the shared Order facts remain stable.

## Requirement 3 — Expressive visual foundation

The frontend SHALL include an intentional token system, reusable primitives, meaningful iconography, responsive compositions, and visible default/loading/empty/offline/stale/success/warning/error/recovery states.

### Scenario: Review the pattern lab

- **Given** the reviewer opens Pattern Lab,
- **When** they inspect foundations and product-specific patterns,
- **Then** they can judge the future product direction without relying on lo-fi wireframes.

## Requirement 4 — Continuous request composer

The frontend SHALL capture a request through one continuous experience rather than separate routes per step.

### Scenario: Create fictional request

- **Given** the Buyer opens the request composer,
- **When** they enter the need, details, amount, and lane and review it,
- **Then** the synthetic request is created in mock state and visible in the application without a backend.

## Requirement 5 — Work and payment separation

The Deal Room and Payments surfaces SHALL keep Order, Work, and Payment Obligation states visibly independent.

### Scenario: Report cash

- **Given** External Cash is selected,
- **When** the Buyer reports cash paid,
- **Then** payment shows `buyer_reported`, the Provider report remains missing, and Work does not change.

## Requirement 6 — Sandbox and evidence truthfulness

The frontend SHALL keep Direct Digital and Tiwala persistently sandbox-only and SHALL not present External Digital Proof submission as automatic verification.

### Scenario: Inspect lane cards

- **Given** the reviewer opens Payments,
- **When** they compare all lanes,
- **Then** custody, protection, evidence meaning, fee, availability, and sandbox status are explicit.

## Requirement 7 — Static review publication

The production build SHALL be publishable from the existing GitHub Pages `/docs` source.

### Scenario: Public review

- **Given** the build is pushed to `planning-hardening`,
- **When** Pages completes,
- **Then** `/Serbizyu-2.0/app/` and its assets return HTTP 200.
