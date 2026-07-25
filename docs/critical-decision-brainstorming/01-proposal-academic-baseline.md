

**Serbizyu: Inclusive Local Services & Products Marketplace with Trust Infrastructure for Philippine Provincial Economies**

**SARMIENTO, DAVID DATU N.**  
**LOPEZ, CHRSTINE M.**  
**PAGADUAN, JAYPEE G.**  
**VIDAÑA, PRINCE JOHN**

**Bachelor of Science in Information Technology**  
**4B**

**CCSIT  215 | Project Management**

July 25, 2026

### **BUSINESS CASE & DOMAIN CONTEXT**

### **Executive Summary & Strategic Alignment**

The Philippine provincial economy operates in a fragmented and unorganized environment for physical services, local goods, and digital service offerings. While established e-commerce platforms provide robust consumer protection mechanisms for physical goods (such as Shopee Guarantee), there is a complete absence of a dedicated, escrow-backed service marketplace catering to provincial economies. Consequently, local trade workers, artisans, and micro-merchants rely on unrecorded cash handshakes or unindexed social media posts, leaving both buyers and sellers vulnerable to non-payment, non-performance, and arbitrary pricing.  
**Serbizyu** is an inclusive, two-sided marketplace and trust infrastructure purpose-built for Philippine provincial municipalities. Anchored on an initial pilot deployment in **Tagudin, Ilocos Sur**, the platform supports physical services (e.g., home repairs, beauty, transport, agricultural labor), local products, and digital deliverables. By combining direct service/product listings, competitive buyer bidding, and low-barrier offline/SMS accessibility, Serbizyu bridges the provincial digital divide while creating an integrated economic trust layer.

### **Domain Context & Regional Benchmarks**

Provincial digital adoption is constrained by two primary factors: technological aversion among traditional micro-entrepreneurs and the recurring financial burden of purchasing mobile data load. Platforms requiring mandatory smartphone downloads, continuous data connectivity, or upfront formal tax registrations systematically exclude local trade workers.  
To ensure practical adoption and operational viability, Serbizyu synthesizes established regional platform mechanisms (Angkas, 2023; Meesho, 2022; MyKuya, 2021; Shopee Philippines, 2022):

* **E-Commerce Escrow & Buyer Protection**: Adapts the Shopee Guarantee model to hold funds in escrow until job sign-off or product delivery, establishing consumer trust in digital transactions (Shopee Philippines, 2022).  
* **Digitization & Dispatch Mechanics of Local Transportation**: Integrates real-time, status-driven dispatch workflows for local transport (e.g., tricycle dispatch), replacing unstructured fare haggling with standardized dispatch states (Angkas, 2023).  
* **On-Demand Service Marketplace Models**: Draws from MyKuya's service-booking framework (MyKuya, 2021); however, while MyKuya relies heavily on directly managed or agency-housed workers in metropolitan areas, Serbizyu scales open marketplace liquidity for independent provincial micro-entrepreneurs.  
* **Delegated Community Networks**: Leverages Meesho's reseller model by utilizing local human agents to assist non-tech-savvy business owners via delegated profile management and SMS authorization (Meesho, 2022).

### **PROBLEM STATEMENT & OPERATIONAL VULNERABILITIES**

### **Quantitative Pain Points & Vulnerabilities**

1. **Zero Escrow & Financial Vulnerability**:

Provincial service and local trade deals are strictly binary cash transactions (Philippine Statistics Authority, 2023). Buyers face non-performance or low-quality work after paying cash deposits, while service providers and merchants risk non-payment or arbitrary price haggling after completing labor (Asian Development Bank, 2022).

2. **Absence of Dedicated Service Marketplaces & Social Media Restrictions**:

While urban centers access specialized service apps, provincial areas have no dedicated marketplace for local services and products. Existing service apps rely on direct worker employment or agency housing, limiting regional scalability (MyKuya, 2021). Consequently, local workers resort to social media, but Facebook Marketplace explicitly policy-gates and bans service listings and job postings (Meta Platforms, 2024). Pushed into unorganized Facebook Groups and private Messenger threads, buyers and sellers operate without booking calendars, verified pricing, identity checks, or dispute protection.

3. **Connectivity Costs and Technology Resistance**:

In rural barangays, the recurring expense of purchasing daily cellular data load represents a greater financial deterrent than temporary network dead spots (Department of Information and Communications Technology, 2023). Combined with psychological resistance toward complex smartphone applications among older micro-entrepreneurs, standard app-only platforms experience high user abandonment.

4. **Regulatory Formalization Stigma**:

Micro-entrepreneurs fear bureaucratic tax registration processes and potential compliance penalties (Bureau of Internal Revenue, 2023). Demanding formal tax documents (BIR Form 2303\) upfront excludes over 90% of informal provincial service providers and artisans.

### **Root-Cause Vulnerability Analysis**

| Vulnerability Domain | Root Cause | Operational Impact | Platform Risk Exposure |
| ----- | ----- | ----- | ----- |
| **Trust Deficit** | Absence of verifiable service records, ratings, or escrow checks. | Buyers rely on narrow personal networks; quality providers cannot scale. | Low transaction volume and slow market liquidity velocity. |
| **Social Media Policy Limits** | Facebook Marketplace policy-bans service listings (Meta Platforms, 2024). | Transactions scatter into unindexed chats without scheduling or payment safety. | High fraud rates and complete loss of transactional visibility. |
| **Connectivity & Data Costs** | High daily prepaid data load expenses and rural signal drops (DICT, 2023). | Standard online checkout flows freeze or fail mid-transaction. | Transaction abandonment and lost operational records. |
| **Formalization Fear** | Complex tax rules (BIR RR 16-2023) and upfront document demands (BIR, 2023). | Informal trade workers avoid digital platforms to escape perceived penalties. | Severe supply-side onboarding drop-off. |

### **PROJECT CHARTER OBJECTIVES & SUCCESS CRITERIA**

### **General Project Mission**

To design, build, and validate a production-ready marketplace and trust engine for Tagudin, Ilocos Sur. The platform supports physical services, local products, and digital offerings across a full suite of transaction modes—including direct Servicer Offers, Buyer Request Bids, face-to-face Quick Deals, and multi-slot Deal-Chaining—accessible via web, PWA, and SMS channels with double-entry escrow protection and an invisible formalization ladder.

### **SMART Project Objectives & Baseline KPIs**

* **SMART Objective 1 (Market Liquidity & Onboarding)**:  
  Onboard 50+ active local service providers and merchants across Tagudin within the 12-week project lifecycle, achieving at least 40% provider registration through the Human Agent Network.  
  * *Metric*: Provider Liquidity Ratio ≥ 2.0 (bids submitted per open job request).  
* **SMART Objective 2 (Operational Velocity & System Performance)**:  
  Maintain an average transaction creation time of \< 2 minutes for face-to-face Quick Deals and achieve \< 50ms system response latency on a single self-hosted server node.  
* **SMART Objective 3 (Financial & Dispute Safety)**:  
  Maintain 0% ledger error drift across escrow accounts (supporting digital payments and dual-confirmed cash), with \> 90% of user disputes resolved within a 4-hour standard response time using photo, location, or SMS evidence logs.  
* **SMART Objective 4 (Frictionless Formalization)**:  
  Classify 100% of onboarded service providers into the 3-Lane Regulatory Ladder (Unregistered Capped, Sworn Declaration, and Registered Tiers), eliminating tax deduction anxiety for micro-servicers earning \< ₱250,000/year (Bureau of Internal Revenue, 2023).

### **SCOPE BASELINE, CONSTRAINTS & RISK GOVERNANCE**

### **Scope Baseline**

1. **Full Transaction Suite (Products, Physical Services & Digital Offerings)**:  
   1. *Direct Offers*: Structured listings created by sellers/servicers for direct browsing and instant booking.  
   2. *Buyer Requests & Servicer Bids*: Reverse-marketplace post-and-bid workflow where buyers post custom job/product requests and providers submit competitive proposals.  
2. **Transaction Primitives**:  
   1. *Quick Deal*: Impromptu face-to-face QR code scanning with a maximum of 3 price counter-negotiation rounds and dual confirmation.  
   2. *Deal-Chaining*: Multi-slot container bundling multiple product and service listings under a single buyer payment with per-slot fulfillment and escrow release.  
3. **Accessibility & Offline Support**:  
   1. Human Agent Network (delegated access via SMS authorization with 75% Owner / 10% Agent / 15% Platform earnings split).  
   2. Hybrid offline support (SMS tokens, browser local caching, and formal Barangay administrative endorsement letters for local community alignment).  
4. **Self-Hosted System Architecture**:  
   1. Monolithic web backend with PostgreSQL database, Redis caching, and real-time WebSocket messaging hosted on a dedicated server node.

### **Out-of-Scope**

* Geographic expansion outside Tagudin municipality during the project phase.  
* Paid commercial filings (e.g., formal SEC registrations, BSP payment operator licenses, or external legal retainer fees), which are modeled theoretically within the project proposal.  
* Custom hardware manufacturing and native app store publishing (web browsers and SMS serve all mobile user interactions).

### **Risk Governance Register**

| ID | Risk Event | Like. | Impact | Mitigation Strategy | Owner |
| ----- | ----- | ----- | ----- | ----- | ----- |
| R-01 | Tech Aversion & Data Load Resistance | High | High | Onboard via Human Agents. Servicer operates via basic SMS notifications. | Operations Lead |
| R-02 | Off-Platform Payment Bypass | Med | Med | Escrow protection, verified reviews, and agent commission alignment. | Product Lead |
| R-03 | Network Dead Spots | Med | Med | Implement local browser caching and short SMS tokens for offline deals. | Technical Lead |
| R-04 | Scope Creep | Med | High | Scope out paid government filings; focus on project prototype readiness. | Quality Lead |

### **BUSINESS WORKFLOW RE-ENGINEERING & APP FUNCTION INTEGRATION**

### **System Integration Overview**

Serbizyu integrates informal, unrecorded trade activities into structured software application functions. The platform supports physical products, hands-on services, and digital deliverables across four core integrated workflows:

| SERBIZYU TARGET OPERATIONAL WORKFLOW MAP |  |
| ----- | :---- |
| **1\. DIRECT OFFERS** | Seller Posts Listing \> Buyer Browses/Filters \> Direct Checkout |
| **2\. REQUEST & BIDS** | Buyer Posts Request \> Providers Submit Bids \> Award & Escrow |
| **3\. QUICK DEAL** | Scan Seller QR Code \> In-App Negotiation \> Dual Confirmation |
| **4\. DEAL-CHAINING** | Create Multi-Slot \> Assign Items/Services \> Single Pay/Split |

### **Integrated Application Workflows**

1. **Direct Offer Booking (Seller/Servicer-Initiated)**: Sellers post fixed offerings (products or services). Buyers browse, select options, and check out into escrow protection.  
2. **Request & Bidding Engine (Buyer-Initiated)**: Buyers post custom requirements (e.g., event catering, custom woodwork, or digital graphic design). Local providers submit competitive bids specifying price, timeline, and work samples for buyer selection.  
3. **Face-to-Face Quick Deal**: In-person transactions are initiated by scanning a seller's QR code. Price adjustments are negotiated on-screen (capped at 3 rounds) and locked upon dual confirmation via app or SMS token.  
4. **Event Package Deal-Chaining**: Bundles multiple products and services (e.g., sound system rental, food catering, and photography) under a single package checkout while managing isolated, per-slot escrow releases.

### **STAKEHOLDER MANAGEMENT & ORGANIZATIONAL IMPACT**

### **Stakeholder Matrix & User Roles**

1. **Provincial Buyers (Consumers & Local Event Organizers)**: Local residents seeking verified products and services with transparent pricing and escrow payment safety.  
2. **Micro-Servicers & Local Merchants**: Independent workers, artisans, and sellers needing steady job orders without tech complexity or upfront tax burdens.  
3. **Human Agents (Community Assistants)**: Tech-savvy local youth who manage digital profiles, listings, and bids for offline business owners in exchange for a 10% commission share.  
4. **Project Development & Administration Team**: The student project team (Project Manager, Developer, UI/UX Designer, Quality Tester) responsible for system operations, database integrity, and dispute review.  
5. **Local Barangay Coordination (External Administrative Alignment)**: Handled via formal administrative communication letters (e.g., endorsement requests and informational notices) to align local barangay officials for community awareness and external support.

### **Regulatory Onboarding Ladder & Agent Incentives**

Serbizyu handles business formalization step-by-step through an invisible ladder, avoiding seller drop-off (Bureau of Internal Revenue, 2023):

* **3-Lane Regulatory Ladder**:  
  * *Lane 1 (Unregistered / Informal)*: Phone \+ ID verified; subject to basic monthly transaction caps.  
  * *Lane 2 (Sworn Declaration Tier)*: Servicers earning \< ₱250,000/year file a simple annual declaration under BIR RR 16-2023. Framed as **"keep 100% of your earnings"** to remove tax withholding anxiety (Bureau of Internal Revenue, 2023).  
  * *Lane 3 (Registered Tier)*: Verified business registration; unlocks "Business Verified" badges, lower commission rates, and priority search ranking.

**Agent Graduation Incentive**: When an agent successfully assists a feature-phone business owner in adopting a smartphone and managing their account independently, the agent receives a **Graduation Bonus equal to 3× the owner's average monthly commission**, rewarding digital literacy enablement.

### **PROJECT SCHEDULE & TIME-TO-VALUE ROADMAP**

### **12-Week Development Lifecycle**

Utilizing AI-assisted development tools to accelerate coding, project implementation is structured across a 12-week schedule focused on delivery readiness and evaluation:

* **Phase 1: Foundations & Architecture (Weeks 1–3)**: Configure backend framework, PostgreSQL database schema, and Redis cache on the self-hosted server node. Deploy user authentication, SMS OTP verification, and profile tiers.  
* **Phase 2: Dual Marketplace & Financial Ledger (Weeks 4–6)**: Implement Direct Offers and Buyer Request/Bidding engines. Build the double-entry escrow accounting ledger.  
* **Phase 3: Transaction Primitives & Agent System (Weeks 7–9)**: Deploy face-to-face Quick Deals (QR code scanning, price negotiation, dual confirmation). Integrate the Human Agent Network (delegated profile management, 75/10/15 commission splits, SMS authorization).  
* **Phase 4: Advanced Coordination & Defense Readiness (Weeks 10–12)**: Build multi-slot Deal-Chaining containers. Configure web browser offline caching and short SMS token fallbacks (ACCEPT X7K3). Perform end-to-end testing and complete Tagudin pilot readiness verification for project presentation.

### **Milestone Review Gates**

* **Gate G1 (End of Week 3 — Architecture Review)**: Confirm database migrations and verify SMS OTP delivery reliability on local mobile networks.  
* **Gate G2 (End of Week 6 — Marketplace Engine Review)**: Verify 0% balance drift across automated test suites for double-entry escrow calculations.  
* **Gate G3 (End of Week 9 — Agent & Mobile Review)**: Validate correct execution of the 75/10/15 commission split and SMS token confirmations.  
* **Gate G4 (End of Week 12 — Final Project Evaluation Gate)**: Demonstrate a working prototype on the self-hosted environment, verify 50+ onboarded test listings in Tagudin, and present full project documentation for course evaluation.

**REFERENCES**  
**Angkas.** (2023). *On-demand motorcycle taxi and delivery services in the Philippines*. [https://www.angkas.com](https://www.angkas.com)  
**Asian Development Bank.** (2022). *Informal economy and digital financial inclusion in Southeast Asia*. ADB Institute.  
**Bureau of Internal Revenue.** (2023). *Revenue Regulations No. 16-2023: Prescribing rules and regulations governing the imposition of creditable withholding tax on gross remittances made by electronic marketplace operators*. Department of Finance, Republic of the Philippines.  
**Department of Information and Communications Technology.** (2023). *National Information and Communications Technology Household Survey*. Republic of the Philippines.  
**Meesho.** (2022). *Democratising internet commerce for micro-enterprises and resellers in emerging markets*. [https://www.meesho.com](https://www.meesho.com)  
**Meta Platforms.** (2024). *Facebook Commerce Policies: Prohibited and restricted items on Marketplace*. Meta Help Center. [https://www.facebook.com/policies\_center/commerce](https://www.facebook.com/policies_center/commerce)  
**MyKuya.** (2021). *On-demand personal assistant and errand service platform in Metro Manila*. [https://www.mykuya.com](https://www.mykuya.com)  
**Philippine Statistics Authority.** (2023). *2022 Annual Survey of Philippine Business and Industry (ASPBI)*. Republic of the Philippines.  
**Project Management Institute.** (2021)**.** *A guide to the project management body of knowledge (PMBOK guide)* (7th ed.). Project Management Institute.  
**Shopee Philippines.** (2022). *Understanding Shopee Guarantee and escrow payment mechanics*. Shopee Help Centre. https://help.shopee.ph  
