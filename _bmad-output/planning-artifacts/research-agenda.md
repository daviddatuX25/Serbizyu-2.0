# Serbizyu — Strategic Research Agenda

> *What still needs deeper investigation — legal, regulatory, and strategic — before and during Phase 2 planning. This document identifies the open legal questions, the needed expert consultations, and the strategic unknowns that research alone cannot resolve.*

---

## Priority Matrix

| Priority | Area | Type | Dependency | Effort | Impact |
|---|---|---|---|---|---|
| **P0** | BSP Payment Architecture — MSB vs OPS | Legal consultation | Xendit partnership design | High (₱50-100K) | **Critical** — determines payment flow legality |
| **P0** | Agent Model — DOLE classification risk | Legal review | Agent agreement drafting | Medium | **Critical** — misclassification = back wages |
| **P1** | BIR RR 16-2023 — Service marketplace applicability confirmation | Legal validation | None | Low | High — confirms withholding obligation |
| **P1** | BIR Sworn Declaration template & process | Compliance research | None | Low | High — required for servicer onboarding |
| **P1** | BMBE registration process per municipality (Candon) | Field research | None | Medium | High — key servicer incentive |
| **P2** | Escrow legal posture — cash vs digital | Legal research | Xendit partnership | Medium | Medium — affects cash deal design |
| **P2** | DTI / SEC business registration for platform entity | Corporate compliance | None | Low | Medium — entity must exist to operate |
| **P2** | Municipal permits (mayor's permit, barangay clearance) per town | Field research | Town selection | Medium | Medium — each LGU has different requirements |
| **P3** | Professional regulation — which services need licensed practitioners | Legal research | Category list | Medium | Low-Medium — affects specific categories |
| **P3** | Insurance liability for agent-facilitated transactions | Market research | Agent model spec | Medium | Low — deferred to post-launch |

---

## P0 — Critical Path Research Items

### 1. BSP Payment Architecture: MSB vs OPS

**The Question:**
Does Serbizyu's planned payment flow — where the platform operates an internal ledger tracking holds/releases while Xendit handles actual fund custody — require BSP registration as an Operator of Payment Systems (OPS) or a full Money Service Business (MSB) license?

**What we know:**
- MyKuya operates as a BSP-supervised OPS (not MSB) — strongest precedent
- Xendit offers a Marketplace API where Xendit handles KYC, fund custody, and settlement
- Internal ledger tracking obligations alone is likely NOT money transmission
- MSB minimum capital: ₱50M (prohibitive for startup)

**What we DON'T know (needs research):**
- Does the National Payment Systems Act (RA 11127) specifically cover internal marketplace ledgers?
- What are the exact compliance requirements for OPS registration?
- How did MyKuya structure their payment flow to qualify as OPS?
- Can Xendit's Marketplace API fully insulate Serbizyu from MSB classification?
- What is the timeline and cost for OPS registration?

**Recommended action:** 
1. Engage a PH fintech lawyer (1-2 hour consultation, ~₱15-30K)
2. Request Xendit's marketplace API documentation and compliance whitepaper
3. Interview a former MyKuya operator on their BSP engagement strategy

---

### 2. Agent Model: DOLE Classification Risk

**The Question:**
Serbizyu's human agents — who onboard servicers, manage listings, and earn commissions — are designed as independent contractors. What is the risk that DOLE (Department of Labor and Employment) reclassifies them as employees, triggering back wages, benefits, and 13th-month pay obligations?

**What we know:**
- Agents sign Independent Contractor Agreements
- Agents control their own schedule and methods
- Agents can work for multiple platforms
- Commission-based compensation
- Meesho's reseller model in India is the closest analogue

**What we DON'T know (needs research):**
- Has DOLE ruled on platform-based independent contractors (not just transport like Grab)?
- What specific control factors trigger employee classification in PH courts?
- Does the "economic dependence" test apply to agents who earn majority income from Serbizyu?
- Are there specific exemptions for "commission agents" under PH law?
- What contract language is needed to survive DOLE scrutiny?

**Recommended action:**
1. Engage a PH labor lawyer specializing in platform economy / gig work
2. Review existing DOLE rulings on Grab/Angkas driver classification
3. Draft Independent Contractor Agreement with DOLE-defensible language

---

## P1 — High Priority Research Items

### 3. BIR RR 16-2023: Service Marketplace Applicability

**The Question:**
The 1% withholding tax on e-marketplace remittances (RR 16-2023 / RMC 8-2024) explicitly covers services. But the ₱500,000 threshold, Sworn Declaration requirements, and exemption mechanics need concrete interpretation for Serbizyu's model.

**Specific unknowns:**
- Does the ₱500K threshold apply per servicer or per platform?
- Can a servicer with multiple income sources (platform + direct) consolidate?
- What is the exact BIR-accepted format for Sworn Declarations?
- Does BMBE tax exemption fully exempt servicers from withholding, or only from income tax?
- What are the penalties for non-compliance?

### 4. BMBE Registration Per Municipality

**The Question:**
BMBE registration is at the municipal/city level. Candon City has its own process. The process, cost, and timeline need to be understood before building the onboarding workflow.

**Specific unknowns:**
- Where exactly in Candon City Hall does a servicer register as BMBE? (Office of the Treasurer)
- What documents are required? Cost? Processing time?
- Is the BMBE Certificate of Authority valid throughout the Philippines or only within the registering LGU?
- Renewal process (every 2 years)?
- Can the platform facilitate bulk registration?

### 5. Data Privacy: ID Collection for Provincial Users

**The Question:**
Serbizyu will collect government IDs, selfies, and barangay clearances from servicers. Provincial users may be uncomfortable with digital ID submission.

**Specific unknowns:**
- Is a selfie considered "sensitive personal information" under DPA?
- What specific consent language is needed for biometric data (facial recognition)?
- Can barangay clearances be accepted as scanned copies, or must they be original?
- Data retention: how long must IDs be stored after a servicer deactivates?

---

## P2 — Medium Priority Research Items

### 6. Professional Regulation Per Category

**The Question:**
Some service categories may require licensed practitioners under PH law (electricians, engineers, medical professionals). Which of the 28 planned categories are regulated?

**Categories to check:**
- Electrician → Professional Regulation Commission (PRC) license?
- Painter → Unregulated?
- Tricycle driver → LTO franchise / TODA membership required?
- Massage / Hilot → DOH regulation?
- Tutor → PRC license for teachers? Or unregulated for informal tutoring?
- Welding → TESDA certification?
- Farm labor → Unregulated?

### 7. Insurance & Liability

**The Question:**
What insurance coverage does the platform need for agent-facilitated or kiosk-mediated transactions?

**Specific unknowns:**
- Does the platform have liability if an agent commits fraud?
- Does the kiosk operator (sari-sari store owner) need insurance?
- What happens if a servicer damages property during a booked service?
- Is there a PH insurance product for marketplace platforms?

---

## P3 — Deferred / Nice-to-Have Research

### 8. International Tax Treaties & Cross-Border Payments

If Serbizyu ever accepts payments from OFWs (Overseas Filipino Workers) for services rendered to family members in PH, do cross-border remittance regulations apply?

### 9. Barangay Mediation Ordinance

Some barangays have formal mediation ordinances. Can Serbizyu's dispute resolution system integrate with or supplement existing barangay justice systems (Katarungang Pambarangay)?

---

## Research Methodology Recommendations

| Method | Best For | Estimated Cost | Time |
|---|---|---|---|
| **Lawyer consultation (fintech)** | BSP MSB/OPS, payment architecture | ₱15-30K/hr | 1-2 sessions |
| **Lawyer consultation (labor)** | Agent model classification | ₱10-20K/hr | 1 session |
| **BIR taxpayer service walk-in** | Sworn Declaration process, BMBE interaction | Free | 1 day |
| **LGU visit (Candon City Hall)** | BMBE registration process map | Free | 1 day |
| **Interview: existing platform operators** | MyKuya payment structure, operational pitfalls | Free (coffee) | 2-3 meetings |
| **Online: NPC registration portal** | DPA compliance checklist | Free | 2 hours |

---

## Decision Gates

| Gate | When | What Must Be Resolved |
|---|---|---|
| **G1: Payment Architecture** | Before any escrow/payment code is written | BSP classification confirmed (MSB vs OPS vs Xendit insulation) |
| **G2: Agent Agreement** | Before first agent is onboarded | DOLE-defensible Independent Contractor Agreement drafted |
| **G3: Servicer Onboarding** | Before first servicer creates a listing | BIR compliance module built (COR collection, Sworn Declaration, threshold tracking) |
| **G4: Town Launch** | Before money flows in Candon | Municipal permits secured, BMBE process mapped, NPC registration filed |

---

*Document created: July 24, 2026 — BMAD Phase 1 output*  
*Part of Serbizyu 2.0 — follow the BMAD ceremony: P1 analysis → P2 PRD → P3 solutioning → P4 implementation*
