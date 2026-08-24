# Project Scope Statement

## Confirmed Project Direction

Serbizyu is a Philippines-based local-services marketplace intended for a controlled pilot of **10–20 total participants**. The full vision covers the buyer and provider marketplace, provider referrals through Deal Chaining, a separate Quick Deals experience, administrative review, and simulated transaction handling. Implementation will be phased: the core marketplace is built first, while the advanced offline QR flow and live payment integration are conditional extensions.

## A. Project Information

| Field | Details |
| --- | --- |
| Project Title | Serbizyu |
| Project Manager / Team Leader | David Datu N. Sarmiento |
| Project Team | David Datu N. Sarmiento; Jaypee G. Pagaduan; Christine M. Lopez; Prince John Vidaña |
| Client / Organization | Mrs. Mary Jane Hipol — Project Instructor |
| Date Prepared |  |

## B. Project Purpose

Serbizyu is being developed to connect local buyers with service providers through one marketplace where providers can present their services, receive opportunities, refer work to other providers, and negotiate or activate Quick Deals. The system is intended to make local service discovery and provider collaboration more organized, traceable, and accessible while giving the project team a controlled platform for demonstrating marketplace, referral-chain, QR, administration, and transaction concepts.

## C. Project Objectives

| No. | Objective | Expected Result |
| --- | --- | --- |
| 1 | Connect local buyers and providers through role-based accounts, profiles, service listings, and discovery tools. | Participants can register, maintain the appropriate profile, publish or find services, and view relevant service information. |
| 2 | Support provider referrals through a traceable Deal-Chaining workflow. | A provider can refer work to another provider while the system records parent/child deal relationships and status changes. |
| 3 | Provide a separate Quick Deals experience for fast offer negotiation and agreement. | Participants can use the Quick Deals interface to review offers, adjust proposed amounts, and record an agreed deal. |
| 4 | Demonstrate controlled administration, simulated transactions, and pilot readiness. | Admin-reviewed categories, simulated payment states, testing evidence, and a pilot deployment for 10–20 participants are available; live Xendit integration remains conditional on approval. |

## D. Project Scope – Inclusions

| No. | Included Feature / Activity | Description |
| --- | --- | --- |
| 1 | Buyer and Provider accounts | Role-aware registration, sign-in/access, and account information for the two primary marketplace roles. |
| 2 | Profiles and privacy controls | Provider and buyer profile information presented according to the approved visibility rules. |
| 3 | Service listings and discovery | Providers create and manage fixed-category service listings; buyers browse, search, and inspect available services. |
| 4 | Category administration | Providers may submit new category requests; an Admin reviews, approves, or rejects requests. Categories remain configurable through application configuration or database-managed data. |
| 5 | Service requests and deal status | The system records the progression from service interest or request through provider response, acceptance, work, completion, and relevant exceptions. |
| 6 | Quick Deals interface | A separate Quick Deals experience supports fast offer negotiation, counter-offers, quick amount adjustments, and agreement recording. The approved specification includes an Air-Gapped Optical QR Handshake with animated TXQR/Fountain-Code transport, a split Camera/Canvas view, continuous camera scanning, and haptic controls; these advanced parts are implemented in a later phase or pilot extension. |
| 7 | Provider referral Deal Chaining | Provider-to-provider referrals are represented as traceable parent/child deal relationships with chain status and budget-boundary rules defined by the architectural specification. |
| 8 | Simulated transactions and dispute records | Payment, settlement, payout, refund, receipt, and dispute states are simulated for demonstration without moving real funds. |
| 9 | Administration and moderation | Admin controls for category review, account/content oversight, and pilot support. |
| 10 | Pilot deployment and evaluation | Controlled deployment and usability/functional evaluation with 10–20 total local participants, followed by documentation and final presentation. |

## E. Project Scope – Exclusions

| No. | Excluded Feature / Activity | Reason |
| --- | --- | --- |
| 1 | Live payment processing and real-money settlement by default | The first delivery uses simulated transactions; Xendit becomes a live integration only if approval, credentials, and project readiness are obtained. |
| 2 | Unrestricted public or national-scale launch | The initial deployment is a controlled local pilot limited to 10–20 total participants. |
| 3 | Fixed calendar commitments and final budget values | The team has not confirmed exact dates, duration, or budget; these remain to be completed in the planning record. |
| 4 | Production guarantees beyond the pilot | High-scale availability, formal service-level commitments, and broad operational support are outside the academic pilot boundary. |

## F. Major Deliverables

| No. | Deliverable | Description |
| --- | --- | --- |
| 1 | Project Proposal | Approved statement of the Serbizyu problem, objectives, users, and intended pilot. |
| 2 | Requirements Document | Functional and quality requirements for the marketplace, Quick Deals, Deal Chaining, administration, and simulated transactions. |
| 3 | System Design | Architecture, domain/data model, interfaces, security boundaries, QR workflow design, and phased implementation plan. |
| 4 | Developed System | Working phased Laravel/Inertia marketplace with the approved buyer/provider, listing, admin, Quick Deals, Deal-Chaining, and simulation capabilities. |
| 5 | Testing Report | Unit, feature/integration, browser/usability, and pilot evidence with recorded defects and resolutions. |
| 6 | User Manual | Instructions for buyers, providers, administrators, and pilot evaluators. |
| 7 | Final Presentation | Demonstration, pilot findings, limitations, future Xendit decision, and project evaluation for the November defense. |

## G. Scope Constraints

| Constraint | Description |
| --- | --- |
| Time | Exact dates and duration are still undecided. Development is expected around the last week of September or October, with final defense in November. |
| Budget | Exact budget is undecided; the initial system uses simulated transactions and available project resources. |
| Technology | The implementation follows the existing Laravel/Inertia/React application direction, configurable categories, phased marketplace delivery, and the approved Quick Deal/Deal-Chaining architecture. |
| Personnel | Four named team members remain assigned under the existing generic Project Manager, Developer, UI/UX Designer, and QA Tester role labels. |
| Other | The pilot targets a small local Philippines participant group of 10–20 total users; the instructor is the client/reviewer for the project documents. |

## H. Scope Approval

| Prepared by | Reviewed by |  |
| --- | --- | --- |
| Project Team — David Datu N. Sarmiento, Jaypee G. Pagaduan, Christine M. Lopez, Prince John Vidaña | Project Instructor — Mrs. Mary Jane Hipol |  |
| Signature: __________________ | Signature: __________________ |  |
| Date: __________________ | Date: __________________ |  |

# Work Breakdown Structure (WBS)

The WBS breaks the full Serbizyu vision into manageable phases, deliverables, and implementation tasks. The feature scope is complete at the vision level; delivery is phased to protect the pilot schedule.

| WBS Code | Project Phase / Task | Description | Deliverable | Person Responsible |
| --- | --- | --- | --- | --- |
| **1.0** | **Project Initiation** | Confirm the local-services marketplace problem, participants, client, and project boundaries. | Approved project direction | Project Manager |
| 1.1 | Identify Project | Define Serbizyu, its balanced buyer/provider purpose, and the 10–20 participant pilot. | Problem and opportunity statement | Project Manager |
| 1.2 | Identify Stakeholders | Confirm the project instructor, team, buyers, providers, and administrators. | Stakeholder list | Project Manager |
| 1.3 | Prepare Project Charter | Record objectives, scope, constraints, risks, and approval path. | Project charter | Project Team |
| **2.0** | **Project Planning** | Establish the phased plan for the full product vision. | Approved project plan | Project Manager |
| 2.1 | Requirements Planning | Define buyer, provider, admin, Quick Deals, Deal Chaining, and transaction requirements. | Requirements outline | Project Manager / Developer |
| 2.2 | Scope Planning | Separate core marketplace delivery from conditional offline QR and Xendit extensions. | Approved scope baseline | Project Team |
| 2.3 | Schedule Planning | Set dates after the academic calendar is confirmed; preserve the November defense target. | Project schedule | Project Manager |
| 2.4 | Risk Planning | Address scope size, participant recruitment, QR complexity, and payment approval risks. | Risk register | Project Manager / QA Tester |
| **3.0** | **Requirements Analysis** | Convert the vision into testable workflows and acceptance criteria. | Requirements document | Developer / QA Tester |
| 3.1 | Gather Requirements | Capture buyer/provider marketplace, referral, Quick Deal, category, admin, and simulation needs. | Interview/workshop notes | Project Team |
| 3.2 | Analyze Requirements | Resolve state transitions, permissions, category review, referral ownership, and transaction boundaries. | Analyzed requirements | Developer |
| 3.3 | Document Requirements | Produce stable functional requirements and pilot acceptance scenarios. | Approved requirements document | Project Manager |
| **4.0** | **System Design** | Design the modular marketplace and phased advanced workflows. | System design package | Developer / UI/UX Designer |
| 4.1 | System Architecture | Maintain the existing application architecture and boundaries. | Architecture design | Developer |
| 4.2 | Database Design | Model users, profiles, listings, categories, requests, deals, referrals, transactions, reviews, and admin states. | Data model and migrations plan | Developer |
| 4.3 | Interface Design | Design responsive marketplace, Quick Deals Camera/Canvas, admin review, and pilot flows. | UI/UX designs | UI/UX Designer |
| **5.0** | **Development** | Implement the approved capabilities in dependency order. | Working system increments | Developer |
| 5.1 | Foundation and Access | Implement account, access, role, profile, and privacy foundations. | Working identity/profile foundation | Developer |
| 5.2 | Marketplace and Categories | Implement listings, discovery, configurable categories, and Admin category review. | Working marketplace foundation | Developer |
| 5.3 | Requests and Provider Referrals | Implement service requests, provider referral Deal Chaining, and chain status. | Working referral workflow | Developer |
| 5.4 | Quick Deals | Implement the separate Quick Deals interface, negotiation state, and phased QR workflow. | Working Quick Deals increment | Developer / UI/UX Designer |
| 5.5 | Transactions and Administration | Implement simulated settlement/dispute states and Admin oversight. | Working simulation and admin tools | Developer |
| **6.0** | **Testing** | Verify each increment and the complete pilot journey. | Testing evidence | QA Tester |
| 6.1 | Unit Testing | Verify domain rules, permissions, category review, deal states, and budget boundaries. | Unit test results | QA Tester / Developer |
| 6.2 | Integration Testing | Verify persistence, referral chains, simulated transactions, and Admin workflows. | Integration test results | QA Tester |
| 6.3 | System and Pilot Testing | Exercise buyer/provider journeys with 10–20 participants and record feedback. | Pilot test report | QA Tester / Project Team |
| **7.0** | **Deployment** | Prepare the controlled pilot and demonstration environment. | Pilot deployment | Project Team |
| 7.1 | System Installation | Deploy the approved system to the pilot environment. | Running pilot instance | Developer |
| 7.2 | User Training | Brief buyers, providers, administrators, and evaluators on the pilot flows. | User orientation | Project Team |
| **8.0** | **Project Closing** | Package evidence, documentation, defense materials, and evaluation. | Project closeout package | Project Team |
| 8.1 | Documentation | Finalize requirements, design, testing, limitations, and user manual. | Final documentation | Project Team |
| 8.2 | Final Presentation | Demonstrate the pilot and explain phased extensions, including optional Xendit integration. | Defense presentation | Project Team |
| 8.3 | Project Evaluation | Review pilot results, defects, feedback, and future work. | Evaluation report | Project Manager / Project Instructor |

## Simple WBS Structure

```text
1.0 PROJECT
│
├── 1.0 Initiation
│   ├── 1.1 Project Identification
│   ├── 1.2 Stakeholder Identification
│   └── 1.3 Project Charter
│
├── 2.0 Planning
│   ├── 2.1 Requirements
│   ├── 2.2 Scope and Phasing
│   ├── 2.3 Schedule
│   └── 2.4 Risks
│
├── 3.0 Requirements Analysis
│   ├── 3.1 Marketplace Requirements
│   ├── 3.2 Quick Deals and QR Requirements
│   ├── 3.3 Deal-Chaining Requirements
│   └── 3.4 Transaction and Admin Requirements
│
├── 4.0 System Design
│   ├── 4.1 Architecture
│   ├── 4.2 Database Design
│   └── 4.3 Interface Design
│
├── 5.0 Development
│   ├── 5.1 Foundation and Access
│   ├── 5.2 Marketplace and Categories
│   ├── 5.3 Provider Referral Chains
│   ├── 5.4 Quick Deals
│   └── 5.5 Transactions and Administration
│
├── 6.0 Testing
│
├── 7.0 Pilot Deployment
│
└── 8.0 Closing and Defense
```

# Project Schedule

The project schedule identifies the activities, people responsible, duration, dates, and dependencies. Exact dates remain **TBD**. Development is expected around the last week of September or October, and the final defense is expected in November.

## Project Schedule Template

| WBS Code | Activity | Responsible Person | Start Date | End Date | Duration | Predecessor | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | Project Identification | Project Manager |  |  |  |  |  |
| 1.2 | Stakeholder Analysis | Project Manager |  |  |  | 1.1 |  |
| 1.3 | Project Charter | Project Team |  |  |  | 1.2 |  |
| 2.1 | Requirements Gathering | Project Manager / Developer |  |  |  | 1.3 |  |
| 2.2 | Requirements Analysis | Developer / QA Tester |  |  |  | 2.1 |  |
| 3.1 | System Design | Developer / UI/UX Designer |  |  |  | 2.2 |  |
| 3.2 | Database Design | Developer |  |  |  | 3.1 |  |
| 4.1 | Foundation and Marketplace Development | Developer |  |  |  | 3.2 |  |
| 4.2 | Quick Deals and Deal Chaining | Developer / UI/UX Designer |  |  |  | 4.1 |  |
| 4.3 | Admin and Simulated Transactions | Developer |  |  |  | 4.2 |  |
| 5.1 | Testing | QA Tester |  |  |  | 4.3 |  |
| 5.2 | Bug Fixing | Developer / QA Tester |  |  |  | 5.1 |  |
| 6.1 | Pilot Deployment | Project Team |  |  |  | 5.2 |  |
| 6.2 | User Training | Project Team |  |  |  | 6.1 |  |
| 7.1 | Final Documentation | Project Team |  |  |  | 6.2 |  |
| 7.2 | Final Presentation / November Defense | Project Team | November |  |  | 7.1 |  |

### Status Options

- Not Started
- In Progress
- Completed
- Delayed
- On Hold

# Gantt Chart

A Gantt chart presents the project schedule visually using a timeline. The week assignments remain blank until the team confirms the academic calendar.

## Simple Gantt Chart Template

| Activity | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1. Project Initiation** |  |  |  |  |  |  |  |  |  |  |
| **2. Project Planning** |  |  |  |  |  |  |  |  |  |  |
| **3. Requirements Analysis** |  |  |  |  |  |  |  |  |  |  |
| **4. System Design** |  |  |  |  |  |  |  |  |  |  |
| **5. Development** |  |  |  |  |  |  |  |  |  |  |
| Foundation and Marketplace |  |  |  |  |  |  |  |  |  |  |
| Quick Deals and Deal Chaining |  |  |  |  |  |  |  |  |  |  |
| Admin and Simulated Transactions |  |  |  |  |  |  |  |  |  |  |
| **6. Testing** |  |  |  |  |  |  |  |  |  |  |
| **7. Pilot Deployment** |  |  |  |  |  |  |  |  |  |  |
| **8. Closing and November Defense** |  |  |  |  |  |  |  |  |  |  |

**Legend:** ■ = scheduled work period

---

_Source: [Google Docs document](https://docs.google.com/document/d/1iHIE2jmAYchopByWbcSUe2nWI4406zie/edit)_
