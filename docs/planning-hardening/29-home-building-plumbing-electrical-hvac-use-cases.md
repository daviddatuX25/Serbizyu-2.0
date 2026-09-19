SYSTEM WARNING: Subagent called yield with null data.

# Exhaustive Specification: 20 Real-World Business Use Cases in Home, Electrical, Plumbing, HVAC & Construction
**Platform:** Serbizyu 2.0 Distributed Service Marketplace & Work Execution Engine  
**Municipal Context:** Municipality of Tagudin, Province of Ilocos Sur, Philippines (Barangays: Centro/Poblacion, Quirino, Bitalag, Farola, Ambalayat, Bio, Libtong, Dacutan, etc.)  
**Architectural Standard:** AD-5, AD-17, AD-20, AD-21, AD-22 (Decoupled Macro DAG + Micro Work Pipelines, Zero Pooled Escrow, Partial Unique Indexes, Asynchronous Transactional Outbox Gates).

---

## Use Case 1: AC Inverter Deep Cleaning & Chemical Wash with Capacitor Courier Run

### 1. Title & Real-World Municipal Scenario
* **Title:** Daikin 1.5HP Split Inverter Chemical Deep Wash with Outdoor Fan Run Capacitor Replacement
* **Setting:** Barangay Quirino, Tagudin, Ilocos Sur. Humid coastal environment with salt spray accelerating aluminum coil oxidation and dust accumulation.
* **Actors:**
  * **Customer:** Dra. Evelyn Ramos (Residential Clinic)
  * **Lead Contractor:** Kuya Ben Refrigeration & Aircon Services (Certified HVAC Tech)
  * **Merchant:** Tagudin Express Hardware & Electrical Supply (Poblacion)
  * **Transit/Courier:** Danny's Motorcycle Cargo (Local Express Delivery)
* **Problem & Tender:** Customer booked routine deep chemical wash (PHP 1,200). Upon power-on triage, the indoor unit powers on but outdoor condensing fan motor hums without rotating; diagnostic confirms failed 3.5µF / 450VAC CBB61 fan run capacitor.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Material Sourcing (ORD-HVAC-01A)**
  * *Provider:* Tagudin Express Hardware & Electrical Supply
  * *Scope:* 1x OEM CBB61 3.5µF 450VAC Fan Motor Run Capacitor + 1L Alkaline Coil Cleaner Concentrate.
  * *Amount:* PHP 280.00 | *Work Shape:* A4 (Merchant Handoff).
* **Node 2: Transit & Courier Dispatch (ORD-HVAC-01B)**
  * *Provider:* Danny's Motorcycle Cargo
  * *Scope:* Urgent pickup from Tagudin Express Hardware to Dra. Ramos Clinic, Brgy. Quirino (3.8 km).
  * *Amount:* PHP 75.00 | *Work Shape:* A4 (Point-to-Point Transport).
* **Node 3: Primary Technical Labor (ORD-HVAC-01C)**
  * *Provider:* Kuya Ben Refrigeration & Aircon Services
  * *Scope:* Diagnostic triage, pressure wash evaporator/condenser, chemical flush, capacitor swap, vacuum pump test, amperage draw verification.
  * *Amount:* PHP 1,450.00 (PHP 1,200 base clean + PHP 250 electrical swap labor) | *Work Shape:* A1 (Milestone/Field Service).
* **DAG Edges:**
  * `Node 1 (ready_for_collection) ──► Node 2 (authorize_collection)`
  * `Node 2 (delivered_to_site) ──► Node 3 (unblock_step: step_capacitor_install)`

### 3. Micro Work Pipeline (Kuya Ben's Internal Execution)
* **Step 1 (`step_intake_diagnostic`):** Dismantle front housing; measure supply voltage (228V) and motor winding resistance; test capacitor with multimeter capacitance meter (reads 0.2µF = open circuit).
* **Step 2 (`step_deep_cleaning_prep`):** Isolate circuit breaker; mount waterproof catchment bag over indoor split unit; spray alkaline chemical cleaner on aluminum fins; pressure wash blower wheel.
* **Step 3 (`step_capacitor_install`):** `[WAITING_FOR_DEPENDENCY]` Discharge existing capacitor safely; install replacement 3.5µF capacitor with insulated spade terminals; re-wire outdoor fan control harness.
* **Step 4 (`step_testing_commissioning`):** Power on unit; clamp meter testing (amperage baseline: 4.1A nominal load); temperature delta test (Supply: 24°C, Return: 12°C, $\Delta T = 12^\circ\text{C}$).
* **Step 5 (`step_signoff_handover`):** Customer digital signature on service app; photo proof of clean coils and running compressor/fan.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** At formation, Node 1 (Merchant pulls inventory) and Node 2 (Courier dispatched to merchant) execute concurrently with Kuya Ben's Step 1 and Step 2 on-site. Kuya Ben does not sit idle; he cleans the evaporator coil while the part travels.
* **External Wait Gate:**
  * Target: `work_step_dependency_gates`
  * Step Key: `step_capacitor_install` | Source Need: `ORD-HVAC-01B`
  * Condition: `condition_code = 'delivered_to_site'`
  * Logic: When Danny taps `Confirm Delivery` with GPS geo-fence + photo at Dra. Ramos' residence, outbox worker unblocks Kuya Ben's Step 3.
* **Customer Approval Gate:** Human-in-the-loop prompt sent via Serbizyu app when failed capacitor is diagnosed: *"Approve replacement part (PHP 280.00) and labor add-on (PHP 250.00)? [Yes, Authorize Payment / No, Proceed Clean Only]"*.
* **Diagnostic Pause / Scope Variance:**
  * `IF` outdoor compressor motor windings are burnt (grounded/shorted), `THEN` Kuya Ben marks `DiagnosticVarianceProposed(compressor_failure)`. Replacement costs PHP 6,500; customer may decline.
  * `ELSE IF` customer declines variance, `THEN` execution drops to Diagnostic Exit: Node 1 and Node 2 are aborted; Kuya Ben collects trip/diagnostic fee (PHP 350.00); remainder escrow returned to Dra. Ramos.
* **Sidecar Errand:** If Kuya Ben notices the rubber vibration grommets are cracked during outdoor re-mounting, he spawns a lightweight sidecar errand: Tagudin Hardware ➔ Courier (PHP 90.00 total) without tearing down the existing contract.

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Customer pays PHP 1,805.00 total, which is split into 3 independent child obligations: `POL-01A` (PHP 280), `POL-01B` (PHP 75), `POL-01C` (PHP 1,450).
* **Failure Scenario:** Courier Danny's motorbike gets a flat tire along Manila North Road in Brgy. Bio. Danny taps `Report Delay`.
  * The engine emits `DealChainNodeDisrupted(transit_breakdown)`.
  * Node 3 (Kuya Ben) is NOT cancelled. Kuya Ben continues chemical cleaning indoor unit.
  * Serbizyu dispatches fallback courier Kuya Noel (`replacement_needed` logic on Node 2).
  * Merchant (Node 1) keeps payment because part was sold and handed over.
  * Danny receives pro-rata cancel/release depending on custody transfer; replacement courier gets new child order. Kuya Ben's money is legally untouched.

---

## Use Case 2: Residential Main Breaker Upgrade with LGU Electric Cooperative Liaison

### 1. Title & Real-World Municipal Scenario
* **Title:** 60A to 100A 230V 2-Pole Main Distribution Panelboard Upgrade with ISECO Meter Seal Liaison
* **Setting:** Barangay Poblacion, Tagudin, Ilocos Sur. Expanding ancestral home adding induction cooker and 3 split-type air conditioners.
* **Actors:**
  * **Customer:** Engr. Rogelio Macaraeg
  * **Lead Contractor:** Master Electrician Nelson (Registered Master Electrician - RME)
  * **Merchant:** Tagudin Mega Electrical & Construction Supply
  * **Liaison/Auditor:** Municipal Engineering & Ilocos Sur Electric Cooperative (ISECO) Tagudin Field Inspector
* **Problem & Tender:** Existing 60A knife switch breaker trips continuously under concurrent heavy loads. Requires panel upgrade to 100A Bolt-on NEMA-3R box with grounding rod, requiring cooperative meter de-energization and re-sealing.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Electrical Materials (ORD-ELEC-02A)**
  * *Provider:* Tagudin Mega Electrical Supply
  * *Scope:* 100A 2-Pole Schneider Main Breaker, 4-Branch Panelboard, 22mm² THHN Copper Wire (15m), 5/8" x 8ft Copper Grounding Rod.
  * *Amount:* PHP 6,450.00 | *Work Shape:* A4.
* **Node 2: Heavy Material Hauling (ORD-ELEC-02B)**
  * *Provider:* Tagudin Trike Cargo Hauling
  * *Scope:* Transport panelboard, conduit pipes, and 8ft copper ground rod to jobsite.
  * *Amount:* PHP 150.00 | *Work Shape:* A4.
* **Node 3: Master Electrician Labor (ORD-ELEC-02C)**
  * *Provider:* RME Nelson Electrical Services
  * *Scope:* Load calculation sheet, panel tear-out, wire pulling, ground rod driving, bonding, terminal torquing.
  * *Amount:* PHP 3,800.00 | *Work Shape:* A1.
* **Node 4: Electric Cooperative Inspection & De-Energize/Re-Seal (ORD-ELEC-02D)**
  * *Provider:* ISECO Authorized Liaison / Municipal Inspector Fee
  * *Scope:* Service drop disconnection, meter seal pulling, inspection certificate verification, re-energization.
  * *Amount:* PHP 850.00 | *Work Shape:* A9 (Regulatory / Certified Sign-off).
* **DAG Edges:**
  * `Node 1 ──► Node 2 ──► Node 3`
  * `Node 3 (step_ready_for_inspection) ──► Node 4 (inspect_and_energize)`

### 3. Micro Work Pipeline (RME Nelson's Internal Execution)
* **Step 1 (`step_intake_load_audit`):** Verify connected load inventory; document meter number and seal tag; submit service request to ISECO portal.
* **Step 2 (`step_grounding_installation`):** Drive 8ft ground rod into earth; measure ground resistance ($\le 25\Omega$ target); run 8mm² bare ground wire.
* **Step 3 (`step_panel_mounting`):** `[WAITING_FOR_DEPENDENCY: Panel delivery]` Mount NEMA-3R enclosure; rough-in EMT conduits.
* **Step 4 (`step_wire_pulling_termination`):** `[WAITING_FOR_DEPENDENCY: ISECO de-energization]` Pull 22mm² line feeders; crimp lugs; torque to 5.6 Nm; label circuits.
* **Step 5 (`step_regulatory_inspection`):** Present installation to ISECO inspector; Megger insulation resistance test (>1.0 M$\Omega$); seal meter base.
* **Step 6 (`step_turnover_energization`):** Voltage verification (Line-to-Line: 230V, Line-to-Ground: 115V); load test under full circuit activation; handover.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** Ground rod driving (Step 2) and panel recess framing execute concurrently with ISECO de-energization queue processing.
* **External Wait Gate:** `step_wire_pulling_termination` is strictly gated by `ISECO_GRID_DEENERGIZED` event. RME Nelson cannot safely splice main service drops without verified grid isolation.
* **Customer Approval Gate:** Before de-energization, customer confirms digital gate: *"Home power will be severed for up to 4 hours. Ensure deep freezers and medical equipment are secured. [Authorize De-Energization]"*.
* **Diagnostic Pause / Scope Variance:**
  * `IF` customer's drop line from post to weatherhead is deteriorated 14mm² aluminum rather than 22mm² copper, `THEN` system triggers `ScopeVariance(service_drop_replacement)`. Additional PHP 2,200 material/labor required by ISECO standards.
  * `IF` customer rejects, job freezes at sub-panel boundary; main remains at 60A.
* **Sidecar Errand:** Nelson runs out of 1-inch EMT conduit connector fittings; triggers Serbizyu instant sidecar courier run to Tagudin Hardware (PHP 120 materials + PHP 50 courier).

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** 4 distinct child orders. Total escrow = PHP 11,250.00.
* **Failure Scenario:** ISECO Inspector fails to show up due to an emergency transformer blowout in Brgy. Bitalag.
  * Node 4 transitions to `rescheduled`.
  * Materials (Node 1) and Hauling (Node 2) are completed and already settled to hardware merchant and trike driver.
  * Nelson's labor (Node 3) holds payment in escrow for completed milestones; Nelson is protected by `temporary_safety_seal` clause and does not forfeit labor payout. Customer funds for Node 4 remain safely escrowed until actual re-seal.

---

## Use Case 3: Underground PVC Water Pipe Leak Repair with Concrete Jackhammering Sidecar

### 1. Title & Real-World Municipal Scenario
* **Title:** Concealed Underground 1-Inch Main Water Line Leak Repair beneath Driveway Slab
* **Setting:** Barangay Bitalag, Tagudin, Ilocos Sur. Residential driveway over pressurized municipal water connection (Tagudin Water District).
* **Actors:**
  * **Customer:** Kapitan Arthur Verzosa
  * **Lead Contractor:** Mang Danny Master Plumbing
  * **Equipment/Labor Sidecar Provider:** Bitalag Concrete Cutting & Demolition Tools
  * **Merchant:** Ilocos North Pipe & Fittings Center
* **Problem & Tender:** Water bill spiked from PHP 800 to PHP 4,500; meter spins wildly with all indoor faucets closed. Acoustic test locates leak 40cm below 6-inch reinforced concrete driveway.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Plumbing Replacement Hardware (ORD-PLUMB-03A)**
  * *Provider:* Ilocos North Pipe & Fittings Center
  * *Scope:* 1" Blue PVC Schedule 80 Pipe (3m), 4x 1" PVC Couplers, High-Pressure PVC Solvent Cement, Teflon Tape.
  * *Amount:* PHP 420.00 | *Work Shape:* A4.
* **Node 2: Demolition & Jackhammer Rental with Operator (ORD-PLUMB-03B)**
  * *Provider:* Bitalag Demolition Services
  * *Scope:* 1600W Electric Breaker Jackhammer rental, heavy-duty chisel bits, extension cord, 1 hour dedicated slab breaking.
  * *Amount:* PHP 950.00 | *Work Shape:* A3 (On-Demand Equipment + Operator).
* **Node 3: Master Plumbing Diagnostic & Line Splicing (ORD-PLUMB-03C)**
  * *Provider:* Mang Danny Master Plumbing
  * *Scope:* Acoustic leak pinpointing, trench excavation, pipe section cut-out, solvent weld repair, pressure testing.
  * *Amount:* PHP 1,800.00 | *Work Shape:* A1.
* **Node 4: Masonry Patch Restoration (ORD-PLUMB-03D)**
  * *Provider:* Mang Danny's Masonry Partner
  * *Scope:* Rebar tie-in, Portland cement mix (1 bag + gravel/sand), trowel finish to match existing driveway.
  * *Amount:* PHP 800.00 | *Work Shape:* A1.
* **DAG Edges:**
  * `Node 3 (step_leak_pinpointing) ──► Node 2 (authorize_demolition)`
  * `Node 2 (concrete_breached) ──► Node 3 (step_pipe_splicing)`
  * `Node 1 (materials_on_site) ──► Node 3 (step_pipe_splicing)`
  * `Node 3 (pressure_test_passed) ──► Node 4 (slab_restoration)`

### 3. Micro Work Pipeline (Mang Danny's Internal Execution)
* **Step 1 (`step_intake_isolation`):** Shut off municipal curb stop valve; verify meter standstill; acoustic stethoscope verification to trace slab vibration.
* **Step 2 (`step_chalk_boundary_approval`):** Mark exact 2ft x 2ft square on driveway slab; obtain customer sign-off before concrete demolition.
* **Step 3 (`step_slab_breaching`):** `[WAITING_FOR_DEPENDENCY: Node 2 Jackhammer Arrival]` Jackhammer concrete slab; expose soil sub-base; hand-shovel gravel bed to avoid puncturing pipe.
* **Step 4 (`step_pipe_splicing`):** `[WAITING_FOR_DEPENDENCY: Node 1 Material Delivery]` Cut fractured brittle PVC section; ream pipe edges; prime and apply heavy-duty solvent cement; slip repair coupling sleeve.
* **Step 5 (`step_hydrostatic_pressure_test`):** Open main gate valve to 45 PSI; hold pressure for 30 minutes; inspect joints for zero weeping; record video proof.
* **Step 6 (`step_masonry_pour_signoff`):** Backfill with sand; pour concrete slab patch; brush texture finish; collect final digital sign-off.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** While Mang Danny manually exposes the boundary and prepares the water bypass, the courier is fetching the PVC pipe and the Jackhammer operator is in transit.
* **External Wait Gate:** `step_pipe_splicing` cannot proceed without `materials_on_site` (Node 1) AND `concrete_breached` (Node 2).
* **Customer Approval Gate:** Irreversible Action Gate: Before the jackhammer strikes the decorative concrete driveway, the customer must review and click `[Approve Concrete Cutting]`.
* **Diagnostic Pause / Scope Variance:**
  * `IF` upon breaching the slab, the pipe is discovered to be corroded galvanized iron (GI) rather than PVC, requiring threading and union adaptors, `THEN` Mang Danny triggers a `DiagnosticPause`.
  * Engine prompts Customer with revised variance (+PHP 650 GI fittings and die-stock threading labor). If rejected, Mang Danny executes emergency pipe-clamp patch and bills diagnostic fee.
* **Sidecar Errand:** Mang Danny realizes the fracture extends under the carport foundation; needs an extra 2 meters of pipe and a 45-degree elbow. He triggers a 1-click Sidecar Errand on Serbizyu, which dispatches a local tricycle courier to the hardware store immediately without stopping the job clock.

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Customer deposits PHP 3,970.00 across 4 child orders (`PLUMB-03A` to `03D`).
* **Failure Scenario:** The jackhammer operator breaks a chisel bit and cannot finish cutting the slab.
  * Node 2 enters `interrupted`. The operator is paid only base call-out (PHP 300); remaining PHP 650 returns to customer's available balance.
  * A replacement demolition operator is automatically summoned via Serbizyu dispatch.
  * Plumbing materials (Node 1) are already safely on site and owned by the customer; Node 1 is completed and settled. Mang Danny remains on-site; his contract is not cancelled.

---

## Use Case 4: Corrugated Iron Roofing Repair during Storm Season with Hardware Sealant Courier

### 1. Title & Real-World Municipal Scenario
* **Title:** Emergency Galvanized Iron (GI) Roof Sheet Re-fastening & Elastomeric Vulca-Seal Application
* **Setting:** Barangay Farola (Coastal Zone), Tagudin, Ilocos Sur. Tropical storm southwest monsoon (Habagat) gusts lifting roof sheets.
* **Actors:**
  * **Customer:** Aling Marites Corpuz
  * **Lead Contractor:** Tatay Romy Roofing & Tinsmith Services
  * **Merchant:** Tagudin Commercial Lumber & Hardware
  * **Transit/Courier:** Bong's Monsoon Waterproof Cargo Trike
* **Problem & Tender:** Strong gusts tore out umbrella nails along the windward roof eaves; water is leaking into ceiling joists. Needs emergency replacement with self-drilling tekscrews, rubber washers, flashing re-anchoring, and poly-fiber elastomeric sealing before the next squall.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Roofing Hardware Supplies (ORD-ROOF-04A)**
  * *Provider:* Tagudin Commercial Lumber & Hardware
  * *Scope:* 100x 2.5" Galvanized Tekscrews with Neoprene EPDM Washers, 1L Vulca-Seal elastomeric sealant, 1 roll Fiber Mesh Tape, 1x Tekscrew drill chuck adapter.
  * *Amount:* PHP 680.00 | *Work Shape:* A4.
* **Node 2: Weather-Proof Transit (ORD-ROOF-04B)**
  * *Provider:* Bong's Monsoon Waterproof Cargo Trike
  * *Scope:* Emergency transit from hardware to Brgy. Farola with tarpaulin-wrapped cargo box during intermittent rain.
  * *Amount:* PHP 100.00 | *Work Shape:* A4.
* **Node 3: Tinsmith Emergency Roof Labor (ORD-ROOF-04C)**
  * *Provider:* Tatay Romy Roofing Services
  * *Scope:* Safety harness rigging, sheet realignment, tekscrew driving into steel purlins, seam brushing, fiber mesh vulcanized sealing.
  * *Amount:* PHP 1,500.00 | *Work Shape:* A1.
* **DAG Edges:**
  * `Node 1 ──► Node 2 ──► Node 3 (step_sealant_application)`

### 3. Micro Work Pipeline (Tatay Romy's Internal Execution)
* **Step 1 (`step_safety_weather_assessment`):** Inspect wind speed; anchor fall-arrest harness to concrete roof beam; check metal purlin structural integrity.
* **Step 2 (`step_roof_sheet_realignment`):** Use roofing clamp to pull deformed corrugated sheets back into proper 1.5-corrugation overlap; temporarily secure with vice grips.
* **Step 3 (`step_tekscrew_fastening`):** `[WAITING_FOR_DEPENDENCY: Node 2 Delivery]` Drive new 2.5" galvanized tekscrews with cordless impact driver into steel C-purlins through sheet crowns (never valleys).
* **Step 4 (`step_vulcaseal_mesh_application`):** Wire-brush rusted seams; apply thick coat of Vulca-Seal; embed fiber mesh; apply top coat extending 2 inches beyond crack.
* **Step 5 (`step_hose_spray_water_test`):** Simulate rainfall with garden hose for 15 minutes; interior attic inspection for moisture penetration.
* **Step 6 (`step_completion_handover`):** Upload aerial photo proof of sealed ridges and signed digital acceptance form.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** While courier Bong navigates rain showers to procure tekscrews and sealant, Tatay Romy mounts the roof, realigns displaced sheets, and clears storm debris.
* **External Wait Gate:** `step_tekscrew_fastening` cannot start until Bong delivers the tekscrews and sealant (`delivered_to_site`).
* **Customer Approval Gate:** If Tatay Romy discovers an entire 8-foot GI sheet is rusted through with large holes, an on-screen gate prompts the customer: *"Sheet #3 cannot be sealed with paste alone. Approve replacement 8ft corrugated sheet (PHP 420.00 material + PHP 200 labor)? [Approve Add-On / Patch Only at Own Risk]"*.
* **Diagnostic Pause / Scope Variance:**
  * `IF` gust wind speed exceeds safety limits (>45 km/h) or lightning is detected within 5km, `THEN` n8n triggers `SafetyWeatherPause`.
  * The job timers freeze; liability waiver triggers; work resumes once thunderstorm cell passes. No cancellation penalty applies.
* **Sidecar Errand:** Tatay Romy's impact drill battery dies; homeowner has no outdoor extension cord. Tatay Romy fires a Serbizyu sidecar errand for a 20-meter heavy-duty outdoor extension cord rental (PHP 150) from a neighbor workshop.

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Customer escrows PHP 2,280.00 across 3 child obligations.
* **Failure Scenario:** Hardware store is out of stock of Neoprene EPDM washers and substitute generic rubber washers degrade quickly.
  * Merchant rejects item on Node 1.
  * Node 1 emits `merchant_stockout`.
  * Serbizyu n8n flow automatically reroutes the material order to New Tagudin Home Depot (2 km away) and updates courier routing.
  * Courier fee updates transparently by +PHP 25.00 via pre-authorized tolerance buffer; Tatay Romy's labor escrow remains locked and safe.

---

## Use Case 5: Septic Tank Desludging & Vacuum Truck with Bio-Enzyme Treatment Handoff

### 1. Title & Real-World Municipal Scenario
* **Title:** 3-Chamber Septic Tank Siphoning, Sludge Dewatering & Bacterial Enzyme Re-Seeding
* **Setting:** Barangay Libtong, Tagudin, Ilocos Sur. Residential property near agricultural drainage canals requiring strict DENR municipal waste compliance.
* **Actors:**
  * **Customer:** Barangay Kagawad Nestor Tolentino
  * **Lead Contractor:** Ilocos Clean-Flow Environmental & Desludging Services (Vacuum Truck Unit)
  * **Specialist Provider:** Eco-Bio Environmental Solutions (Bio-Enzyme Inoculant)
  * **Regulatory Compliance:** Tagudin Municipal Sanitary Inspector
* **Problem & Tender:** Toilet drains gurgling and backing up during high tide; septic manhole cover leaking foul odor. Septic tank has not been desludged in 7 years; requires vacuum extraction and bio-digester bacterial re-activation.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Vacuum Siphoning Truck Operations (ORD-SAN-05A)**
  * *Provider:* Ilocos Clean-Flow Desludging Services
  * *Scope:* 4,000-liter vacuum pump truck, 30m suction hose deployment, manhole unsealing, scum/sludge vacuuming, water jetting chamber walls.
  * *Amount:* PHP 5,500.00 | *Work Shape:* A3.
* **Node 2: Biological Treatment Supplies (ORD-SAN-05B)**
  * *Provider:* Eco-Bio Environmental Solutions
  * *Scope:* 2kg Industrial Anaerobic Septic Bio-Enzyme Powder (Bacillus bacteria blend) for digestive restoration.
  * *Amount:* PHP 750.00 | *Work Shape:* A4.
* **Node 3: Municipal Sludge Manifest & Disposal Certificate (ORD-SAN-05C)**
  * *Provider:* Tagudin LGU Sanitary Landfill / Sludge Treatment Facility
  * *Scope:* Certified waste manifest dump ticket verifying septic waste was treated at accredited facility rather than dumped in open river.
  * *Amount:* PHP 400.00 | *Work Shape:* A9 (Audit & Certification).
* **DAG Edges:**
  * `Node 1 (step_siphoning_complete) ──► Node 2 (inoculate_enzymes)`
  * `Node 1 (sludge_manifest_submitted) ──► Node 3 (certify_compliance)`

### 3. Micro Work Pipeline (Clean-Flow's Internal Execution)
* **Step 1 (`step_intake_manhole_unsealing`):** Chisel concrete seal around septic manhole; allow toxic gases ($H_2S$, Methane) to vent for 15 minutes; flame safety test.
* **Step 2 (`step_scum_crust_breaking`):** Insert high-pressure water lance to break hardened 12-inch surface scum layer into pumpable slurry.
* **Step 3 (`step_vacuum_extraction`):** Lower 3-inch reinforced suction hose; engage vacuum PTO pump; siphon digestion chamber and leaching chamber down to bottom 10% sludge seed.
* **Step 4 (`step_washdown_inspection`):** Power-spray baffle tees and interior concrete walls; inspect for baffle wall collapse or root intrusion.
* **Step 5 (`step_bio_inoculation`):** `[WAITING_FOR_DEPENDENCY: Node 2 Bio-Enzymes]` Dissolve 2kg bio-enzyme blend into lukewarm water; pour directly into chamber 1 to establish healthy microbial colony.
* **Step 6 (`step_resealing_manifest`):** Re-seat concrete manhole lid; apply mortar seal; hand over printed LGU waste disposal manifest to customer.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** Vacuum truck arrives on site and begins manhole chiseling while the courier delivers the bio-enzyme inoculant packet from the local agricultural supply office.
* **External Wait Gate:** Final signoff and escrow release for Node 1 are gated by `Node 3: LGU Sludge Manifest Verification`. Vacuum provider must upload GPS timestamped dumping receipt at the treatment plant before full payout is released.
* **Customer Approval Gate:** If the inspection in Step 4 reveals broken baffle walls between chamber 1 and chamber 2, a prompt requires customer authorization for emergency masonry baffle rebuilding (+PHP 1,800).
* **Diagnostic Pause / Scope Variance:**
  * `IF` the tank contains illegal solid debris (construction gravel, plastics, sanitary napkins) that clogs the 3-inch vacuum hose, `THEN` operator triggers `ClogExtractionVariance`.
  * Manual rake extraction surcharge (+PHP 800) is proposed. If declined, customer agrees to partial liquid siphon only with no warranty on drain lines.
* **Sidecar Errand:** The truck crew runs out of PVC heavy-duty nitrile gloves and lime powder for ground disinfection. A sidecar courier run is initiated to Tagudin Agricultural Supply (PHP 220).

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Customer deposits PHP 6,650.00 across 3 child orders.
* **Failure Scenario:** The municipal sludge treatment plant is closed for emergency maintenance, preventing legal waste discharge today.
  * Node 3 enters `waiting_on_authority`.
  * The vacuum truck (Node 1) keeps sludge locked in its tank.
  * Node 2 (Enzymes) is already completed and paid.
  * Node 1 receives 80% operational escrow advance; 20% environmental compliance hold is retained until tomorrow morning's dump manifest is validated by the system. Customer is protected against illegal river dumping liability.

---

## Use Case 6: Kitchen Tile Installation with Heavy Tile Adhesive Sand/Cement Truck Hauling

### 1. Title & Real-World Municipal Scenario
* **Title:** 24m² Porcelain Floor Tile Laying with Sand, Portland Cement & Adhesive Elf Truck Hauling
* **Setting:** Barangay Dacutan, Tagudin, Ilocos Sur. New kitchen renovation in a bungalow residence requiring level floor tiling.
* **Actors:**
  * **Customer:** Mrs. Grace Fernandez
  * **Lead Contractor:** Kuya Mario Finishes & Tiling Specialist
  * **Merchant:** Ilocos Sur Builders & Tile Center (Sevilla)
  * **Hauler:** Amboy's Isuzu Elf Dropside Truck Hauling
* **Problem & Tender:** Customer purchased 60x60cm polished porcelain tiles but lacks heavy materials (sand, gravel, 10 bags cement, 8 bags heavy-duty tile adhesive). Needs coordinated hauling and master tiling labor with laser leveling.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Tile Adhesive & Cement Materials (ORD-TILE-06A)**
  * *Provider:* Ilocos Sur Builders Center
  * *Scope:* 10 Bags Republic Portland Cement, 8 Bags ABC Tile Adhesive, 2 Bags Tile Grout, 500x Tile Leveling Spacers/Clips.
  * *Amount:* PHP 5,200.00 | *Work Shape:* A4.
* **Node 2: Aggregates Sourcing & Truck Delivery (ORD-TILE-06B)**
  * *Provider:* Amboy's Isuzu Elf Hauling
  * *Scope:* 1 Cubic Meter Washed River Sand hauled from Amburayan River quarry + pickup of 18 bags cement/adhesive from Builders Center to Brgy. Dacutan.
  * *Amount:* PHP 2,200.00 | *Work Shape:* A4 (Heavy Freight Logistics).
* **Node 3: Master Tiling Labor & Leveling (ORD-TILE-06C)**
  * *Provider:* Kuya Mario Finishes
  * *Scope:* Surface chipping, sand-cement screed leveling bed (40mm), notched trowel adhesive spreading, tile laying, spacer wedging, grouting, clean-up.
  * *Amount:* PHP 7,200.00 (PHP 300/m² x 24m²) | *Work Shape:* A1.
* **DAG Edges:**
  * `Node 1 ──► Node 2 (pickup_and_transport)`
  * `Node 2 (materials_unloaded_at_site) ──► Node 3 (step_screed_bed_prep)`

### 3. Micro Work Pipeline (Kuya Mario's Internal Execution)
* **Step 1 (`step_intake_substrate_inspection`):** Measure room diagonals to check squareness; laser level floor elevations; identify 25mm subfloor dip.
* **Step 2 (`step_surface_chipping_prep`):** Chip smooth concrete slab to ensure mechanical bonding key; sweep and dampen substrate.
* **Step 3 (`step_screed_bed_prep`):** `[WAITING_FOR_DEPENDENCY: Node 2 Delivery]` Mix 1:3 cement-sand mortar; pull screed guide rails; lay compacted level mortar bed.
* **Step 4 (`step_tile_laying_spacers`):** Back-butter 60x60 porcelain tiles; notch trowel adhesive on screed; lay tiles with 2mm leveling spacer clips; tap with white rubber mallet.
* **Step 5 (`step_curing_and_grouting`):** Allow 24-hour adhesive cure; knock off spacer clips; clean joints; press polymer-modified grout into joints; sponge wash.
* **Step 6 (`step_hollow_tile_tap_test_signoff`):** Customer walk-through; tap all tiles with wooden rod to confirm zero hollow sounds; collect sign-off.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** Kuya Mario begins surface chipping and laser mapping while the Elf truck drives to the Amburayan quarry for washed sand and stops at the hardware store.
* **External Wait Gate:** `step_screed_bed_prep` is locked in `WAITING_FOR_DEPENDENCY` until Amboy's Elf truck confirms `materials_unloaded_at_site` with photos of sand pile and cement bags in the garage.
* **Customer Approval Gate:** Tile Layout Pattern Gate: Before laying adhesive, Mario dry-lays 6 tiles to show the customer the cut lines near the kitchen doorway. Customer clicks `[Approve Tile Alignment]`.
* **Diagnostic Pause / Scope Variance:**
  * `IF` subfloor dip is deeper than expected (50mm instead of 25mm), requiring 5 additional bags of cement and extra sand, Mario flags `SubfloorThicknessVariance`.
  * System calculates additional PHP 1,600 (materials + hauling + labor). Customer approves via app; sidecar order is spawned automatically.
* **Sidecar Errand:** Kuya Mario breaks his diamond tile cutter blade while cutting around the kitchen sink drain pipe. A quick sidecar order to Tagudin Commercial Hardware dispatches a motorcycle courier with a replacement 4-inch diamond blade (PHP 380).

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Total funds escrowed: PHP 14,600.00 across 3 child orders.
* **Failure Scenario:** Amboy's Elf truck breaks an axle en route from the quarry.
  * Node 2 emits `delivery_breakdown`.
  * Node 1 (Materials purchased at store) remains active and reserved; store has not lost inventory.
  * Kuya Mario (Node 3) has chipped the floor; his milestone for Step 1-2 is preserved.
  * Serbizyu reassigns Node 2 hauling to a backup 6-wheeler truck in Tagudin. Sand is loaded and delivered. Mario's labor rate is unchanged; broken-down hauler is replaced without cancelling the tiling contractor.

---

## Use Case 7: Steel Window Security Grille Welding with Paint Shop Powder-Coating Transit

### 1. Title & Real-World Municipal Scenario
* **Title:** Fabrication & Installation of 6 Sets Wrought Iron Window Grilles with Industrial Powder-Coating
* **Setting:** Barangay Bio, Tagudin, Ilocos Sur. New residence along national highway requiring anti-burglary window grilles.
* **Actors:**
  * **Customer:** Mr. Fernando Singson
  * **Lead Contractor:** Bio Welders & Metalworks Fabrication Shop
  * **Specialist/Subcontractor:** Ilocos Sur Powder-Coating & Oven Bake Facility (San Fernando / Candon)
  * **Transit:** Tagudin Long-Bed Dropside Truck Transport
* **Problem & Tender:** Customer wants decorative scrollwork window security grilles for 6 windows ($120\text{cm} \times 120\text{cm}$) that will not rust in humid climate; insists on electrostatic powder-coating rather than manual brush painting.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Raw Steel Materials Sourcing (ORD-WELD-07A)**
  * *Provider:* Tagudin Commercial Steel Supply
  * *Scope:* 18x 12mm Square Solid Steel Bars (6m), 8x 1" Flat Bars, 24x Anchor Expansion Bolts, Welding Electrodes E6013 (5kg).
  * *Amount:* PHP 6,800.00 | *Work Shape:* A4.
* **Node 2: Fabrication & Welding Labor (ORD-WELD-07B)**
  * *Provider:* Bio Welders & Metalworks
  * *Scope:* On-site window measurement, cutting, scroll bending, jig welding, grind smooth weld spatter, drill wall anchor ears.
  * *Amount:* PHP 5,400.00 | *Work Shape:* A1.
* **Node 3: Transit to/from Powder Coating Facility (ORD-WELD-07C)**
  * *Provider:* Tagudin Long-Bed Dropside Transport
  * *Scope:* Round-trip transport of 6 fabricated grilles from Brgy. Bio to Candon Powder Coat Facility and return.
  * *Amount:* PHP 1,400.00 | *Work Shape:* A4.
* **Node 4: Electrostatic Powder Coating & Curing (ORD-WELD-07D)**
  * *Provider:* Candon Industrial Powder-Coaters
  * *Scope:* Sandblasting, zinc phosphating anti-rust dip, electrostatic polyester powder spray (Matte Black), 200°C oven bake curing.
  * *Amount:* PHP 4,200.00 | *Work Shape:* A3.
* **DAG Edges:**
  * `Node 1 ──► Node 2 (fabricate_grilles)`
  * `Node 2 (fabrication_complete) ──► Node 3 (transit_to_coater)`
  * `Node 3 (delivered_to_coater) ──► Node 4 (powder_coating)`
  * `Node 4 (coating_baked) ──► Node 3 (transit_to_jobsite)`
  * `Node 3 (delivered_to_jobsite) ──► Node 2 (step_window_anchoring)`

### 3. Micro Work Pipeline (Bio Welders' Execution)
* **Step 1 (`step_window_frame_measurement`):** Laser measure all 6 window jamb openings (width, height, diagonals for out-of-square tolerance).
* **Step 2 (`step_steel_cutting_jig_welding`):** Cut square bars to length; cold-bend scrollwork; tack weld on steel jig; complete full penetration welds; angle grind flush.
* **Step 3 (`step_coater_handoff`):** Inspect raw frames; load onto Node 3 truck for transport to powder-coating oven.
* **Step 4 (`step_coating_qc_inspection`):** `[WAITING_FOR_DEPENDENCY: Node 3 Return Delivery]` Unload powder-coated grilles; inspect for coating thickness, zero bare metal holidays, and scratch-free finish.
* **Step 5 (`step_masonry_drilling_anchoring`):** Hammer drill into concrete window jambs; insert heavy-duty 3/8" expansion sleeve anchors; bolt grilles firmly.
* **Step 6 (`step_security_pin_weld_signoff`):** Spot-weld anchor nut threads to prevent wrench removal; dab matching satin black touch-up paint; customer handover.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** Steel supply is purchased and delivered while Bio Welders fabricates the alignment jig in their shop.
* **External Wait Gate:** `step_masonry_drilling_anchoring` is locked until `Node 3` delivers the finished baked grilles back to Brgy. Bio with `condition_code = 'delivered_to_jobsite'`.
* **Customer Approval Gate:** Prior to dispatching grilles to the external powder coater, customer receives photos of the bare welded grilles in the shop to approve the scroll design: *"Confirm grille design matches requested pattern? [Approve for Oven Bake]"*.
* **Diagnostic Pause / Scope Variance:**
  * `IF` window reveal concrete is hollow block (CHB) with void cores that cannot grip expansion anchors, `THEN` welder triggers `AnchorVariance`.
  * Requires chemical epoxy anchoring studs (+PHP 1,100). Customer approves; epoxy order dispatched via sidecar.
* **Sidecar Errand:** Bio Welders runs out of masonry SDS drill bits (10mm); launches sidecar courier order to Tagudin Mega Hardware for 2 DeWalt SDS bits (PHP 360).

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Customer deposits PHP 17,800.00 across 4 child orders.
* **Failure Scenario:** Powder-coating plant suffers oven thermostat malfunction; scorches coating on 2 grilles.
  * Node 4 emits `qc_inspection_failed`.
  * Node 4 escrow is frozen; facility must strip and re-coat defective items at their own expense under Serbizyu merchant warranty rules.
  * Welder's fabrication payment (Node 2) and Raw Steel (Node 1) are fully protected and cannot be docked.
  * Truck transport (Node 3) receives compensation for the initial leg; return leg is adjusted. Customer's money remains in isolated escrow.

---

## Use Case 8: Solar Panel Roof Mounting with Inverter Grid-Tie Inspection Audit

### 1. Title & Real-World Municipal Scenario
* **Title:** 5kW On-Grid Solar PV System Installation with Net-Metering Utility Inspection
* **Setting:** Barangay Ambalayat, Tagudin, Ilocos Sur. High-sunlight agricultural village seeking to offset daytime irrigation and household aircon bills.
* **Actors:**
  * **Customer:** Dr. Mariano Hufana
  * **Lead Contractor:** Northern Solar Tech & Engineering
  * **Equipment Supplier:** Manila-Ilocos Solar Wholesale Hub
  * **Logistics/Freight:** Solid North 4-Wheeler Logistics
  * **Auditor/Inspector:** Registered Electrical Engineer (REE) & ISECO Net-Metering Inspector
* **Problem & Tender:** Customer wants to slash PHP 9,000 monthly power bill. Purchased a 5kW grid-tie system (10x 550W Tier 1 Solar Panels, 5kW Deye Inverter, aluminum mounting rails). Requires professional roof rail installation, DC string wiring, grounding, and official ISECO Net-Metering compliance audit.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Solar System Hardware (ORD-SOL-08A)**
  * *Provider:* Manila-Ilocos Solar Wholesale Hub
  * *Scope:* 10x 550W Monocrystalline PERC Panels, 1x 5kW String Inverter, DC Combiner Box with SPD & Breakers, 100m 4mm² Solar PV Cable.
  * *Amount:* PHP 98,000.00 | *Work Shape:* A4.
* **Node 2: Fragile Freight Delivery (ORD-SOL-08B)**
  * *Provider:* Solid North Logistics
  * *Scope:* Wooden palletized transport of 10 solar panels and sensitive inverter from depot to Brgy. Ambalayat.
  * *Amount:* PHP 2,800.00 | *Work Shape:* A4.
* **Node 3: Solar Installation & Commissioning Labor (ORD-SOL-08C)**
  * *Provider:* Northern Solar Tech
  * *Scope:* Roof penetration bracket mounting, rail leveling, panel clamping, MC4 connector crimping, inverter mounting, AC/DC disconnect wiring.
  * *Amount:* PHP 18,500.00 | *Work Shape:* A1.
* **Node 4: Engineering Sign-off & Net-Metering Audit (ORD-SOL-08D)**
  * *Provider:* Independent PE/REE Engineer & Utility Inspector
  * *Scope:* As-built electrical plan signing/dry sealing, insulation resistance test, anti-islanding test certification for ISECO net-metering approval.
  * *Amount:* PHP 7,500.00 | *Work Shape:* A9.
* **DAG Edges:**
  * `Node 1 ──► Node 2 ──► Node 3 (step_panel_mounting)`
  * `Node 3 (step_commissioning_complete) ──► Node 4 (perform_net_metering_audit)`

### 3. Micro Work Pipeline (Northern Solar Tech's Execution)
* **Step 1 (`step_roof_azimuth_audit`):** Verify roof structural rafters; measure compass azimuth (South-facing $180^\circ$ at $15^\circ$ tilt); check shading obstacles.
* **Step 2 (`step_rail_bracket_installation`):** Install stainless L-feet brackets through roof rafters with EPDM waterproof sealant flashing; mount anodized aluminum rails.
* **Step 3 (`step_panel_mounting_wiring`):** `[WAITING_FOR_DEPENDENCY: Node 2 Freight Arrival]` Lift panels to roof; secure with mid-clamps and end-clamps (torque to 8.5 Nm); connect panels in series string (VOC = 495V DC); run 4mm² PV cable in metal conduit.
* **Step 4 (`step_inverter_balance_of_system`):** Wall-mount inverter; install DC surge protector, AC double-pole disconnect, and dedicated ground rod ($\le 5\Omega$).
* **Step 5 (`step_commissioning_and_testing`):** Measure DC polarity and open circuit voltage; turn on DC switch; check MPPT lock; measure AC export current.
* **Step 6 (`step_regulatory_audit_handover`):** `[WAITING_FOR_DEPENDENCY: Node 4 REE Inspection]` REE conducts anti-islanding test (inverter trips off within 2 seconds of grid shutoff); seal application forms; handover mobile app monitoring to Dr. Hufana.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** Structural rail mounting on the roof commences immediately using local stock while the main pallet of solar panels is in freight transit from San Fernando.
* **External Wait Gate:** `step_panel_mounting_wiring` cannot commence until `Node 2: Freight Delivery` is inspected for zero glass micro-cracks and verified on site.
* **Customer Approval Gate:** Structural Roof Penetration Gate: Before drilling 20 holes into the roof rafters, customer reviews structural warranty: *"Authorize roof rafter drilling with industrial EPDM waterproofing? [Authorize Penetrations]"*.
* **Diagnostic Pause / Scope Variance:**
  * `IF` attic inspection reveals termite-hollowed wooden rafters that cannot support the 250kg total panel wind uplift load, `THEN` Northern Solar triggers `StructuralHaltVariance`.
  * Requires sistering steel C-channels to rafters (+PHP 4,500). Customer can approve or cancel before panel lift.
* **Sidecar Errand:** Installer needs 4 additional pairs of Staubli MC4 solar connectors and an extra 10m roll of flexible liquid-tight conduit; launches instant sidecar courier run to Tagudin Mega Supply (PHP 450).

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Customer deposits PHP 126,800.00 divided across 4 distinct obligations.
* **Failure Scenario:** 1 solar panel arrives with shattered tempered glass due to rough transit on Node 2.
  * Receiving inspection triggers `cargo_damage_detected`.
  * Node 2 freight insurance is claimed; shattered panel replacement order is auto-drafted.
  * 9 undamaged panels can still be mounted; Node 3 installer receives milestone payment for rail construction and 9-panel install.
  * Node 4 (Engineering audit) date is automatically extended without penalty to the installer or customer. Sibling contracts remain intact.

---

## Use Case 9: Termite Chemical Soil Injection with Certified Pest Control Sign-Off

### 1. Title & Real-World Municipal Scenario
* **Title:** Subterranean Termite Barrier Treatment via Perimeter Concrete Slab Trenching & Chemical Rodding
* **Setting:** Barangay Poblacion, Tagudin, Ilocos Sur. Two-story residential wooden-concrete ancestral home facing heavy subterranean termite (anay) infestation.
* **Actors:**
  * **Customer:** Atty. Victorino Bello
  * **Lead Contractor:** Ilocos Pest-Guard Environmental Services (Fertilizer and Pesticide Authority - FPA Licensed)
  * **Chemical Merchant:** Northern Agro-Pest Chemical Supply
  * **Auditor/Certifier:** Certified Entomologist / Pest Control Inspector
* **Problem & Tender:** Subterranean mud tubes discovered climbing interior door jambs and wooden floor joists. Requires high-pressure termiticide chemical soil barrier injection around the building perimeter foundation and concrete slab drilling.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Termiticide Chemical Sourcing (ORD-PEST-09A)**
  * *Provider:* Northern Agro-Pest Chemical Supply
  * *Scope:* 5 Liters Fipronil 2.5% EC (Termidor equivalent) non-repellent chemical termiticide concentrate.
  * *Amount:* PHP 6,800.00 | *Work Shape:* A4.
* **Node 2: Hazardous Chemical Transport (ORD-PEST-09B)**
  * *Provider:* Tagudin Secure Cargo Delivery
  * *Scope:* FPA-compliant hazardous chemical transport in sealed spill-proof containment box from supply depot to site.
  * *Amount:* PHP 120.00 | *Work Shape:* A4.
* **Node 3: Professional Soil Injection & Slab Drilling Labor (ORD-PEST-09C)**
  * *Provider:* Ilocos Pest-Guard Services
  * *Scope:* Drilling slab every 12 inches along walls, high-pressure sub-slab chemical injection (5L per linear meter), soil trenching, hole plugging.
  * *Amount:* PHP 8,500.00 | *Work Shape:* A1.
* **Node 4: 5-Year Termite Warranty & Inspection Certification (ORD-PEST-09D)**
  * *Provider:* Licensed Pest Control Auditor
  * *Scope:* Dosage verification log, chemical density audit, issuance of notarized 5-year anti-termite guarantee certificate.
  * *Amount:* PHP 1,200.00 | *Work Shape:* A9.
* **DAG Edges:**
  * `Node 1 ──► Node 2 ──► Node 3 (step_chemical_mixing_injection)`
  * `Node 3 (step_injection_complete) ──► Node 4 (issue_warranty_cert)`

### 3. Micro Work Pipeline (Pest-Guard's Internal Execution)
* **Step 1 (`step_termite_entry_audit`):** Inspect perimeter; map subterranean mud tubes with thermal imaging; locate active colony access points.
* **Step 2 (`step_slab_perforation_drilling`):** Hammer drill 1/2" holes through concrete floors every 30cm, 10cm away from structural walls along entire interior/exterior perimeter.
* **Step 3 (`step_chemical_mixing_injection`):** `[WAITING_FOR_DEPENDENCY: Node 2 Chemical Delivery]` Calibrate power sprayer; mix Fipronil at 1:100 water ratio; insert sub-slab injector rod; inject 5 liters emulsion per hole at 25 PSI.
* **Step 4 (`step_exterior_soil_trenching`):** Dig 15cm x 15cm trench along exterior soil foundation; flood trench with chemical solution; backfill with treated soil.
* **Step 5 (`step_hole_patching_cleanup`):** Seal all drilled concrete holes with hydraulic cement plugs; color-match to floor tiles; air out premises.
* **Step 6 (`step_warranty_certification`):** `[WAITING_FOR_DEPENDENCY: Node 4 Sign-Off]` Upload chemical batch number and liter consumption log; auditor validates dose calculation; issue digital warranty document.

### 4. n8n Conditional Logic & Dependency Gates
* **Parallel Fork:** Concrete drilling team drills perimeter holes while the hazardous delivery vehicle ferries the Fipronil chemical concentrate to the site.
* **External Wait Gate:** `step_chemical_mixing_injection` is locked until `Node 2` arrives with genuine FPA-registered chemical seals intact.
* **Customer Approval Gate:** Chemical Safety & Pet Relocation Gate: Customer must verify pets and family members have vacated the ground floor for 4 hours: *"Confirm premises vacated and chemical safety protocol understood? [Authorize Chemical Injection]"*.
* **Diagnostic Pause / Scope Variance:**
  * `IF` drilling uncovers drywood termites (*Cryptotermes*) in the attic ceiling rafters in addition to subterranean termites, `THEN` contractor issues `MultiSpeciesInfestationVariance`.
  * Requires pressurized wood timber foaming (+PHP 3,200). Customer can approve or decline add-on.
* **Sidecar Errand:** Team requires extra 2 bags of hydraulic quick-setting patch cement to finish sealing 80 drill holes. Sidecar courier dispatched to Tagudin Hardware (PHP 180).

### 5. Child Order Escrow & Failure Mode
* **Escrow Isolation:** Total escrow = PHP 16,620.00 across 4 child accounts.
* **Failure Scenario:** Chemical delivered fails authenticity check (tampered seal or counterfeit pesticide batch).
  * Pest-Guard technician rejects chemical at Step 3; Node 1 is disputed.
  * Node 1 funds are frozen and returned upon return of defective jug; Merchant is flagged for compliance audit.
  * Drilling labor milestone (Step 2, PHP 3,000) is paid out to Pest-Guard for completed structural preparation.
  * Replacement authentic chemical is ordered from an accredited provincial distributor. Sibling drilling order is not cancelled.

---

## Use Case 10: Deep Well Submersible Jetmatic Pump Motor Rewind & Replacement

### 1. Title & Real-World Municipal Scenario
* **Title:** 1.5HP Deep-Well Submersible Pump Extraction, Motor Stator Rewinding & Re-installation
* **Setting:** Barangay Bio, Tagudin, Ilocos Sur. Agricultural farm homestead reliant on an 80-foot deep tube-well for household and livestock water.
* **Actors:**
  * **Customer:** Mang Danilo Cariño
  * **Lead Contractor:** Kuya Eddie Well-Drilling & Pump Specialist
  * **Specialist Shop:** Candon City Electrical Motor Rewinding Works
  * **Transit:** Eddie's Utility Tricycle Transport
* **Problem & Tender:** Deep-well pump hums loudly, trips the 20A breaker immediately upon start, and pumps no water. Insulation breakdown caused motor stator winding to burn out from a lightning voltage surge. Requires pipe pull-up (80 ft), stator rewinding with enamel copper wire, and re-submersion.

### 2. Macro Deal Chain (DAG of Coordinated Independent Nodes)
* **Node 1: Deep Well Extraction Labor & Rigging (ORD-PUMP-10A)**
  * *Provider:* Kuya Eddie Well Services
  * *Scope:* Tripod hoist setup, pulling 80ft of 1.25" GI riser pipes and submersible pump, mechanical pump inspection, electrical cable uncoupling.
  * *Amount:* PHP 3,200.00 | *Work Shape:* A1.
* **Node 2: Motor Transit to Machine Shop (ORD-PUMP-10B)**
  * *Provider:* Eddie's Utility Trike Transport
  * *Scope:* Transport burnt Franklin 1.5HP submersible motor from Brgy. Bio to Candon City motor rewinding shop and return.
  * *Amount:* PHP 450.00 | *Work Shape:* A4.
* **Node 3: Motor Stator Rewinding & Varnish Bake (ORD-PUMP-10C)**
  * *Provider:* Candon Motor Rewinding Works
  * *Scope:* Stripping burnt coils, rewinding with Class H dual-coated copper magnet wire, slot insulation replacement, vacuum pressure impregnation varnish, 24-hr oven baking, replacement of mechanical water-tight seals.
  * *Amount:* PHP 3,800.00 | *Work Shape:* A3.
* **Node 4: Replacement Submersible Splice Kit & Check Valve (ORD-PUMP-10D)**
  * *Provider:* Tagudin Water Supply & Hardware
  * *Scope:* 3M Submersible Waterproof Heat-Shrink Cable Splice Kit, 1.25" Heavy Brass Check Valve.
  * *Amount:* PHP 950.00 | *Work Shape:* A4.
* **DAG Edges:**
  * `Node 1 (pump_extracted) ──► Node 2 (transit_to_rewind_shop)`
  * `Node 2 (delivered_to_shop) ──► Node 3 (rewind_motor)`
  * `Node 3 (rewind_tested) ──► Node 2 (return_transit)`
  * `Node 2 (delivered_on_site) + Node 4 (delivered_on_site) ──► Node 1 (step_resubmersion_testing)`

### 3. Micro Work Pipeline (Kuya Eddie's Internal Execution)
* **Step 1 (`step_pump_rigging_pullup`):** Erect steel tripod and chain block over well head; uncouple well seal; pull 8 lengths of 10-foot GI pipe; visually inspect impellers.
* **Step 2 (`step_motor_diagnosis`):** Megger test motor leads (reads $0.02\text{ M}\Omega$ = dead short to ground); decouple stainless pump wet-end from motor; package motor for transit.
* **Step 3 (`step_pipe_check_valve_refresh`):** Clean pipe threads; apply thread sealant; replace worn bottom brass check valve with Node 4 materials.
* **Step 4 (`step_submersible_cable_splice`):** `[WAITING_FOR_DEPENDENCY: Node 2 Return + Node 4 Splice Kit]` Solder motor leads to flat drop cable; apply 3 layers self-amalgamating tape; heat shrink waterproof sleeve; test submersion resistance in water bucket.
* **Step 5 (`step_well_resubmersion`):** Lower pump and 80ft pipe assembly back down well shaft; secure pipe clamps every 10ft; re-seat rubber well cap.
* **Step 6 (`step_water_discharge_test_signoff`):** Connect to control box; measure running amps (8.4A nominal); verify continuous 25 GPM water flow for 20 minutes; handover.


[Showing lines 1-583 of 1222 (50.0KB limit). Use :584 to continue]