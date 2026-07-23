# PH Legal, Regulatory & Competitive Landscape for Service Marketplaces
## Serbizyu — Provincial PH Local Services Marketplace
### Research Report — July 2026

---

## Executive Summary

This report analyzes the Philippine legal, regulatory, and competitive landscape for a provincial local services marketplace (Serbizyu). It covers eight key areas: BIR digital tax regulations, TRAIN Law implications, BSP money service business licensing, the BMBE Act, Data Privacy Act compliance, the competitive landscape for service marketplaces, agent/reseller intermediary models, and international comparisons.

**Key Finding:** No general-service marketplace has achieved meaningful scale in the Philippines due to a combination of structural economic barriers (small transaction values, cash preference, low digital payment adoption outside Metro Manila), regulatory complexity (BIR withholding tax obligations, BSP licensing uncertainty for payment flows), trust gaps (no escrow culture for services), and operational challenges (fragmented supply, quality control, geographic dispersion). However, the regulatory environment is increasingly formalized, and the opportunity for a properly structured platform is significant.

---

## 1. BIR Revenue Regulation 8-2024 / RR 16-2023 — 1% Withholding Tax on Digital Transactions

### Regulation Overview

**RR 16-2023** (issued Dec 21, 2023, effective Jan 11, 2024) and **RMC 8-2024** (issued Jan 15, 2024) impose a 1% creditable withholding tax on gross remittances made by electronic marketplace (e-marketplace) operators and digital financial services providers (DFSPs) to sellers/merchants.

### Key Provisions

| Provision | Detail |
|-----------|--------|
| **Tax Rate** | 1% on one-half (1/2) of gross remittances (effective rate: 0.5% of total) |
| **Threshold** | ₱500,000 annual gross remittances per seller/merchant |
| **Exemptions** | Sellers under ₱500K/year; sellers exempt or at lower rate under law/treaty |
| **Applies to** | Goods AND Services sold through e-marketplace platforms |

### Does This Apply to Service Marketplaces?

**YES.** The definition of "e-marketplace operator" explicitly covers digital platforms that connect buyers with sellers of **both goods and services**. The Grant Thornton analysis states these platforms include "online shopping, food delivery, and booking accommodations like resorts, hotels, and rental spaces." The regulations further reference "services" throughout.

**However:** The withholding is calculated on *gross remittances* — the total amount received from the buyer for goods/services sold through the platform, excluding:
- Sales returns and discounts
- Separately billed delivery/shipping fees
- VAT collected
- Consideration for use of the e-marketplace platform (i.e., platform fees/commission)

This means Serbizyu would compute withholding on the **service fee net of the platform commission** — only on the amount actually remitted to the servicer.

### Compliance Requirements for Serbizyu (Platform)

| Requirement | Detail |
|-------------|--------|
| **Seller Registration** | Require all servicers to provide BIR Certificate of Registration (BIR Form 2303) before listing |
| **Sworn Declaration** | Require servicers earning <₱500K to submit BIR-received Sworn Declaration annually (by Jan 20) |
| **Withholding** | Deduct 1% withholding tax once servicer exceeds ₱500K/yr in gross remittances |
| **BIR Form 2307** | Issue Certificate of Creditable Tax Withheld at Source to servicers |
| **Payment Accounts** | Servicers must receive payments in BIR-registered business trade name accounts, NOT personal accounts |
| **Monitoring** | Track cumulative gross remittances per servicer across all transactions |

### Risk Level: **MEDIUM**

The compliance burden is administrative but manageable. Key risk: servicers in provincial areas (Ilocos Sur) may lack BIR registration or formal banking accounts. The platform must either help them register or restrict to registered servicers only.

**Actionable Recommendation:** Implement BIR registration verification at onboarding. For small-scale servicers (<₱500K/yr), implement the Sworn Declaration system. Consider building a BIR compliance module that tracks per-servicer cumulative remittances and triggers withholding automatically when threshold is crossed.

---

## 2. TRAIN Law (RA 10963) — Interaction with Marketplace Reporting

### Key Provision

The Tax Reform for Acceleration and Inclusion (TRAIN) Law, effective 2018, exempts individual taxpayers with taxable income **not exceeding ₱250,000 annually** from personal income tax.

### Interaction with Marketplace Reporting

| Scenario | Tax Owed | BIR Reporting Required |
|----------|----------|----------------------|
| Servicer earns <₱250K/yr | ₱0 income tax (TRAIN exemption) | Must still register with BIR (COR required by RMC 8-2024) |
| Servicer earns ₱250K-₱500K/yr | Progressive rate (15-20%) | BIR registered; below ₱500K withholding threshold |
| Servicer earns >₱500K/yr | Progressive rate (20-35%) | Full withholding + BIR Form 2307 required |

**Critical Insight:** The TRAIN exemption at ₱250K and the ₱500K withholding threshold under RR 16-2023 are **not aligned**. A servicer earning ₱300K/year owes ₱0 in income tax under TRAIN but is still below the ₱500K withholding threshold. They would need to submit a Sworn Declaration to avoid withholding.

**Recommendation:** Implement tiered servicer tiers:
- **Tier 1** (<₱250K/yr): Sworn Declaration only, no withholding
- **Tier 2** (₱250K-₱500K/yr): Sworn Declaration + BIR COR, no withholding
- **Tier 3** (>₱500K/yr): Full withholding + COR + BIR Form 2307 issuance

### Risk Level: **LOW**

The TRAIN Law is favorable for provincial servicers. Most individual plumbers, tricycle drivers, and carpenters in Ilocos Sur will earn well under ₱250K/yr from the platform. The challenge is getting them to register with BIR at all — many operate entirely in the informal economy.

---

## 3. BSP Money Service Business (MSB) Licensing & Escrow

### The Core Question

Does Serbizyu's internal ledger system — which tracks holds and releases of payments between consumers and servicers — constitute a "money service business" requiring BSP licensing?

### The Regulatory Framework

**BSP Circular No. 1206** (approved Dec 23, 2024) consolidated all rules for Money Service Businesses (MSBs) into the "M-Regulations" under the Manual of Regulations for Non-Bank Financial Institutions (MORNBFI). MSBs include:

- Remittance Transfer Companies (RTCs)
- Money Changers/Foreign Exchange Dealers
- E-Money Issuers (EMIs)
- Virtual Asset Service Providers (VASPs)

### Key Distinction: Operator of Payment Systems (OPS) vs. MSB

Under the **National Payment Systems Act (RA 11127)**, the BSP also regulates "Operators of Payment Systems" (OPS). MyKuya (the closest competitor) is registered as an **OPS** ("Supervised by Bangko Sentral ng Pilipinas as an 'Operator of Payment Systems'"), not as an MSB.

**The critical distinction:**
- **MSB license** is required if you handle actual money transmission, currency exchange, or e-money issuance
- **OPS registration** (simpler, less capital-intensive) is required if you operate a payment system but use existing payment rails (e.g., Xendit, GCash, banks) for actual fund movement

### Serbizyu's Exposure Analysis

| Activity | Risk of MSB Classification | Reasoning |
|----------|---------------------------|-----------|
| **Internal ledger tracking holds/releases** | LOW — if no actual fund custody | Book-entry tracking alone is not money transmission |
| **Receiving funds from consumers then remitting to servicers** | MEDIUM-HIGH | This is the classic escrow/marketplace payment flow that could trigger MSB/OPS requirements |
| **Using Xendit as payment rail** | LOW — Xendit holds the license | If Xendit handles all actual fund custody and settlement, Serbizyu only operates a commercial ledger |
| **Holding funds in Serbizyu's own bank account before disbursing** | HIGH | Holding consumer funds in a pool account before disbursing may create fiduciary/escrow obligations and MSB triggers |

### Industry Precedent

**MyKuya** operates with BSP supervision as an "Operator of Payment Systems" (OPS), not an MSB. This is the most relevant precedent for Serbizyu. MyKuya connects consumers with service providers for errands, deliveries, cleaning, and other services — very similar to Serbizyu's model.

### Risk Level: **MEDIUM-HIGH**

The escrow/payment flow is the most significant regulatory risk for Serbizyu. If the platform holds consumer funds before disbursing to servicers, it may need either MSB licensing or OPS registration.

### Actionable Recommendations

1. **Use Xendit's marketplace payment API** — Xendit offers a marketplace payment product where Xendit acts as the regulated payment entity and handles KYC, fund custody, and settlement. Serbizyu's internal ledger would only track obligations, not hold funds.
2. **Register as OPS** (Operator of Payment Systems) with BSP — simpler than MSB licensing but still requires compliance. MyKuya provides the precedent.
3. **Avoid pooling funds** in Serbizyu's own bank accounts. Use escrow-as-a-service or direct settlement via Xendit.
4. **Minimum capital for MSB would be ₱50M** (large scale) — this is prohibitive. The OPS route is far more practical.

---

## 4. BMBE Act (RA 9178) — Barangay Micro Business Enterprise

### Key Provisions

| Provision | Detail |
|-----------|--------|
| **Asset Limit** | Total assets ≤ ₱3,000,000 (excluding land) |
| **Eligibility** | Any person, juridical entity, cooperative, or association |
| **Services Included** | YES — services are explicitly covered, EXCEPT professional services requiring government licensure (doctors, lawyers, engineers, etc.) |
| **Registration** | With the Office of the Treasurer of each city/municipality |
| **Tax Exemption** | **Income tax exemption** on income arising from BMBE operations |
| **Minimum Wage Exemption** | Exempt from Minimum Wage Law (but must provide SSS/PhilHealth benefits) |
| **Certificate Validity** | 2 years, renewable |

### Application to Serbizyu Servicers

Most provincial service providers (plumbers, carpenters, tricycle operators, salon workers) would qualify as BMBEs. The ₱3M asset threshold is generous for individual operators in Ilocos Sur.

**Critical Interaction with BIR Withholding Tax (RR 16-2023):**

BMBE-registered servicers can claim **income tax exemption** under Section 7 of RA 9178. Under RR 16-2023 Section 2.57.2(c), if a seller/merchant is "duly exempt from income tax pursuant to any existing law," they must submit a certification/clearance to the e-marketplace operator proving this exemption. If properly documented, the platform would **not withhold** the 1% tax on this servicer's remittances.

**However** — BMBE tax exemption is on income tax *only*. The servicer must still:
- Register with BIR (COR required by RMC 8-2024)
- File tax returns (even if ₱0 due)
- Register as BMBE with LGU

### Risk Level: **LOW**

The BMBE framework is highly favorable for provincial service marketplace servicers. The platform should actively encourage BMBE registration.

### Actionable Recommendation

Build a BMBE registration assistance workflow into the servicer onboarding process. Help servicers register with their municipal treasurer's office and obtain their Certificate of Authority. This gives them income tax exemption AND simplifies the platform's withholding obligations.

---

## 5. Data Privacy Act (RA 10173)

### Applicability

The Data Privacy Act of 2012 applies to any platform that collects, processes, stores, or transmits personal information. Serbizyu will collect:

- **Government IDs** (for servicer verification)
- **Selfies** (for identity verification)
- **Barangay clearances** (for local compliance)
- **Transaction records** (all service bookings)
- **Contact information** (phone numbers, addresses)
- **BIR registration documents**
- **Bank account details** (for payment settlement)

### Key Requirements

| Requirement | Detail |
|-------------|--------|
| **Registration with NPC** | Personal Information Controllers (PICs) must register with the National Privacy Commission |
| **Data Protection Officer** | Must appoint a DPO and register with NPC |
| **Privacy Notice** | Clear, accessible privacy notice covering what data is collected, purpose, sharing, and retention |
| **Consent** | Obtain consent for data collection, especially for sensitive personal information (IDs, clearances) |
| **Data Breach Notification** | Notify NPC and affected data subjects within 72 hours of breach |
| **Cross-Border Transfer** | If data is stored/processed outside PH, ensure equivalent protection |
| **Security Measures** | Implement organizational, physical, and technical security measures |
| **Data Retention** | Establish retention periods and disposal procedures |

### Risk Level: **MEDIUM**

The DPA compliance burden is real but standard for any marketplace. Key provincial risks:
- Servicers may be uncomfortable providing digital copies of IDs/clearances
- Barangay clearances are paper-based; digitizing them creates data quality challenges
- Data breach in a provincial context could damage trust severely

### Actionable Recommendations

1. **Register with NPC** as a Personal Information Controller (must be done before commencing operations)
2. **Appoint a DPO** (can be an external service for a startup)
3. **Implement tiered data collection** — collect only what's needed for each servicer tier
4. **Use local/hybrid cloud storage** within PH (AWS PH region or local data centers) to simplify cross-border compliance
5. **Privacy notice** must be available in Filipino/Ilocano for provincial users
6. **Implement access controls** — servicer IDs and barangay clearances are sensitive; restrict access to authorized personnel only

---

## 6. Competitive Landscape — Why No General-Service Marketplace Has Succeeded in PH

### Historical Attempts

| Platform | Year | Type | Outcome | Key Reason for Failure/Limitation |
|----------|------|------|---------|-----------------------------------|
| **MyKuya** | 2020-present | On-demand services (errands, cleaning, deliveries) | Still operating, but limited scale | B2B disruption during COVID; capital constraints; niche positioning |
| **Suki (GCash)** | ~2022 | GCash merchant marketplace | Limited adoption | Never gained traction beyond GCash's existing merchant network; not true service marketplace |
| **Barter** | ~2019-2021 | Services marketplace | Shut down | Failed to achieve liquidity on either side of marketplace |
| **HeyKuya** | 2016 | SMS-based virtual assistant | Sold to YesBoss (Indonesia) | Early exit; couldn't scale as standalone |
| **Grab Services** | 2019-present | Service expansion (cleaning, repair) | Limited PH expansion | Grab's core competency is transport/food; services remain ancillary |
| **Facebook Marketplace** | Ongoing | Peer-to-peer listings | Active for goods only | No transaction layer; no trust infrastructure; no escrow for services |
| **Urban Company** | Never entered PH | Home services | No PH operations | Market too fragmented; regulatory uncertainty; prefers India/UAE/SG markets |

### Root Cause Analysis: Why They Failed

#### A. Economic Barriers (HIGH Impact)

| Barrier | Detail |
|---------|--------|
| **Small transaction values** | Average service fee for provincial services (₱150-₱500) makes platform commission economics very thin |
| **Cash preference** | ~70% of PH transactions are still cash-based; digital payment infrastructure outside Metro Manila is limited |
| **Low disposable income** | Provincial households have lower service spending; price sensitivity is extreme |
| **Informal economy dominance** | Most service workers operate informally; formalizing them creates friction |

#### B. Trust Barriers (HIGH Impact)

| Barrier | Detail |
|---------|--------|
| **No escrow culture** | PH consumers expect to pay upon service completion, not in advance |
| **Quality uncertainty** | Without ratings/reputation systems (chicken-and-egg problem), consumers default to known local providers |
| **Social trust networks** | Provincial communities rely on word-of-mouth referrals, not platforms |
| **Fraud risk** | Both sides (consumer and servicer) fear being cheated in an impersonal transaction |

#### C. Regulatory Barriers (MEDIUM Impact)

| Barrier | Detail |
|---------|--------|
| **BIR withholding tax** | RR 16-2023 creates compliance overhead; servicing informal workers is harder post-regulation |
| **BSP licensing** | Uncertainty around payment flows discourages investment |
| **Municipal permits** | Each LGU has different requirements (mayor's permit, barangay clearance, sanitary permit) |
| **Professional regulation** | Some services require licensed practitioners (electricians, engineers) |

#### D. Operational Barriers (MEDIUM-HIGH Impact)

| Barrier | Detail |
|---------|--------|
| **Geographic dispersion** | 7,641 islands; logistics outside Luzon are expensive and unreliable |
| **Fragmented supply** | Each barangay has its own network of providers; aggregating them is labor-intensive |
| **Quality control** | Services are heterogeneous; consistent quality assurance at scale is extremely difficult |
| **Language/dialect diversity** | Platforms must support Filipino, English, and local dialects (Ilocano in Ilocos Sur) |
| **Low smartphone penetration** | Outside Metro Manila, feature phones and low-end smartphones with limited data plans dominate |

### Why Serbizyu's Provincial Focus Changes the Equation

**Traditional marketplaces failed trying to be "general" and "national."** A provincial focus in Ilocos Sur changes the dynamics:

1. **Geographic density** — A single province is manageable for supply aggregation
2. **Social trust networks** — Can be leveraged (not fought) in a tight-knit provincial community
3. **Agent model** — Local agents can onboard and quality-check servicers in person
4. **Cash + digital hybrid** — GCash/PayMaya acceptance growing; cash-on-delivery still practical
5. **BMBE-friendly** — Most provincial servicers qualify for BMBE tax exemption
6. **Lower competitive pressure** — No large marketplace is focused on provincial PH

---

## 7. Agent/Intermediary Model — Legal Framework

### The Meesho-Like Reseller Model in PH Context

**Meesho (India)** operates a reseller model where "resellers" (typically women in semi-urban areas) use social media to sell products from Meesho's catalog. Meesho handles logistics and payments; the reseller earns a commission. This model grew to 190M+ users in India.

### Does PH Law Support This?

The relevant legal concepts in the Philippines:

| Concept | Legal Basis | Application |
|---------|------------|-------------|
| **Agency** | Civil Code (Arts. 1868-1932) | An agent acts on behalf of a principal. Standard agency law applies. |
| **Independent Contractor** | Labor Code (Art. 280) | Agents are NOT employees; they are independent contractors |
| **Commission Agent** | Tax regulations | Commission agents have specific BIR reporting obligations (Form 2307) |
| **Electronic Commerce Act** | RA 8792 | Recognizes electronic contracts and digital signatures |

### Key Considerations for Serbizyu's Agent Model

| Issue | Analysis |
|-------|----------|
| **Agent classification** | Agents are independent contractors, not employees — no employer tax/benefit obligations |
| **Agent compensation** | Commission-based; subject to 1% withholding if agent earns >₱500K/yr through platform |
| **Agent KYC** | Agents must register with BIR (COR required); BMBE registration recommended |
| **Liability for agent misconduct** | Platform may have vicarious liability if agents are presented as platform representatives |
| **Data Privacy** | Agents accessing servicer/customer data must comply with DPA |
| **Professional licensing** | If agents are performing regulated services (e.g., electrical work), licenses required |

### Risk Level: **LOW-MEDIUM**

The agent model is legally viable under existing PH law. The key risk is misclassification: if agents are treated as "employees" by courts or DOLE (Department of Labor and Employment), back wages and benefits could be owed. The platform must ensure:
- Agents sign clear Independent Contractor Agreements
- Agents control their own schedule and methods
- Agents can work for other platforms
- No employer-like supervision

### Actionable Recommendation

Implement a two-tier agent framework:
- **Tier A: "Barangay Partners"** — Community members who onboard servicers and help with listing creation. Commission-based, clear independent contractor status.
- **Tier B: "Service Agents"** — Servicers themselves acting as resellers for multiple providers (like Meesho). Register as BMBEs, submit Sworn Declarations under RR 16-2023.

---

## 8. International Comparisons

### India: Urban Company (formerly UrbanClap)

| Metric | Detail |
|--------|--------|
| **Founded** | 2014 |
| **Focus** | Home services (beauty, repair, cleaning, appliance) |
| **Status** | IPO'd Sept 2025; ₱1,144 crore (~₱7.8B) revenue FY25 |
| **Model** | Aggregator with standardized quality; 40,000+ registered professionals |
| **Key Learning** | Built trust through standardization: same equipment, same pricing, same training |

**Why Urban Company hasn't expanded to PH:** Market fragmentation, regulatory complexity, and preference for existing local arrangements. However, their model of *professionalizing informal service workers* is directly relevant.

### India: Meesho

| Metric | Detail |
|--------|--------|
| **Founded** | 2015 |
| **Focus** | Social commerce via resellers |
| **Status** | IPO'd Dec 2025; 190M+ users |
| **Model** | Resellers (typically women) share products via WhatsApp/Facebook and earn commissions |
| **Key Learning** | Aggregated fragmented supply through human agents; solved trust via existing social relationships |

**PH Relevance:** Meesho's model is the closest analogue to Serbizyu's provincial agent strategy. The reseller model works in lower-trust, lower-digital-literacy environments by leveraging existing social networks.

### Indonesia: Gojek/GoTo

| Metric | Detail |
|--------|--------|
| **Founded** | 2009 (app: 2015) |
| **Focus** | Super-app: ride-hailing, food delivery, payments, services |
| **Status** | Merged with Tokopedia; US$10B+ valuation |
| **Model** | Vertical expansion from transport into adjacent services |
| **Key Learning** | Started narrow (ride-hailing) then expanded. Solved payment via GoPay (licensed e-money) |

**PH Relevance:** Gojek's "start narrow, expand later" approach is instructive. Also: Gojek succeeded because it understood local regulation and built relationships with authorities — something foreign competitors (Uber, Grab initially) struggled with.

### Key Takeaways for Serbizyu

| Lesson | Application |
|--------|-------------|
| **Start narrow, expand later** | Focus on Ilocos Sur first; prove model before expanding |
| **Professionalize informal workers** | Training, certification, and standardization build trust |
| **Use social networks for trust** | Agent model leverages existing community relationships |
| **Solve payments early** | Partner with regulated entities (Xendit, GCash) rather than building your own payment infrastructure |
| **Regulatory relationships matter** | Register with BSP (OPS), comply with BIR, build relationships with DTI and LGUs |

---

## Risk Summary Matrix

| Regulatory Area | Risk Level | Key Concern | Timeline for Action |
|-----------------|------------|-------------|---------------------|
| **BIR RR 16-2023 (Withholding Tax)** | MEDIUM | Servicer registration & threshold monitoring | Compliance needed at launch |
| **TRAIN Law** | LOW | Favorable for provincial servicers | N/A — already effective |
| **BSP MSB/OPS Licensing** | MEDIUM-HIGH | Payment flow structure determines requirement | Design before launch |
| **BMBE Act** | LOW | Highly favorable; use as servicer incentive | Implement at launch |
| **Data Privacy Act** | MEDIUM | NPC registration, consent, breach notification | Compliance needed at launch |
| **Competitive Landscape** | MEDIUM | Many have failed; niche strategy is key | Strategic focus |
| **Agent/Intermediary Model** | LOW-MEDIUM | Independent contractor classification | Launch with proper contracts |

---

## Actionable Recommendations by Priority

### IMMEDIATE (Before Launch)

1. **Payment Architecture**: Design payment flow to avoid MSB classification. Use Xendit Marketplace API where Xendit handles fund custody and settlement. Register as OPS (Operator of Payment Systems) with BSP.

2. **BIR Compliance Module**: Build per-servicer gross remittance tracking. Implement ₱500K threshold detection. Integrate Sworn Declaration collection at onboarding.

3. **Servicer Onboarding Workflow**:
   - BIR COR registration assistance
   - BMBE registration assistance (municipal level)
   - Sworn Declaration collection
   - ID/selfie/barangay clearance collection (with DPA compliance)

4. **Legal Foundation**:
   - Independent Contractor Agreements for agents
   - Terms of Service (servicer + consumer versions)
   - Privacy Notice (Filipino/Ilocano translations)
   - NPC registration

### SHORT-TERM (First 6 Months)

5. **Agent Pilot**: Launch with 5-10 barangay agents in a single municipality
6. **LGU Relationships**: Establish relationships with municipal treasurers (BMBE registration), DTI, and BIR RDO
7. **Quality Standardization**: Create basic service quality guidelines per category

### DEFERRED (6-12 Months)

8. **BSP OPS Registration** (if not already done)
9. **BIR Accredited Tax Agent** status consideration
10. **Full provincial rollout** across Ilocos Sur municipalities

---

## Sources & Citations

### BIR Regulations
- Revenue Regulations No. 16-2023 (RR 16-2023) — Imposing 1% Withholding Tax on E-Marketplace Remittances
- Revenue Memorandum Circular No. 8-2024 (RMC 8-2024) — Clarifying Provisions of RR 16-2023
- Grant Thornton Philippines, "Withholding Tax Rules on Digital Commerce" (Jan 23, 2024)
- BDO Global, "Philippines - BIR Clarifies Withholding Tax Obligations on E-Marketplaces" (Feb 5, 2024)

### TRAIN Law
- Republic Act No. 10963 (Tax Reform for Acceleration and Inclusion Act of 2017)
- Wikipedia, "Tax Reform for Acceleration and Inclusion Law"

### BSP Regulations
- BSP Circular No. 1206 (Dec 23, 2024) — Consolidated Rules for Money Service Businesses (M-Regulations)
- Republic Act No. 11127 (National Payment Systems Act)
- Fintech News Philippines, "BSP Finalising Revised Framework for Money Service Businesses"

### BMBE Act
- Republic Act No. 9178 (Barangay Micro Business Enterprises Act of 2002)

### Data Privacy Act
- Republic Act No. 10173 (Data Privacy Act of 2012)
- National Privacy Commission (NPC) — Registration and Compliance Requirements

### Competitive Landscape
- Wikipedia, "GCash" | "MyKuya" | "Urban Company" | "Meesho" | "Gojek"
- The Ken, "Concierge Startup MyKuya Wants to Have Its Marketplace and Sell It Too" (2020)
- Various news sources on PH startup ecosystem and service marketplace history

---

*Report compiled by Hermes Agent — July 2026*
*For Serbizyu platform regulatory planning*
