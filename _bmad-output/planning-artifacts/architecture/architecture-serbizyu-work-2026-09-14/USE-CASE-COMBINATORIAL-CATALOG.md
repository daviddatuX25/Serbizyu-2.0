---
name: Serbizyu 2.0 Tagudin Combinatorial Use-Case Catalog
type: architecture-companion
status: scenario-catalog
created: 2026-09-24
updated: 2026-09-24
binds:
  - ARCHITECTURE-SPINE.md
  - WORK-SCENARIO-COVERAGE.md
---

# Tagudin Combinatorial Use-Case Catalog

## Scope and operating assumptions

This is a 15-case architecture stress catalog: three concrete scenarios in each of the five target sectors. Names, prices, transactions, and provider situations below are fictional design examples located in Tagudin; they do not assert that a named provider, listing, stock item, or live payment capability currently exists. The named barangays are used as scenario locations, not as availability guarantees.

These cases combine Quick Deal negotiation on an active, owned Listing Version; resolver scans; an offline-provider/online-mule bridge; one or more genuinely dependent child Orders; mixed payment lanes; and L0-owner Agent delegation. They are not claims that all customer-facing mechanisms are activated today.

### Authority rules applied in every case

1. **Listing-anchored formation.** The chosen Quick Deal starts from a currently active, owner-authorized Listing Version. Each independently accountable Chain Need also resolves to an active Listing Version owned by that child Order's responsible provider. Each version pins its category, capability profile, safety/data policies, and a launch-allow-listed Work contract. Changing a listing or price after acceptance cannot rewrite a snapshot.
2. **Quick Deal is formation, not a second commerce system.** Base labor, included parts/materials, and urgency are negotiated as separate line items. The resulting offer is accepted only for its exact version/hash. Successful formation invokes the sole `FinalizeOrderAgreement` seam and creates an ordinary Order, immutable `order_terms_snapshot`, Work, and that Order's payment obligation atomically. Counter-offer rounds are not capped; stale versions are rejected, not silently merged.
3. **Resolver references have different authority.** `USR` resolves a Citizen/Provider badge and, for a Provider, exposes that provider's active authorized multi-listing catalog; `LST` resolves one exact Listing Version; `QDO` resolves one version-bound active Deal Offer; `QDR` resolves a sealed, read-only receipt. A scan is discovery or retrieval only: it does not imply acceptance, create a child Order, release funds, or prove Work quality. Stale/inactive `LST`/`QDO` versions fail closed. A `QDR` cannot be used to mutate its sealed source Order.
4. **The data mule bridges bytes, not authority.** An L2 offline PWA can create a locally signed, version-bound envelope containing its Need/listing version, expected row version, line items, canonical terms hash, actor/client attribution, nonce, and evidence references. A nearby L3 buyer/runner/Agent can carry it by local QR or device-to-device transfer and upload it through the normal online command path. The signature evidences the envelope's origin/integrity; it is not cloud acceptance, cryptographic escrow authority, or permission to skip server checks. An L0 owner cannot sign a PWA envelope: the owner supplies the required SMS OTP consent to the online service for the exact delegated action/terms hash. The cloud rechecks consent, signatures, listing and offer versions, activation, safety, capacity, acceptance, idempotency, and Chain acyclicity before any final Order. Conflicts are parked for attributable human resolution.
5. **A locked Chain has a confirmation turn at the end.** Every Need has an attributable, version-bound confirmation from its buyer and responsible provider (or a valid, scoped Agent acting-for grant plus the required owner's exact SMS consent). The Chain becomes locked only after all slots and exact child terms are confirmed. Invitations, scans, envelopes, and proposed offers alone create no Order.
6. **Topology follows accountability.** A Chain is an acyclic coordination graph, not a cart balance. Each provider promise with its own acceptance, liability, cancellation, or payment boundary is an independent child Order. Work phases/checklists stay inside that provider's Work. A replacement creates a new Order on the same Need with explicit lineage; it never rewrites a failed Order or cascades failure/payment penalties to a completed sibling.
7. **Payment is isolated by child Order.** Each example assigns a payment lane to each child obligation. External Cash is a face-to-face event outside platform custody. External Digital Proof stores a declared/reference/screenshot plus counterparty acknowledgment; it is not provider verification, cleared funds, or escrow. Tiwala Protected Digital is shown as a sandbox-only lane until its activation/legal/provider gates pass; the platform makes no live escrow, insurance, or guaranteed-recovery claim. No parent wallet, pooled balance, chain-wide escrow, cross-provider debit, or settlement netting exists. Work completion is a Work fact; payment release/settlement is a separate PaymentObligations action.
8. **Delegation and split are scoped.** The L0 owner retains account ownership and goods/cash custody. A verified Agent acts only under an attributable, revocable, time-bounded grant. In each case, the owner uses SMS OTP to consent to the Agent's listing activation/assignment and to the specific final Quick Deal terms hash. The Agent may not broaden price, payer, recipient, custody, or scope. The modeled 80/10/10 allocation is an immutable per-child Order snapshot (owner/Agent/platform; platform receives any rounding residual) for an eligible, explicitly activated agent-managed schedule; it is never a Chain-level split. In the figures below it is a **sandbox allocation illustration only**. The accepted initial Tagudin External Cash policy remains 0% platform commission and creates no cash commission receivable; External Digital Proof also does not move or split money. No such illustration is posted as a live Tagudin payout.
9. **Only launch Work shapes are used.** Cases use A1 Linear Project, A3 Appointment, A4 Handoff, and A9 Digital Delivery. Emergency is an A8-style urgency/safety overlay on a supported shape, not a standalone Work shape. A7 is a quote/bid formation mechanism, not a Work shape. A2 Live Dispatch, A5 Rental, A6 Recurring Service, and A10 Long-running Care remain inactive/deferred; a request that needs those semantics must fail with `work_contract_inactive_or_unsupported` and form no Order, Work, reservation, or obligation. None of the cases disguises dispatch, rental, recurrence, or continuing care as a supported shape.

## Coverage matrix

| # | Sector | Tagudin barangay | Resolver trigger | Chosen Work shape | Chain topology | Child-lane mix |
|---:|---|---|---|---|---|---|
| 1 | Home, building, plumbing, electrical, HVAC | Bio | `USR` provider badge | A1 | Sequential; replacement | Cash + Tiwala sandbox |
| 2 | Home, building, plumbing, electrical, HVAC | Dacutan | `LST` listing QR | A1 | Parallel diagnostic fork, joined repair | Cash + External Digital Proof + Tiwala sandbox |
| 3 | Home, building, plumbing, electrical, HVAC | Magsaysay | `QDO` active deal QR | A1 | Safety gate then repair | Cash + Tiwala sandbox |
| 4 | Automotive, motorcycle, marine, fleet | Poblacion | `USR` provider badge | A1 | Diagnostic then replacement | Cash + Tiwala sandbox |
| 5 | Automotive, motorcycle, marine, fleet | Baritao | `LST` listing QR | A1 | Fabrication → handoff → repair | Cash + External Digital Proof + Tiwala sandbox |
| 6 | Automotive, motorcycle, marine, fleet | Turod | `QDO` active deal QR | A1 | Parallel repairs joined by inspection | Cash + External Digital Proof + Tiwala sandbox |
| 7 | Events, hospitality, catering, rentals | Poblacion | `USR` provider badge | A1 | Food → courier → setup | Cash + External Digital Proof + Tiwala sandbox |
| 8 | Events, hospitality, catering, rentals | Bitalag | `LST` listing QR | A1 | Parallel isolation and sourcing, joined repair | Cash + External Digital Proof + Tiwala sandbox |
| 9 | Events, hospitality, catering, rentals | Sawat | `QDO` active deal QR | A1 | Parallel replenishment, joined service | Cash + External Digital Proof + Tiwala sandbox |
| 10 | Personal care, health, domestic, professional | Bio | `USR` provider badge | A3 | Alteration → garment handoff → appointment | Cash + External Digital Proof + Tiwala sandbox |
| 11 | Personal care, health, domestic, professional | Quinarayan | `LST` listing QR | A9 | Scan → transcription artifact | Cash + Tiwala sandbox |
| 12 | Personal care, health, domestic, professional | Mallig | `QDO` active deal QR | A1 | Pickup → laundry → alteration → return | Cash + External Digital Proof + Tiwala sandbox |
| 13 | Agriculture, fishery, retail, light industry | Bitalag | `USR` provider badge | A4 | Parallel inputs joined by packhouse handoff | Cash + External Digital Proof + Tiwala sandbox |
| 14 | Agriculture, fishery, retail, light industry | Sagsagat | `LST` listing QR | A1 | Parallel catch/ice inputs joined by processing | Cash + External Digital Proof + Tiwala sandbox |
| 15 | Agriculture, fishery, retail, light industry | Lubnac | `QDR` receipt, then current `QDO` | A1 | Parallel isolation and sourcing, joined repair | Cash + External Digital Proof + Tiwala sandbox |

## Sector 1 — Home, Building, Plumbing, Electrical, HVAC

### 1. Bio — Monsoon roof leak with a safety-first repair

**Situation and actors.** During sustained rain in Barangay Bio, a homeowner sees water entering beside a roof-mounted electrical conduit. The buyer is L3. The roofer/listing owner uses an L0 feature phone; verified Agent Mila has L3 connectivity and an active scoped grant. A separate electrician uses an L2 PWA and is offline at the property. The buyer's L3 phone is the local data mule.

**Listing anchor and resolver.** The buyer scans the roofer's `USR` Provider badge. Resolver returns that provider's active catalog—roof leak patch, gutter clearing, and door-frame repair—and the buyer selects the exact active **Roof leak patch and membrane repair** Listing Version (home/building profile, A1 Linear Project). The badge scan did not select every catalog entry or authorize a booking. The electrician's safety-check Need also cites that electrician's own active A3 Listing Version.

**Negotiation.** Agent Mila drafts a Quick Deal on the roofer's chosen listing: **base labor ₱1,700 + roofer-supplied patch/fasteners/sealant ₱850 + rain urgency ₱400 = ₱2,950**. Buyer counters **₱1,600 + ₱800 + ₱300 = ₱2,700**, asking to defer a non-leaking gutter. The Agent sends the counter to the owner; the L0 owner returns the one-time SMS OTP tied to the revised exact terms hash and consents to **₱1,650 + ₱850 + ₱350 = ₱2,850**. The buyer accepts that same version/hash online. Modeled sandbox allocation on the roofer's child Order: owner **₱2,280**, Agent **₱285**, platform **₱285**; it is not a live payout.

**Deal Chain and connectivity.** Sequential graph: **N1 electrician A3 circuit-isolation/access check → N2 roofer A1 patch**. Electrician locally signs its envelope against its active listing and expected version; buyer carries the QR envelope to the online command path. Agent Mila sends the roofer's accepted offer and owner OTP evidence through SMS-backed delegation. Both parties of each Need confirm exact terms; only then is the graph locked and N2 formed. N1's verified `circuit_isolated` fact gates roof work; the buyer does not dispatch a roofer merely by scanning `USR`.

**Payment and failure recovery.** N1 uses **External Cash** after its own face-to-face inspection/receipt; N2 uses **Tiwala sandbox** under its independent obligation. There is no cash custody or shared Chain pot. If the roof provider finds a different membrane requirement, it proposes a new parts-line revision and waits for exact buyer/owner confirmation; it does not silently substitute. If the roofer no-shows, N2 is failed/`replacement_needed`, a new active roofer Listing Version and child Order are confirmed, and N1's completed cash service remains settled without a cross-provider penalty.

### 2. Dacutan — Bore-pump restart after parallel electrical and plumbing checks

**Situation and actors.** A household bore pump runs dry after a pressure drop in Barangay Dacutan. Buyer is L3; the pump technician/Listing owner is L0 with Agent Ben's verified L3 delegation. A licensed electrician and an inlet plumber each have an L2 offline PWA; the buyer carries both local envelopes while connected at the nearest signal point.

**Listing anchor and resolver.** Buyer scans the exact `LST` QR for **Bore-pump repair and seal replacement**, an active A1 Listing Version owned by the pump technician. The scan pins that version rather than searching for another pump listing. Electrician and plumber Needs are separately anchored to their own active A3 diagnostic Listing Versions.

**Negotiation.** The chosen pump-service Quick Deal starts at **base labor ₱2,050 + pump seal/connector parts ₱600 + same-day urgency ₱300 = ₱2,950**. Buyer counters **₱1,950 + ₱550 + ₱200 = ₱2,700** if the existing cable is sound. Owner authorizes Agent Ben to submit the exact counter; after reviewing both diagnostic scopes by SMS, owner OTP-confirms **₱2,050 + ₱600 + ₱300 = ₱2,950** and buyer accepts the matching hash. The per-child sandbox 80/10/10 illustration is **₱2,360 / ₱295 / ₱295**.

**Deal Chain and connectivity.** A homeowner-recorded `pump_disconnected` fact enables a genuine **parallel fork**: **N1 electrician A3 load/isolation test** and **N2 plumber A3 inlet/suction test** run independently; **N3 pump technician A1 repair** waits for both verified results. L2 provider PWAs sign each bounded offer locally. L3 buyer uploads both after local handoff; agent's connected service carries the L0 owner's exact OTP consent. The Chain is locked only after all three buyer/provider confirmations. Neither diagnostic result is embedded as mutable Quick Deal payload; verified, scoped Work facts satisfy N3's gate.

**Payment and failure recovery.** N1 is **External Cash**; N2 is **External Digital Proof** (reference and counterparty acknowledgment only); N3 is **Tiwala sandbox**. A plumber's GCash screenshot is not declared cleared funds. If either diagnostic provider finds unsafe wiring or a dry well, N3 remains blocked, not completed or payable by inference. A no-show diagnostic is replaced on its own Need; the other branch's completed Order and obligation are untouched.

### 3. Magsaysay — Air-conditioner capacitor repair after a circuit check

**Situation and actors.** An inverter AC trips repeatedly during a hot afternoon in Barangay Magsaysay. Buyer is L3. The L0 HVAC owner delegates negotiation to Agent Ruel over an existing scoped grant; a separate electrician is L2/offline. The buyer's connected phone carries the technician's locally signed envelope to cloud sync.

**Listing anchor and resolver.** The buyer scans the **active `QDO` Deal Offer QR** displayed by the HVAC Agent. It resolves the open Quick Deal and exact active offer version for **Inverter AC capacitor and drain repair**, whose underlying active Listing Version is A1 Linear Project. Scan displays the line items and version; it is not an acceptance tap. The circuit-check Need uses the electrician's separate active A3 Listing Version.

**Negotiation.** HVAC offer: **base labor ₱1,500 + capacitor/relay kit ₱1,000 + same-day urgency ₱300 = ₱2,800**. Buyer counters **₱1,400 + ₱900 + ₱200 = ₱2,500**, requesting no optional coil wash. Agent counters on the owner's behalf **₱1,450 + ₱950 + ₱250 = ₱2,650**; owner OTP-confirms that exact hash by SMS and the buyer accepts online. Sandbox split illustration: owner **₱2,120**, Agent **₱265**, platform **₱265**.

**Deal Chain and connectivity.** Sequential gate: **N1 electrician A3 verifies safe circuit isolation → N2 HVAC A1 replaces the kit and tests the unit**. L2 electrician signs a local envelope; the L3 buyer transports it; Agent relays the L0 owner's offer/OTP. At sync, server confirms the `QDO` expected version is current before finalizing N2; if another counter already advanced it, the old QR is stale and needs reconfirmation. Each node's parties confirm its own exact snapshot before the Chain locks.

**Payment and failure recovery.** N1 is **External Cash**, N2 is **Tiwala sandbox**; no Chain escrow exists. If the exact capacitor is unavailable, the provider records a blocked/shortfall fact, proposes a specified compatible part as a new terms version, and waits for both parties' acceptance; the original accepted terms remain immutable. A completed electrical check is neither a successful AC repair nor a command to release N2 funds.

## Sector 2 — Automotive, Motorcycle, Marine, Fleet

### 4. Poblacion — Motorcycle charging failure before the morning market

**Situation and actors.** A delivery rider's motorcycle will not start before a market run in Barangay Poblacion. Buyer/rider is L3. The battery mechanic and Listing owner is L0; verified Agent Jo has L3 access. A second diagnostic mechanic is L2/offline; the buyer can carry the signed inspection envelope to a connected point.

**Listing anchor and resolver.** Rider scans the mechanic's `USR` Provider badge. The resolver exposes active catalog entries for puncture patch, tune-up, and **battery/charging repair**. Rider selects that exact active A1 Listing Version. Diagnostic provider's independent A3 appointment Listing Version anchors the pre-repair charging test.

**Negotiation.** Quick Deal starts at **base labor ₱900 + replacement battery ₱1,700 + urgent fitment ₱250 = ₱2,850**. Rider counters **₱850 + ₱1,550 + ₱150 = ₱2,550** using a lower-capacity battery. Mechanic counters **₱900 + ₱1,650 + ₱200 = ₱2,750** for the specified safe capacity; owner gives SMS OTP consent on that final hash, and rider accepts. Sandbox split: **owner ₱2,200; Agent ₱275; platform ₱275**.

**Deal Chain and connectivity.** Sequential graph: **N1 independent A3 charging/voltage diagnosis → N2 battery mechanic A1 replacement**. Offline diagnostic provider signs versioned test scope locally; rider's L3 phone is the mule. Agent submits the L0 owner's price/part confirmation online. N2 is not formed from the `USR` scan: all child Needs, versions, exact party confirmations, and final acceptance are checked first.

**Payment and failure recovery.** N1 is **External Cash**; N2 is **Tiwala sandbox**. If the quoted battery is out of stock, mechanic does not fit a different brand/capacity under the old snapshot: Agent requests a versioned substitute offer and owner/buyer reconfirm. If the diagnostic shows a charging-coil defect outside the accepted listing scope, N2 pauses for a new proposal; the diagnostic Order can stand on its own and no new mechanic Order is created without acceptance.

### 5. Baritao — Outboard motor impeller and shaft-key repair

**Situation and actors.** A small fishing boat's outboard loses thrust near its mooring in Barangay Baritao. Boat owner is L3. The marine mechanic/Listing owner is L0 and uses Agent Cora under explicit delegation. A machine shop is L2/offline; an L3 runner carries its local signed fabrication offer to the mechanic.

**Listing anchor and resolver.** Owner scans the exact `LST` QR on **Outboard impeller and shaft service**, an active A1 marine-repair Listing Version. Resolver binds the selected listing/version; it does not grant access to the owner's unrelated services. Fabrication and boat-side handoff each use their providers' separate active A1/A4 Listing Versions.

**Negotiation.** Mechanic proposes **base labor ₱2,400 + mechanic-supplied seal/gasket parts ₱850 + tide-window urgency ₱500 = ₱3,750**. Buyer counters **₱2,200 + ₱800 + ₱350 = ₱3,350** if shaft-key machining is unnecessary. After the offline inspection envelope arrives, mechanic counters **₱2,300 + ₱850 + ₱400 = ₱3,550** and specifies the separate fabricated shaft key as its own child Order, not a second charge in mechanic parts. Owner OTP-confirms the hash and buyer accepts. Sandbox allocation for mechanic Order: **₱2,840 / ₱355 / ₱355**.

**Deal Chain and connectivity.** Sequential graph: **N1 machine shop A1 fabricates keyed part → N2 runner A4 signed custody handoff to shore mechanic → N3 marine mechanic A1 repairs and test-runs at safe mooring**. The local fabrication envelope is signed offline; L3 runner uploads it. The L0 owner authorizes the exact revision by SMS; every N1–N3 provider and buyer confirms its own terms before Chain lock. The machine-shop parts/price and courier fee are independent child obligations.

**Payment and failure recovery.** N1 is **External Digital Proof** only; N2 is **External Cash** at custody handoff; N3 is **Tiwala sandbox**. If shaft-key tolerance fails, N1 enters a mismatch/dispute path and a replacement Need can be accepted; N2/N3 do not absorb the fabrication provider's liability. If the courier's custody seal is broken, its A4 mismatch evidence is handled on that Order; no mechanic Work-completion or payment fact is inferred.

### 6. Turod — Fleet van alternator and tire repairs before release

**Situation and actors.** A small van serving two barangays is parked in Barangay Turod with a charging warning and a worn rear tire. Fleet buyer is L3. The alternator technician/Listing owner is L0; Agent Lito has verified scoped access and SMS consent. A tire provider runs L2 offline PWA; an independent roadworthiness inspector is online L3. The buyer is the mule for the tire envelope.

**Listing anchor and resolver.** Fleet manager scans the active `QDO` QR for the current **Van alternator-belt repair** Quick Deal, rooted in the technician's active A1 Listing Version. The QR resolves one offer version, not an entire fleet authorization. Tire service A1 and inspection A3 each use their own active provider listings.

**Negotiation.** Alternator offer: **base labor ₱1,250 + belt/diode parts ₱1,100 + breakdown urgency ₱250 = ₱2,600**. Fleet manager counters **₱1,150 + ₱1,000 + ₱150 = ₱2,300**; owner counteroffers **₱1,200 + ₱1,050 + ₱200 = ₱2,450**, then both accept the same terms hash. Modeled sandbox split: **₱1,960 / ₱245 / ₱245**.

**Deal Chain and connectivity.** After the vehicle is parked/chocked, a true **parallel fork** starts **N1 alternator A1 repair** and **N2 tire A1 replacement**; an independent **N3 A3 roadworthiness check** joins only after both verified completion facts. Tire provider signs an offline envelope; fleet manager L3 uploads it. Agent's SMS OTP evidence binds the L0 alternator owner's final price. The Chain locks only when buyer and each responsible provider confirm their exact Need snapshots.

**Payment and failure recovery.** N1 uses **Tiwala sandbox**, N2 **External Cash**, N3 **External Digital Proof** (inspection reference/acknowledgment, not a verified official certificate unless separately verified). If the tire size is unavailable, N2 is blocked and a replacement Need/provider is proposed; N1 can still complete and qualify only under its own obligation. N3 remains gated. No penalty, offset, refund, or escrow transfer crosses providers.

## Sector 3 — Events, Hospitality, Catering, Rentals

### 7. Poblacion — Merienda buffet for a 48-person barangay-family gathering

**Situation and actors.** A family gathering in Barangay Poblacion needs a merienda buffet with a fixed 3:30 p.m. serving window. Buyer/host is L3. The caterer/listing owner has an L0 phone; Agent Lani acts under owner SMS consent. A courier uses an L2 offline PWA; an independent table-setter is L3. Host's phone carries the courier's local envelope.

**Listing anchor and resolver.** Host scans caterer's `USR` badge and sees the active catalog (small snack boxes, rice trays, buffet service). Host selects the active **48-person merienda buffet** Listing Version, A1 Linear Project. Courier A4 and setup-provider A1 Needs cite their respective active Listing Versions; the Provider badge alone does not attach them to the Deal.

**Negotiation.** Caterer Quick Deal: **prep/serving labor ₱2,400 + ingredients/food-safe trays ₱4,600 + same-day rush ₱600 = ₱7,600**. Host counters **₱2,200 + ₱4,300 + ₱400 = ₱6,900** for one fewer snack item. Caterer returns **₱2,300 + ₱4,500 + ₱500 = ₱7,300**, which host accepts; L0 owner SMS OTP confirms exact terms hash. Sandbox split: **owner ₱5,840, Agent ₱730, platform ₱730**.

**Deal Chain and connectivity.** Sequential graph: **N1 caterer A1 seals the food-ready/temperature fact → N2 courier A4 takes custody and delivers → N3 table-setter A1 lays out the accepted package**. Offline courier signs the exact pickup window and custody terms; host L3 uploads the envelope. Agent can coordinate routine status but cannot change servings, food substitutions, buyer, or price without exact acceptance. Chain remains unlocked until each provider and host confirms its own current version.

**Payment and failure recovery.** N1 **Tiwala sandbox**, N2 **External Cash** on handoff, N3 **External Digital Proof** (reference/acknowledgment only). If the kitchen is short one agreed item, caterer records a partial/mismatch and proposes an explicitly priced substitution; it does not count as full Work or unlock N2/N3 obligations without their policy facts. If courier misses the window, create a replacement courier Order on that Need; food provider's completed sealed-batch promise remains isolated.

### 8. Bitalag — Emergency event-panel repair with concurrent isolation and sourcing

**Situation and actors.** A community-hosted event in Barangay Bitalag discovers a failed distribution breaker before doors open. Event organizer is L3. The repair electrician and Listing owner is L0; Agent Arman has a scoped grant and owner OTP. A separate licensed isolator and parts-counter provider are L2/offline; an online organizer carries both envelopes.

**Listing anchor and resolver.** Organizer scans the exact `LST` QR for **Event-panel breaker repair**, an active electrical A1 Listing Version with its safety profile. It pins that listing and the current profile; it does not certify the venue or enable power-up. Isolator A3, switchgear seller A4, and courier A4 each cite active owned listings.

**Negotiation.** The chosen repair Quick Deal is **base labor ₱2,900 + the repair electrician's terminal/connector parts ₱1,450 + event-window urgency ₱400 = ₱4,750**. Organizer counters **₱2,700 + ₱1,300 + ₱300 = ₱4,300**, reducing only the repair provider's included terminal kit. Repair owner counters **₱2,800 + ₱1,400 + ₱350 = ₱4,550**, then OTP-confirms its exact hash; organizer accepts. Modeled sandbox split: **₱3,640 / ₱455 / ₱455**. The separately sourced breaker is itemized only on N2; it is not counted in the repair Order's parts line, avoiding a double charge.

**Deal Chain and connectivity.** A **parallel fork** starts after the venue reports the fault: **N1 independent electrician A3 isolates and tests the circuit** while **N2 parts shop A4 reserves an exact breaker**; **N2 → N3 courier A4**; **N1 and N3 → N4 chosen repair electrician A1**. Offline envelopes are signed locally and uploaded by the organizer L3 mule. Server revalidates each expected listing/Need version and locks the DAG only after every provider and buyer confirms its exact terms; repair is blocked until isolation and delivery facts are verified.

**Payment and failure recovery.** N1 is **External Cash**, N2 **External Digital Proof**, N3 **External Cash**, N4 **Tiwala sandbox**. If the breaker is unavailable, N2's provider proposes a newly identified model and revised terms; no swap occurs under the old acceptance. A completed N1 safety check remains its own settled promise if N2 fails. Replacement sourcing uses a new Need Order, with no parent escrow or cross-provider charge.

### 9. Sawat — Wake coffee-and-cold-drink service with two parallel replenishments

**Situation and actors.** A wake reception in Barangay Sawat asks for hot coffee and cold drinks on short notice. Host is L3. Cart owner is L0; Agent Nena has verified scoped delegation and SMS consent. Ice supplier and dry-goods runner use L2 offline PWAs. Host's phone is their shared local data mule, but it uploads each provider's own separately attributed offer.

**Listing anchor and resolver.** Host scans the cart's active `QDO` Deal Offer QR for the current **Coffee and cold-drink cart service** Quick Deal; its active Listing Version pins A1 Linear Project. Resolver exposes that offer version; it does not combine supplier line items into the cart's obligation. Ice and dry-goods Needs each identify their active A4 listing versions.

**Negotiation.** Cart offer: **service/serving labor ₱1,800 + cart-owned coffee, milk and cups ₱1,350 + wake-window urgency ₱450 = ₱3,600**. Host counters **₱1,650 + ₱1,200 + ₱300 = ₱3,150** by reducing cup count. Cart owner counters **₱1,700 + ₱1,300 + ₱400 = ₱3,400**; host accepts and L0 owner SMS OTP confirms that hash. Ice blocks and extra dry-goods crates remain separate child items and are not in the cart's ₱1,300. Modeled sandbox split: **₱2,720 / ₱340 / ₱340**.

**Deal Chain and connectivity.** Parallel inputs: **N1 ice supplier A4** and **N2 dry-goods runner A4** proceed concurrently; **N1 + N2 → N3 cart service A1**. L2 sellers sign local, versioned handoff envelopes; host L3 uploads them. Cart owner acts only through the Agent's grant and exact SMS consent. Chain confirmation waits until all suppliers, cart provider, and host accept their respective exact terms versions.

**Payment and failure recovery.** N1 **External Cash**, N2 **External Digital Proof**, N3 **Tiwala sandbox**. If ice stock is out, N1's Need is blocked and a replacement ice Listing Version/provider needs its own accepted Order; the dry-goods Order remains independently complete. Cart service does not start or satisfy payment due facts until required chilling inputs are verified. A screenshot is not proof of cleared supplier funds.

## Sector 4 — Personal Care, Health, Domestic, Professional

### 10. Bio — Bridal hair appointment after a dress alteration

**Situation and actors.** A bride preparing in Barangay Bio needs an early-morning hair appointment after a blouse/dress alteration. Bride is L3. Hairstylist/listing owner is L0; Agent Pilar has an explicit delegated grant and exact SMS OTP. Tailor is L2/offline and a garment courier is L2/offline; bride's L3 device carries their signed envelopes. This case purchases one appointment, not recurring care or a medical service.

**Listing anchor and resolver.** Bride scans stylist's `USR` Provider badge, unpacks active catalog listings for bridal hair, occasion makeup, and hair trimming, then selects **Bridal hair and makeup appointment**, active A3 Listing Version. Alteration A1 and garment handoff A4 each use the responsible provider's active listing. The `USR` scan does not book the entire catalog.

**Negotiation.** Stylist Quick Deal: **appointment labor ₱1,750 + sanitation/consumable kit ₱350 + 5 a.m. call-time urgency ₱350 = ₱2,450**. Bride counters **₱1,650 + ₱300 + ₱250 = ₱2,200**, omitting a second look. Stylist counteroffers **₱1,700 + ₱350 + ₱300 = ₱2,350**, and bride accepts; L0 owner OTP binds that final offer hash. Sandbox split illustration: **₱1,880 / ₱235 / ₱235**.

**Deal Chain and connectivity.** Sequential handoff: **N1 tailor A1 alteration → N2 garment courier A4 signed custody delivery → N3 stylist A3 attends within the confirmed slot**. Each offline provider signs its own envelope locally. Bride's L3 phone posts them; Agent relays the owner's appointment acceptance. The stylist appointment only forms after the chain parties confirm the exact terms, time slot, and custody scope; an SMS grant does not authorize the Agent to receive or hold the dress.

**Payment and failure recovery.** N1 **External Cash**, N2 **External Digital Proof**, N3 **Tiwala sandbox**. If the tailor finds a seam that cannot be altered within the accepted limit, it records a partial/mismatch and seeks a separately accepted amendment; it cannot extend the stylist appointment or silently revise fees. A stylist no-show raises `replacement_needed` for N3; tailor/courier completion and their own settlements remain untouched.

### 11. Quinarayan — Digitize farm delivery tallies and prepare a searchable transcript

**Situation and actors.** A family farm in Barangay Quinarayan needs handwritten produce-delivery tallies scanned and transcribed for its own records, without claiming official filing or certified translation. Buyer is L3. The digitization provider/owner uses L0; Agent Sabel has a verified grant. Transcriber is L2/offline, and buyer carries the locally signed artifact terms envelope.

**Listing anchor and resolver.** Buyer scans an exact `LST` QR for **Farm tally scan and indexed PDF**, an active A9 Digital Delivery Listing Version. It pins the selected listing's privacy/data policy. The separate transcriber uses its own active A9 listing for transcription; physical originals remain buyer-controlled and are not placed in a public catalog.

**Negotiation.** Scan offer: **scan/index labor ₱850 + clean sleeves/encrypted transfer media ₱250 + same-day urgency ₱100 = ₱1,200**. Buyer counters **₱800 + ₱200 + ₱100 = ₱1,100** for scans only. Owner's final offer is **₱800 + ₱250 + ₱100 = ₱1,150**, with one private download and no retained source image; buyer accepts, and the L0 owner's SMS OTP is bound to the terms hash. Sandbox split illustration: **₱920 / ₱115 / ₱115**.

**Deal Chain and connectivity.** **N1 digitization A9 produces an encrypted, versioned scan artifact → N2 transcriber A9 creates a separate searchable transcript from that verified artifact version.** The offline transcriber signs its local envelope naming the exact artifact input key, not the customer's unrelated files. Buyer L3 is the mule. Agent's access is purpose-scoped; server verifies document access, retention, versions, and both parties' exact acceptance before locking the Chain.

**Payment and failure recovery.** N1 **Tiwala sandbox**; N2 **External Cash** after the agreed transcript handoff. Originals and artifact are separately access-controlled; payment release is not scan-quality approval. If pages are blurred, N1 stays in revision/partial status and N2 remains gated until buyer approves a verified artifact version. A transcriber cannot claim completion from the upload event alone; a failed upload becomes reconciliation/retry, not an accepted artifact.

### 12. Mallig — Same-day laundry with a separately accepted button repair

**Situation and actors.** A household in Barangay Mallig needs one bag of laundry cleaned before travel and one shirt button repaired. Customer is L3. Laundry owner is L0; Agent Berto has SMS consent and a narrow grant. Pickup courier and seamstress are L2/offline; customer carries their signed offers to the online service. This is a one-time finite service, not A6 Recurring Service.

**Listing anchor and resolver.** Customer scans the current `QDO` QR for **Same-day wash, dry and fold**, anchored to the laundry provider's active A1 Listing Version. The deal preview identifies the version and exact counter state. Courier A4 and seamstress A1 each have separately owned active listings and terms.

**Negotiation.** Laundry Quick Deal: **wash/fold labor ₱1,450 + detergent/stain-safe supplies ₱450 + same-day urgency ₱150 = ₱2,050**. Customer counters **₱1,350 + ₱400 + ₱100 = ₱1,850**, excluding delicate garments. Laundry owner counters **₱1,400 + ₱450 + ₱150 = ₱2,000**; owner consents via exact-hash SMS OTP and customer accepts. Sandbox allocation: **₱1,600 / ₱200 / ₱200**. The shirt button repair is a distinct tailor Order and does not hide inside laundry parts.

**Deal Chain and connectivity.** **N1 pickup courier A4 custody receipt → N2 laundry A1 wash/fold → N3 seamstress A1 button repair after laundry handoff → N4 return courier A4 delivers the named bag/shirt to customer.** Pickup and return are separately accepted trip promises with their own active Listing Versions, not an A5 rental or one pooled transport fee. The L2 providers sign local envelopes; customer's L3 device uploads them. The Agent cannot alter garment count or custody recipient under the standing grant.

**Payment and failure recovery.** N1 and N4 are **External Cash** at their respective handoffs; N2 is **Tiwala sandbox**; N3 is **External Digital Proof** only. If a garment is missing/damaged at pickup, the courier A4 Order records the mismatch and N2 is not treated as having received it. If the seamstress cannot match the button, the buyer must accept a new part/price version or remove that separately accountable Need before Chain lock; no unaccepted sidecar is added.

## Sector 5 — Agriculture, Fishery, Retail, Light Industry

### 13. Bitalag — Pack a dawn vegetable lot with synchronized crate and runner supply

**Situation and actors.** A grower in Barangay Bitalag has a dawn lot of leafy vegetables to sort and pack for a local retailer. Grower/buyer is L3. The packhouse service owner is L0; Agent Cely has scoped authority and an SMS-confirmed exact Quick Deal. Crate seller and field runner each use L2 offline PWA; grower's connected handset uploads their signed envelopes.

**Listing anchor and resolver.** Grower scans the packhouse `USR` Provider badge and unpacks active listings for lot sorting/packing, retail bagging, and seedling delivery. They select **Dawn greens sorting and packout**, an active A4 Handoff Listing Version with lot, quantity, condition, and receipt requirements. Runner and crate/liner seller use their independent active A4 Listing Versions.

**Negotiation.** Packhouse offer: **sorting/packout labor ₱1,200 + food-safe liners/labels ₱650 + dawn-window urgency ₱250 = ₱2,100**. Grower counters **₱1,100 + ₱600 + ₱200 = ₱1,900** if reusable crates pass cleanliness check. Packhouse counters **₱1,150 + ₱650 + ₱250 = ₱2,050**; grower accepts and L0 owner OTP confirms the hash. Sandbox split: **₱1,640 / ₱205 / ₱205**. Crates procured from the separate seller are not included in the packhouse materials line.

**Deal Chain and connectivity.** Parallel inputs **N1 field runner A4 lot custody pickup** and **N2 seller A4 crates/liners handoff** proceed concurrently; **N1 + N2 → N3 packhouse A4 lot receipt, sort, and accepted packed handoff**. Offline provider signatures bind lot ID, quantity units, listing version, and expected row version; grower's L3 phone is the mule. Only confirmed exact Need terms lock the Chain; photos/weight readings remain evidence candidates until verified under the capability policy.

**Payment and failure recovery.** N1 **External Cash**, N2 **External Digital Proof**, N3 **Tiwala sandbox**. If the seller has no clean crates, N2 is blocked and a replacement seller/order or buyer-approved packaging alternative is needed. The runner's completed custody receipt is not penalized for the seller's stockout. A short-weight or wilted lot is a typed A4 mismatch/partial fact; it neither completes N3 nor satisfies its payment due condition automatically.

### 14. Sagsagat — Keep a fish catch cold while arranging a separate processing handoff

**Situation and actors.** A small fisher lands a morning catch in Barangay Sagsagat and requests safe icing and a separately contracted cleaning/packing service before retail handoff. Fisher is L3. The processor/Listing owner is L0; Agent Tino has a time-bounded grant and exact SMS OTP. Ice seller and landing runner use L2 offline PWAs; fisher's connected phone is the mule.

**Listing anchor and resolver.** Fisher scans the exact `LST` QR for **Fresh catch cleaning and sealed packout**, an active A1 Listing Version with weight, species/lot, food-contact handling, and temperature evidence requirements. The ice supplier A4 and catch runner A4 each cite a separate active owned Listing Version. No listing promises cold storage rental or live dispatch.

**Negotiation.** Processor offers **cleaning/packing labor ₱1,700 + food-grade bags and processor-supplied ice top-up ₱850 + tide-window urgency ₱250 = ₱2,800**. Fisher counters **₱1,600 + ₱750 + ₱200 = ₱2,550**. Processor counters **₱1,650 + ₱800 + ₱250 = ₱2,700**, accepted by fisher after the L0 owner sends exact-hash SMS OTP consent. Sandbox split illustration: **₱2,160 / ₱270 / ₱270**. Ice seller's separately invoiced quantity remains outside the processor line item.

**Deal Chain and connectivity.** Parallel prerequisites: **N1 runner A4 records custody/lot handoff of landed catch** and **N2 ice seller A4 records the accepted ice quantity/seal**; **N1 + N2 → N3 processor A1 cleans and packs the identified lot**. L2 providers sign offline envelopes with units, time, lot, and condition; fisher's L3 handset uploads. Chain locks only after the buyer, runner, ice seller, and processor confirm their own current terms, including substitution and temperature floors.

**Payment and failure recovery.** N1 is **External Cash**, N2 **External Digital Proof**, N3 **Tiwala sandbox**. If ice stock is out, N2 emits a blocked Need and replacement is a new child Order with its own acceptance. N1's completed handoff remains isolated; processor cannot start or satisfy its obligation until a verified condition/quantity fact permits it. A photo alone is a candidate, not proof of accepted temperature or quality.

### 15. Lubnac — Rice-mill belt failure using a sealed maintenance receipt and a fresh offer

**Situation and actors.** A small rice mill in Barangay Lubnac stalls at harvest time with a drive-belt failure. Mill operator is L3. The repair provider/listing owner is L0; Agent Mila is assigned through owner SMS OTP and scoped authorization. Electrical isolator and belt counter each use L2 offline PWA. Operator's L3 phone carries their signed offers.

**Listing anchor and resolver.** Operator first scans a prior **`QDR` sealed receipt** for the last mill bearing service. Resolver displays its immutable terms, listed serial, and verified evidence references read-only; it neither reopens that Order nor proves that the new belt is sound. Operator then scans the current **`QDO` active Deal Offer QR** for **Rice-mill drive-belt repair**, which resolves an offer rooted in the repair provider's current active A1 Listing Version. The new Order pins that listing/policy version; old receipt is context only.

**Negotiation.** Repair offer: **base labor ₱2,300 + drive belt/guard parts ₱1,500 + harvest-window urgency ₱400 = ₱4,200**. Operator counters **₱2,150 + ₱1,350 + ₱300 = ₱3,800**, asking to retain the guard if safe. Provider counters **₱2,200 + ₱1,450 + ₱350 = ₱4,000**; operator accepts and the L0 owner OTP-confirms that exact version/hash. Sandbox allocation illustration: **₱3,200 / ₱400 / ₱400**.

**Deal Chain and connectivity.** A parallel fork follows the mill's independent unplug/lockout fact: **N1 electrician A3 verifies isolation** and **N2 belt seller A4 reserves/delivers the exact belt**; **N1 + N2 → N3 repair provider A1 fits belt and performs a guarded test**. Both offline providers sign local envelopes; operator L3 uploads them. The repair Agent may refer to the `QDR` as history but cannot treat the old receipt as current consent, warranty extension, payment, or work completion. All Need providers and operator confirm the final terms before Chain lock.

**Payment and failure recovery.** N1 is **External Cash**, N2 **External Digital Proof**, N3 **Tiwala sandbox**. If the specified belt is out of stock, N2 proposes a new seller/version and the repair remains gated; no belt substitution or unsafe restart is inferred from the receipt. If the mechanic no-shows after N1 completed, N3 alone becomes `replacement_needed`; a replacement repair Order must be accepted, while electrician cash and seller proof remain their own isolated child records. The old QDR stays sealed regardless of the new Chain's outcome.

## Architectural review checklist for this catalog

A scenario implementation or product surface conforms only if all answers below are yes:

- Does every Quick Deal and Chain Need resolve to an active owned Listing Version, with the correct retained category/profile/policy and supported Work contract?
- Does each line-item counter produce a new attributable version/hash, preserve the immutable accepted terms, and require the correct owner/buyer confirmations before `FinalizeOrderAgreement`?
- Does every QR resolve according to its type (`USR`, `LST`, `QDO`, or `QDR`) without confusing discovery, active offer, and sealed receipt authority?
- Does the offline envelope identify the exact listing/Need/terms/expected versions and have an attributable origin, while remaining provisional until cloud revalidation? Does a stale/replayed envelope fail deterministically without duplicate child Orders?
- Is L0 SMS OTP single-use, purpose-bound, version/hash-bound, attributable to the owner, revocable, and separate from the Agent's account? Does delegation avoid transferring payer, recipient, cash/goods custody, or ownership?
- Is the Chain DAG real (dependency, handoff, parallel prerequisites, or replacement), acyclic, and locked only after every party confirms the exact final slot terms? Are internal Work phases kept out of the Chain?
- Does every child Order have one responsible provider, one immutable terms snapshot, an independent Payment Obligation/lane, and isolated failure/cancellation/recovery? Is a replacement a new Order on the original Need with history preserved?
- Are external cash and digital-proof events kept distinct from platform custody, and are Tiwala test states labeled sandbox with no live legal-protection claim? Are 80/10/10 amounts snapshots rather than a parent split, while the initial Tagudin cash 0% policy remains enforced?
- Can Work complete without releasing money, and can money settle without being used as proof of Work quality? Are verified facts, rather than scans, photos, raw SMS, external webhook payloads, or a payment receipt alone, the only gate inputs?
- Are A2/A5/A6/A10 requests rejected until supported instead of being mislabeled A1/A3/A4/A9? Are emergency and spot-bidding semantics represented as overlays/mechanisms rather than invented Work shapes?

A failed answer is an architecture defect, not a user-facing exception to be bypassed.
