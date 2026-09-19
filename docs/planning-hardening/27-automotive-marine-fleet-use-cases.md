# Serbizyu 2.0 Deal Chains & Work Execution Architecture
## Sector Dossier: Automotive, Motorcycle, Marine & Fleet Systems (Tagudin, Ilocos Sur)
### 20 Production-Grade Business Use Cases

This document defines 20 exhaustive business use cases across Automotive, Motorcycle, Marine, and Fleet operations within the Serbizyu 2.0 modular monolith architecture, specifically set in the Municipality of Tagudin, Ilocos Sur (incorporating authentic local topographies: Poblacion Centro/East/West/Norte, Bitalag, Quirino, Ambalayat, Libtong, Bio, Farola, Pudoc, Tampugo, Barrientos, Lacong).

Every use case strictly adheres to ratified architectural invariants (`AD-5`, `AD-17`, `AD-20`, `AD-21`, `AD-22`) and the settled graph boundaries in `FRONTEND-FIRST-SOLUTION-DESIGN.md` (§8.1, lines 489–492):
1. **Macro Chain Nodes are cross-provider/order units only:** Each billable Deal Need corresponds to exactly one bilateral child `Order`, one independent provider entity, and one isolated `PaymentObligation`. A provider’s internal execution phases remain encapsulated in their child order's **Micro Work Pipeline Steps**—never split into artificial graph nodes.
2. **Parallel Forks are concurrent child orders:** Independent child orders execute concurrently without waiting for a coarse parent status.
3. **Joins are evidence-backed dependency gates:** Synchronization is mediated through `work_step_dependency_gates`, holding internal steps in `WAITING_FOR_DEPENDENCY` until asynchronous transactional outbox events with cryptographic/photo/QR proof unblock the gate.
4. **Canonical Money & Escrow Isolation:** A Deal Chain has NO parent escrow, pooled wallet, or universal liability. Every child `Order` maintains its own isolated `PaymentObligation` with its own authorized amount, lane, due condition, and capture/release history. Any added fee, scope variance, or mid-job errand is formed as a new or varied `DealNeed` requiring explicit customer acceptance—it never bypasses bilateral contract formation or retroactively alters accepted sibling obligations. When work halts due to unforeseen damage, the technician's compensation is governed by the due conditions of their accepted `PaymentObligation` (e.g. earned diagnostic/triage milestone).
5. **Clear External Governance Boundaries:** Private providers, fleet technicians, and inspectors perform technical checklists, evidence collection, and verification sign-offs. Official municipal certifications, regulatory approvals, and LGU licensing remain external actions submitted by operators or handled via separate authorized agency integration nodes when verified.

---

### Use Case 1: Motorcycle Engine Major Overhaul with Piston Ring Sourcing from Central Town

#### 1. Title & Real-World Municipal Scenario
* **Title:** Honda TMX 125 Top-End & Cylinder Overhaul with Town Center Ring Sourcing
* **Municipal Setting:** In Barangay Quirino, Tagudin, tricycle driver Mang Danilo operates a 2018 Honda TMX 125 carrying daily passenger loads between upland farming sitios and the coastal national highway. The motorcycle experiences severe power loss, heavy white exhaust smoke, and fouled spark plugs from piston ring blow-by. With no local parts store stocking genuine 0.50mm oversize piston kits in Quirino, local mechanic Mang Celso of *Celso Moto-Works* in Sitio Cabaroan undertakes the overhaul. Genuine parts must be fetched from *Tagudin Central Auto & Moto Supply* in Poblacion Centro via a motorcycle courier, while the scoured cylinder jug is dispatched to a precision lathe shop in town.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
Each node represents a distinct, legally independent provider and child order:
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MOTO-001 (Honda TMX 125 Overhaul - Brgy. Quirino)                                │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Materials Sourcing    │ ORD-MOTO-01A (Tagudin Central Auto & Moto Supply - Poblacion)   │
│                               │ - 1x OEM Piston Kit 0.50mm Oversize (Piston, Pin, Clips, Rings) │
│                               │ - 1x Top Overhaul Gasket Set (Copper head gasket, base gasket)  │
│                               │ - 2x Valve Stem Seals, 1L 10W-40 4T Motorcycle Engine Oil        │
│                               │ Amount: ₱1,350.00 | Shape: A4 Handoff | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Transit / Logistics   │ ORD-MOTO-01B (Kuya Leo Toktok Transit - Courier Entity)         │
│                               │ - Leg 1: Central Supply (Poblacion) ➔ Celso Shop (Brgy. Quirino)│
│                               │ - Leg 2: Celso Shop ➔ Precision Lathe (Poblacion) [Roundtrip]   │
│                               │ Amount: ₱220.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Specialist Machining  │ ORD-MOTO-01C (Ilocos Sur Precision Lathe Works - Machine Shop)  │
│                               │ - Cylinder jug boring and cross-hatch honing to 0.50mm match    │
│                               │ Amount: ₱450.00 | Shape: A3 Specialist | Settlement: `machined` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 4: Skilled Labor         │ ORD-MOTO-01D (Celso Moto-Works - Motorcycle Mechanic Entity)    │
│                               │ - Comprehensive top-end labor: Triage, engine drop, head        │
│                               │   decarbonization, valve lapping, reassembly, tuning, road test │
│                               │ Amount: ₱1,200.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Celso Moto-Works — ORD-MOTO-01D)
Sequential internal execution steps owned by mechanic Celso's Work Instance:
1. **Intake & Compression Triage:**
   * Step Key: `intake_triage`
   * Dry compression test records 75 PSI (spec: 140–160 PSI). Oil squirt wet test jumps to 110 PSI, confirming worn rings. Engine oil drained and checked for bearing flakes.
2. **Teardown & Cylinder Head Decarbonizing:**
   * Step Key: `teardown_inspection`
   * Exhaust header, carburetor, and cylinder head unbolted. Valves removed; carbon buildup scraped from combustion chamber. Valves lapped into seats using coarse/fine grinding paste.
3. **Cylinder Extraction & Lathe Dispatch Prep:**
   * Step Key: `lathe_dispatch_prep`
   * Cylinder jug pulled. Cylinder wall measured with dial bore gauge; vertical scouring of 0.38mm detected. Jug packaged with digital manifest for courier pickup.
4. **Subassembly Assembly & Gapping:**
   * Step Key: `reassembly_top_end`
   * *Gated Step.* New piston rings end-gap measured in machined bore (0.20mm spec). Rings staggered at 120° offsets. Cylinder base gasket installed dry; cylinder slid over compressed rings. Cylinder head torqued in cross-pattern to 24 N·m.
5. **Valve Timing & Tappet Clearance Calibration:**
   * Step Key: `valve_timing_tuning`
   * Camshaft sprocket aligned with flywheel TDC mark. Tappets set with feeler gauge (Intake: 0.08mm, Exhaust: 0.10mm).
6. **Thermal Heat Cycling & Digital Sign-off:**
   * Step Key: `verification_signoff`
   * Fresh 10W-40 oil filled. 20-minute idle thermal cycle to bed rings. Mang Danilo conducts a 3km uphill test run with sidecar ballast; signs off on mobile UI.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork (Concurrent Child Orders):** When the deal chain activates, n8n forks execution across independent child orders:
  * Child Order `ORD-MOTO-01D` starts immediately: Celso executes on-site teardown (`teardown_inspection`) and valve lapping.
  * Child Order `ORD-MOTO-01B` (Courier) begins transit to Poblacion to collect parts from `ORD-MOTO-01A` (Merchant).
* **Join via Dependency Gate:** Step `reassembly_top_end` in Celso's Work Instance has an active row in `work_step_dependency_gates`:
  ```sql
  target_action_code: 'work_step.start',
  conditions: ['ORD-MOTO-01A.delivered_to_site', 'ORD-MOTO-01C.machined_and_delivered']
  ```
  Unlocks asynchronously when Courier Leo uploads QR delivery confirmation from the lathe shop and auto supply.
* **Customer Approval Gate:** If cylinder bore scouring exceeds 0.75mm (requiring a complete iron sleeve resleeving rather than a 0.50mm rebore), n8n triggers an interactive Approval Card to Mang Danilo with an incremental ₱550.00 quote variance. The lathe child order pauses until digital biometric confirmation is recorded.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF connecting_rod_radial_play > 0.05mm THEN
      EMIT EngineBottomEndDamaged(radial_play_value)
      PAUSE WorkInstance(ORD-MOTO-01D)
      OFFER VariationOrder(split_crankcase_replace_crank_bearings, +₱1,400 Labor, +₱850 Parts)
  ELSE
      RESUME standard_top_overhaul
  ```
  If Mang Danilo declines the bottom-end overhaul, Celso halts work, satisfies the diagnostic/teardown milestone due condition of his accepted `PaymentObligation` (₱350.00), packages the disassembled parts in a sealed tote box, and settles the order.
* **Sidecar Errand:** During cylinder head reassembly, Celso discovers two stripped M6 exhaust manifold studs. Celso taps `[ Request Sidecar Errand ]`. n8n provisions a new bilateral `DealNeed` for Mang Danilo's explicit acceptance, creating child order `ORD-MOTO-01E` and its own `PaymentObligation` (₱60.00 for hardened stepped studs + ₱50.00 runner fee from nearby Cabaroan Hardware) without modifying the original contracts.

#### 5. Child Order Escrow & Failure Mode
* **Isolated Payment Obligations:** Each child order maintains its own bilateral `PaymentObligation`: `OBL-MOTO-01A` (₱1,350.00), `OBL-MOTO-01B` (₱220.00), `OBL-MOTO-01C` (₱450.00), and `OBL-MOTO-01D` (₱1,200.00). There is no parent chain balance.
* **Failure Scenario (Lathe Machine Breakdown):** If Ilocos Sur Precision Lathe Works suffers a catastrophic power outage or damaged boring bar, Node 3 transitions to `failed_machining_halted`.
* **Remedy & Containment:**
  1. `ORD-MOTO-01C`'s `PaymentObligation` is released back to the buyer, or redirected to an alternate machine shop in Candon City via `replacement_needed`.
  2. Central Supply (`ORD-MOTO-01A`) remains 100% captured and irreversible because the physical piston kit was already unboxed and verified.
  3. Courier Leo (`ORD-MOTO-01B`) is captured for completed transport legs under his accepted transit terms.
  4. Celso's labor (`ORD-MOTO-01D`) remains parked at `WAITING_FOR_DEPENDENCY` without penalty, preserving his earned teardown progress.

---

### Use Case 2: Tricycle Welded Sidecar Repair & Leaf Spring Suspension Replacement

#### 1. Title & Real-World Municipal Scenario
* **Title:** Heavy-Duty Tricycle Chassis Arc Welding & 4-Leaf Molye Suspension Overhaul
* **Municipal Setting:** In Barangay Bitalag, Tagudin, a vital junction connecting coastal highways to agricultural uplands, a public passenger tricycle (Kawasaki Barako II chassis with custom passenger sidecar) snaps its rear suspension mount and cracks the square-tubing subframe under heavy passenger overload. Driver Mang Roberto cannot operate, losing daily livelihood. He engages local welder-mechanic *Ka Roger Metal Works* in Bitalag. The repair requires high-tensile welding rods, replacement steel gussets, a pre-curved 4-leaf spring assembly (*molye*), and rubber suspension bushings sourced from *Bitalag Agro-Industrial Hardware*, transported by an on-demand trike cargo runner.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MOTO-002 (Tricycle Chassis Weld & Molye Swap - Brgy. Bitalag)                    │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Materials Sourcing    │ ORD-MOTO-02A (Bitalag Agro-Industrial Hardware - Merchant)      │
│                               │ - 1x Complete 4-Leaf Sidecar Spring Assembly (Molye)            │
│                               │ - 2kg E6013 3.2mm Welding Rods, 4x Heavy-Duty Rubber Bushings   │
│                               │ - 1x 2"x2" 3/16" Structural Steel Angle Bar (1 meter section)   │
│                               │ Amount: ₱1,850.00 | Shape: A4 Handoff | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Cargo Transit         │ ORD-MOTO-02B (Bitalag Trike Cargo Runner - Courier Entity)      │
│                               │ - Heavy steel & leaf spring transport from Hardware to Shop     │
│                               │ Amount: ₱100.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Fabrication & Welding │ ORD-MOTO-02C (Ka Roger Metal Works - Trade Labor Entity)        │
│                               │ - Comprehensive chassis repair: Alignment, rust grinding, crack │
│                               │   beveling, gusset fabrication, SMAW welding, molye install     │
│                               │ Amount: ₱1,100.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Ka Roger Metal Works — ORD-MOTO-02C)
1. **Intake & Structural Alignment Check:**
   * Step Key: `chassis_triage`
   * Tricycle jacked up; sidecar leveled on jack stands. Laser plumb line verifies chassis squareness against motorcycle frame. Cracked weld along main mounting beam documented.
2. **Beveling & Subframe Preparation:**
   * Step Key: `grinding_prep`
   * Angle grinder with 40-grit flap disc removes rust, road grime, and cracked weld bead down to bright metal. 60° V-groove beveled along structural fracture.
3. **Old Spring Removal & Bushing Inspection:**
   * Step Key: `suspension_demount`
   * Corroded U-bolts cut with torch; collapsed 3-leaf spring extracted. Shackle pins inspected for scouring.
4. **Structural Gusset Fabrication & Arc Welding:**
   * Step Key: `gusset_welding`
   * *Gated Step.* Reinforcement gussets cut from structural angle bar. Multi-pass SMAW welding executed using E6013 rods at 110A. Root pass inspected; cover pass woven to ensure full penetration without undercut.
5. **New Molye Installation & Bushing Pressing:**
   * Step Key: `suspension_installation`
   * New 4-leaf spring fitted with fresh polyurethane bushings. Heavy-duty U-bolts torqued evenly to 65 N·m. Chassis anti-corrosion red oxide primer applied over fresh welds.
6. **Load Deflection Test & Customer Sign-off:**
   * Step Key: `load_test_signoff`
   * Four 50kg cement sacks placed in sidecar to test spring rebound and alignment. Mang Roberto conducts a curb-hop road test; signs release order.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** Immediately upon chain formation, Ka Roger starts beveling and torching broken bolts on-site (`grinding_prep`), while child order `ORD-MOTO-02B` dispatches the cargo runner to Bitalag Hardware (`ORD-MOTO-02A`).
* **Join via Dependency Gate:** Step `suspension_installation` is gated in `work_step_dependency_gates` awaiting condition `ORD-MOTO-02B.delivered_to_site`. Unlocked asynchronously upon courier photo upload of delivered steel.
* **Customer Approval Gate:** If angle grinding exposes that the motorcycle-to-sidecar primary connector arm (*kabalat*) has internal metal fatigue micro-cracks requiring complete steel tubing replacement, n8n pauses fabrication and pings Mang Roberto with photo evidence and a ₱400.00 variance request.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF sidecar_hub_bearing_play == DETECTED THEN
      EMIT BearingWornWarning(hub_id)
      OFFER SidecarHubOverhaul(+₱250 Labor, +₱180 6204-RS Bearings)
  ```
  If rejected, Ka Roger records a digital liability waiver and proceeds with suspension/welding only.
* **Sidecar Errand:** When mounting the new leaf spring, Ka Roger finds the factory shackle bolts are 15mm too short for the thicker 4-leaf pack. A new `DealNeed` is created and confirmed by the customer, spawning child order `ORD-MOTO-02D` with its own `PaymentObligation` for two grade-8 M12x90mm bolts and nyloc nuts (₱90.00 parts + ₱40.00 runner).

#### 5. Child Order Escrow & Failure Mode
* **Payment Obligation Independence:** `ORD-MOTO-02A` (₱1,850.00), `ORD-MOTO-02B` (₱100.00), and `ORD-MOTO-02C` (₱1,100.00) have separate, non-fungible `PaymentObligation` records.
* **Failure Scenario (Hardware Out of Correct Leaf Spring):** If Bitalag Hardware is out of the heavy-duty 4-leaf model, Node 1 enters `out_of_stock`.
* **Resolution:**
  1. Runner marks the item uncollected; `ORD-MOTO-02A` is cancelled and its `PaymentObligation` released back to Mang Roberto immediately.
  2. Runner receives a ₱40.00 trip compensation fee as stipulated in `ORD-MOTO-02B`'s dispatch terms.
  3. Ka Roger's order `ORD-MOTO-02C` transitions to `on_hold_sourcing_pending`. Roger is NOT forced to refund; his earned triage milestone is protected while the buyer approves sourcing from an alternate hardware store in Tagudin Centro.

---

### Use Case 3: Emergency Highway Roadside Breakdown with Flatbed Tow Trike & Mechanic Dispatch

#### 1. Title & Real-World Municipal Scenario
* **Title:** Highway Roadside Broken-Down Commuter Motorcycle Recovery via Flatbed Tow Trike & On-Site Stator Triage
* **Municipal Setting:** On the MacArthur National Highway traversing Barangay Bio, Tagudin, a commuter riding a customized 150cc delivery motorcycle suffers a catastrophic electrical failure and locked rear wheel during heavy highway traffic. The vehicle lost all spark, died on the active lane, and cannot be pushed due to a seized countershaft bearing. Stranded rider Jomar uses Serbizyu to request immediate emergency highway roadside assistance. The incident requires a customized **flatbed tow trike** (a specialized heavy-duty tricycle with an extended tilt-bed trailer, drop ramps, electric winch, and safety beacon operated by *Tagudin Highway Rescue*) to clear the motorcycle safely off the active highway shoulder into a secure staging bay in Brgy. Bio, accompanied by a mobile motorcycle technician for triage and parts dispatch.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
Strictly 4 cross-provider child orders (no split technician nodes):
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-003 (Emergency Highway Breakdown - Brgy. Bio Highway)                      │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Emergency Tow Trike   │ ORD-AUTO-03A (Tagudin Highway Rescue - Flatbed Tow Trike)       │
│                               │ - Flatbed tow trike dispatch, winch loading, transit to safe bay│
│                               │ Amount: ₱450.00 | Shape: A1 Transport | Settlement: `towed`     │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Ignition Parts Supply │ ORD-AUTO-03B (Tagudin Moto Care Express - Auto-Moto Supply)     │
│                               │ - 1x OEM Stator Coil Assembly, 1x CDI Unit, 1x Countershaft Brg │
│                               │ Amount: ₱1,450.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Rapid Hot-Shot Courier│ ORD-AUTO-03C (Express Highway Moto Dispatch - Courier Entity)   │
│                               │ - Hot-shot delivery of stator & CDI to Brgy. Bio Safe Bay       │
│                               │ Amount: ₱120.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 4: Mobile Mechanical Labor│ ORD-AUTO-03D (Kuya Jun Mobile Auto Tech - Mechanic Entity)     │
│                               │ - Highway arrival, roadside electrical triage, stator swap,     │
│                               │   crankcase reseal, bearing replacement, timing test, signoff   │
│                               │ Amount: ₱650.00 | Shape: A1 Trade Labor | Settlement: Signoff   │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Kuya Jun Mobile Auto Tech — ORD-AUTO-03D)
1. **Highway Site Arrival & Safety Perimeter Check:**
   * Step Key: `roadside_arrival_zoning`
   * Tech arrives on motorcycle; coordinates with the Flatbed Tow Trike operator to position reflective warning cones 30 meters back on MacArthur Highway. 
2. **Tow Trike Winching & Transit to Safe Bay:**
   * Step Key: `tow_trike_recovery`
   * Motorcycle loaded via rear drop ramps onto the Flatbed Tow Trike, winched down with ratchet straps, and transported 500 meters off the active highway into a secure gas station bay in Brgy. Bio.
3. **Electrical & Mechanical Triage Audit:**
   * Step Key: `failure_audit`
   * Stator cover unbolted. Multimeter reveals open circuit in exciter coil (0 ohms; spec: 300–450 ohms). Countershaft bearing freed of jammed road debris.
4. **Stator & Bearing Replacement:**
   * Step Key: `parts_installation`
   * *Gated Step.* Unlocked upon courier arrival. Flywheel pulled with specialized magneto puller. Burnt stator coil replaced. New bearing tapped in. Stator cover bolted with fresh gasket.
5. **Spark Verification & Customer Sign-off:**
   * Step Key: `verification_testing`
   * Kick-start tested; digital spark tester confirms strong blue 25kV ignition arc. Engine idles smoothly at 1,400 RPM. Jomar executes mobile sign-off.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork (Concurrent Child Orders):** Flatbed Tow Trike (`ORD-AUTO-03A`) and mobile mechanic (`ORD-AUTO-03D`) are dispatched simultaneously upon checkout.
* **Join via Dependency Gate:** Step `parts_installation` in Jun's Work Instance is held in `WAITING_FOR_DEPENDENCY` awaiting event `ORD-AUTO-03C.delivered_to_site`.
* **Customer Approval Gate:** When stator coil failure is verified on-site, Jomar receives an interactive Approval Modal authorizing the ₱1,450.00 parts purchase. Work cannot proceed without digital signature and payment authorization.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF engine_magneto_rotor_magnets_shattered == TRUE THEN
      EMIT SevereIgnitionDamage(roadside_unrepairable)
      TRIGGER SecondaryTowToTownWorkshop
      SETTLE ORD-AUTO-03D at ₱250.00 Triage Milestone
      CANCEL ORD-AUTO-03B & ORD-AUTO-03C
  ```
* **Sidecar Errand:** The stator cover gasket was torn during removal. Tech triggers an on-demand sidecar errand. Buyer confirms the new Need, spawning child order `ORD-AUTO-03E` for liquid gasket sealant (₱60.00 parts + ₱30.00 runner).

#### 5. Child Order Escrow & Failure Mode
* **Tow Trike Node Independence:** Flatbed Tow Trike Order `ORD-AUTO-03A` has its own isolated `PaymentObligation`. It settles immediately upon verified transport of the bike to the safe bay, regardless of whether roadside ignition repair succeeds.
* **Parts Breakdown Isolation:** If the moto store delivers the wrong 6-coil stator instead of an 8-coil stator, Courier `ORD-AUTO-03C` is still captured for delivery. The store re-dispatches the correct unit at its own cost. Mechanic Jun is NOT penalized; his labor order remains parked at the dependency gate without loss of triage compensation.

---

### Use Case 4: Outboard Fishing Boat Motor (Bangka) Propeller Shaft Machining & Marine Grease

#### 1. Title & Real-World Municipal Scenario
* **Title:** Outboard Banca Motor Lower Unit Propeller Shaft Machining, Oil Seal Replacement & Marine Grease Pack
* **Municipal Setting:** At the coastal landing of Barangay Farola, Tagudin, fisherman Mang Celso operates a 22-foot fishing banca powered by a transom-mounted 25HP Yamaha 2-stroke outboard marine motor. While returning from a night fishing run across the shallow reef bars off Tagudin, the aluminum propeller struck a submerged granite boulder. The impact bent the horizontal lower unit propeller shaft (propshaft), chewed the bronze shear pin, and severed the dual marine oil seals, allowing milky seawater to flood the lower gearcase. Mang Celso commissions marine mechanic *Amboy Bangka Services* at Farola beach. The repair requires dropping the outboard lower gearcase, extracting the bent propeller shaft and bearing carrier, transporting the propshaft to a precision lathe in town for dial-gauge hydraulic press straightening, and reassembling the gearcase with new oil seals, marine grease, and fresh outboard gear lube from *Tagudin Marine Supply*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MAR-004 (Outboard Propeller Shaft & Gearcase Repair - Brgy. Farola)             │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Marine Supply Store   │ ORD-MAR-04A (Tagudin Coastal Marine Supply - Merchant)          │
│                               │ - 1x Outboard Lower Unit Oil Seal Kit (Propshaft Inner/Outer)   │
│                               │ - 1x Bearing Carrier O-Ring, 1x Spline Propeller Bushing Kit    │
│                               │ - 1 Tube (250g) NLGI-2 Marine Blue Waterproof Grease            │
│                               │ - 1 Bottle (350ml) High-Viscosity SAE 90 Marine Gear Lube       │
│                               │ Amount: ₱1,150.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Coastal Courier Transit│ ORD-MAR-04B (Farola Coastal Moto-Cargo - Courier Entity)       │
│                               │ - Transport bent 45cm outboard propshaft to lathe in town       │
│                               │ - Return straightened & polished propshaft to Farola beach      │
│                               │ Amount: ₱180.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Precision Machine Shop│ ORD-MAR-04C (Vanguard Lathe & Marine Machining - Machine Shop)  │
│                               │ - Hydraulic dial-gauge propshaft straightening (runout < 0.001")│
│                               │ - Dressing spline grooves & polishing oil seal contact journals │
│                               │ Amount: ₱650.00 | Shape: A3 Specialist | Settlement: `machined` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 4: Marine Mechanic Labor │ ORD-MAR-04D (Amboy Bangka Services - Marine Trade Labor)        │
│                               │ - Outboard gearcase drop, bearing carrier extraction, propshaft │
│                               │   teardown, seal pressing, gear mesh inspection, vacuum test    │
│                               │ Amount: ₱1,200.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Amboy Bangka Services — ORD-MAR-04D)
1. **Outboard Motor Intake & Lower Unit Extraction:**
   * Step Key: `gearcase_demount`
   * Outboard motor tilted up on transom mount. Shift rod linkage disconnected; four lower unit mounting bolts unfastened. Gearcase assembly slid down off vertical driveshaft.
2. **Bearing Carrier & Propshaft Teardown:**
   * Step Key: `propshaft_disassembly`
   * Gearcase drain screw backed off; emulsified white milky oil drained. Bearing carrier retaining ring unbolted. Slide hammer pulls bearing carrier and reverse gear. Horizontal propeller shaft extracted; dial runout test reveals 0.038" bend at propeller hub seat.
3. **Dispatch to Precision Machine Shop:**
   * Step Key: `shaft_lathe_dispatch`
   * Bent propshaft packaged with protective rubber caps and handed to courier with digital routing slip for lathe straightening.
4. **Gearcase Housing Ultrasonic Flush & Bearing Inspection:**
   * Step Key: `housing_inspection`
   * Forward/reverse bevel gears and dog clutch inspected for chipped teeth. Internal gearcase cavity flushed with solvent to eliminate sand and saltwater silt.
5. **Propshaft Reassembly & Seal Installation:**
   * Step Key: `propshaft_reassembly`
   * *Gated Step.* Straightened shaft returned from lathe. New dual back-to-back oil seals pressed into bearing carrier using seal driver, packed with water-resistant marine blue grease. Shaft and gears seated. Carrier O-ring coated with marine grease and torqued to 35 N·m.
6. **Pressure/Vacuum Decay Test & Test Tank Sign-off:**
   * Step Key: `pressure_test_signoff`
   * Gearcase pressure tested to 10 PSI for 5 minutes; zero gauge drop. 350ml of SAE 90 marine gear lube pumped in until weeping from upper vent. Motor test-fired in water barrel; smooth forward-neutral-reverse shifting confirmed. Signoff completed.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While the propshaft is in transit to the lathe (`ORD-MAR-04C`), Amboy inspects the lower unit gears and flushes saltwater contamination from the gearcase on the beach.
* **Join via Dependency Gate:** Step `propshaft_reassembly` is held in `WAITING_FOR_DEPENDENCY` awaiting event `ORD-MAR-04B.delivered_to_site`.
* **Customer Approval Gate:** If the lathe technician discovers that the propeller shaft splines are twisted beyond straightening, requiring a new OEM shaft (₱3,400.00), n8n triggers an instant Approval Modal to Mang Celso.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF lower_unit_forward_pinion_gear_chipped == TRUE THEN
      EMIT GearboxTeethFracture()
      OFFER BevelGearReplacement(+₱1,200 Parts, +₱300 Labor)
  ELSE
      PROCEED with propshaft reassembly
  ```
* **Sidecar Errand:** The gearcase magnetic drain plug gasket is crushed. Amboy requests a sidecar errand. Buyer confirms new Need, spawning child order `ORD-MAR-04E` for two fiber crush washers (₱30.00 parts + ₱25.00 runner).

#### 5. Child Order Escrow & Failure Mode
* **Isolated Payment Obligations:** `ORD-MAR-04A`, `ORD-MAR-04B`, `ORD-MAR-04C`, and `ORD-MAR-04D` have distinct, independent `PaymentObligation` records.
* **Lathe Shop Failure Containment:** If the lathe machine shop accidentally fractures the shaft during hydraulic pressing, Node `ORD-MAR-04C` assumes commercial liability for the damaged shaft. Sibling order `ORD-MAR-04A` (unopened seals and oil) remains intact, and Amboy's earned teardown labor is preserved.

---

### Use Case 5: Tubeless Tire Puncture Vulcanizing with Heavy-Duty Rim Bead Seal

#### 1. Title & Real-World Municipal Scenario
* **Title:** Commercial Delivery Trike Tubeless Tire Crown Tread Puncture Hot Vulcanizing & Bead Restoration
* **Municipal Setting:** In Barangay Poblacion West, Tagudin, a commercial cargo delivery tricycle transporting wholesale rice sacks suffers a sharp puncture from a concrete nail in the central crown tread area. Because of heavy load deflection, conventional exterior string plugs (*tirintas*) fail repeatedly under commercial weight, and the steel rim has bead corrosion causing continuous slow air leaks. Driver Kuya Lando brings the wheel to *Master Boyet Vulcanizing Shop* on the national road. To achieve commercial load-bearing reliability, the job requires a strict fail-closed safety gate: verifying the puncture is strictly within the tire manufacturer's allowable crown repair zone (>15mm inward from the tread shoulder) with zero radial belt or sidewall carcass ply compromise, followed by professional hot-press chemical vulcanizing with raw rubber compound, mechanical wire-wheel rim cleaning, commercial liquid bead sealer, and high-pressure seating.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-TIRE-005 (Commercial Tubeless Vulcanizing - Brgy. Poblacion West)                │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Materials Supply      │ ORD-TIRE-05A (Tagudin Rubber & Vulcanizing Depot - Merchant)    │
│                               │ - 1x Heavy-Duty Radial Tire Patch (Internal reinforced)         │
│                               │ - 100g Uncured Raw Cushion Gum Rubber, 1 Can Black Bead Sealer  │
│                               │ - 1x Brass High-Pressure Valve Stem                             │
│                               │ Amount: ₱280.00 | Shape: A4 Product | Settlement: `collected`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Vulcanizing Labor     │ ORD-TIRE-05B (Master Boyet Vulcanizing Shop - Trade Labor)      │
│                               │ - Demount, fail-closed carcass audit, puncture ream/buff,       │
│                               │   vulcanizing cement, hot vulcanizing press bake, rim bead wire │
│                               │   brushing, bead sealer application, submersion dunk test       │
│                               │ Amount: ₱350.00 | Shape: A1 Trade Labor | Settlement: Signoff   │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Master Boyet Vulcanizing Shop — ORD-TIRE-05B)
1. **Wheel Intake & Submersion Leak Triage:**
   * Step Key: `leak_identification`
   * Wheel placed in water dunk tank. Air bubble stream identifies primary puncture situated in the crown tread zone (center third of tread width) and minor bubbling along oxidized rim bead.
2. **Tire Demounting & Fail-Closed Carcass Safety Audit:**
   * Step Key: `tire_demounting_safety_audit`
   * Valve core removed; tire bead broken on mechanical bead breaker. Tire pried off rim with non-marring tire irons. Internal carcass, radial steel belts, inner liner, and sidewall flex zones audited against USTMA puncture repair standards. If puncture injury extends into shoulder/sidewall flex zones or broken belts are discovered, repair is rejected immediately.
3. **Internal Buffing & Chemical Cement Application:**
   * Step Key: `surface_preparation`
   * Low-speed pneumatic buffer with tungsten carbide rasps buffs inner liner down to clean velvet texture. Steel wire ends trimmed. Fast-drying vulcanizing fluid applied; dried for 5 minutes.
4. **Hot Plate Vulcanizing Bake:**
   * Step Key: `hot_vulcanizing_cure`
   * Raw cushion gum pressed into puncture channel. Reinforced radial patch applied inside. Clamped in electric vulcanizing heating press at 145°C for 18 minutes to cross-link rubber molecules.
5. **Rim Wire Brushing & Bead Sealer Coating:**
   * Step Key: `rim_bead_restoration`
   * Steel wheel rim bead seat ground with cup wire brush on angle grinder to eliminate rust and scale. Thick coat of liquid butyl rubber bead sealer applied.
6. **High-Pressure Inflation & Immersion Audit:**
   * Step Key: `inflation_verification`
   * Tire mounted. Rapid air blast seats beads with audible pops. Inflated to 40 PSI. Re-submerged in dunk tank for 3 minutes; zero bubbles observed. Customer signs completion.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While the tire is clamped in the 18-minute electric vulcanizing bake, Boyet simultaneously cleans and wire-brushes the steel rim.
* **Join via Dependency Gate:** Step `hot_vulcanizing_cure` is unlocked by verified material availability in `ORD-TIRE-05A`.
* **Fail-Closed Carcass & Repair-Zone Safety Gate:**
  ```text
  IF puncture_location == 'shoulder_or_sidewall_flex_zone' 
     OR radial_steel_belts_severed == TRUE 
     OR carcass_ply_separation_detected == TRUE THEN
      EMIT UnrepairableCarcassSafetyViolation(injury_zone)
      REJECT VulcanizingRepairImmediately()
      CANCEL ORD-TIRE-05A (100% refund of unopened patch materials)
      SETTLE ORD-TIRE-05B at ₱100.00 Demounting/Safety Inspection Milestone
      OFFER NewCommercialTireProcurementQuote()
  ELSE
      PROCEED to internal buffing and hot vulcanizing bake
  ```
* **Customer Approval Gate:** If carcass passes the crown safety check but rim inspection reveals deep bead oxidation pitting (>2mm depth), n8n emits an Approval Card for Kuya Lando to authorize epoxy rim resurfacing (+₱150.00).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF rim_flange_dented == TRUE THEN
      EMIT RimDeformationDetected(depth_mm)
      OFFER HydraulicRimStraightening(+₱150 Labor)
  ELSE
      PROCEED with standard bead seal
  ```
* **Sidecar Errand:** Boyet finds the rubber valve stem is dry-rotted. A new `DealNeed` is accepted by the customer, adding child order `ORD-TIRE-05C` for a high-pressure brass clamped valve stem (₱40.00).

#### 5. Child Order Escrow & Failure Mode
* **Separation of Consumables and Labor:** If the tire fails the fail-closed safety gate (injury outside allowable crown area or separated carcass cords), hot vulcanizing is rejected by policy. The materials order `ORD-TIRE-05A`'s `PaymentObligation` is released back to the buyer in full, and Boyet satisfies the demount/triage inspection milestone of `ORD-TIRE-05B` (₱100.00).
---

### Use Case 6: Car 12V Alternator Failure with Battery Delivery & Computer ECU Scan

#### 1. Title & Real-World Municipal Scenario
* **Title:** In-Situ Alternator Diode Replacement, Battery Hot-Swap & OBD2 ECU Re-calibration
* **Municipal Setting:** In Barangay Ambalayat, an agricultural upland village in Tagudin, a private teacher's family vehicle (Mitsubishi Adventure Diesel) fails to restart after stopping at the barangay hall. The battery is completely dead, and the dashboard battery warning light had been glowing faintly earlier that morning. Mechanic *Jun-Jun Auto-Electric* is dispatched for a mobile call. The technician determines that the internal alternator rectifier diode pack has shorted, draining the battery to 8.2V. The job requires on-site delivery of a fresh Motolite Gold 2SMF maintenance-free battery, unbolting and bench-repairing the alternator diode pack, and performing an ECU diagnostic scan to clear low-voltage error codes.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-006 (Alternator & Battery Rescue - Brgy. Ambalayat)                        │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Battery Depot Sourcing│ ORD-AUTO-06A (Tagudin Motolite Battery Center - Merchant)       │
│                               │ - 1x Motolite Gold 2SMF 12V Maintenance-Free Car Battery        │
│                               │ - Core trade-in credit deduction applied                        │
│                               │ Amount: ₱4,600.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Alternator Components │ ORD-AUTO-06B (Ambalayat Auto-Electrical Spares - Merchant)      │
│                               │ - 1x Heavy-Duty 8-Diode Bridge Rectifier & Brush Holder Pack    │
│                               │ Amount: ₱850.00 | Shape: A4 Product | Settlement: `collected`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Express Courier       │ ORD-AUTO-06C (Tagudin Upland Moto-Courier - Courier Entity)     │
│                               │ - Express transport of battery & diode pack to Brgy. Ambalayat  │
│                               │ Amount: ₱180.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 4: Auto-Electrical Labor │ ORD-AUTO-06D (Jun-Jun Auto-Electric - Trade Labor Entity)       │
│                               │ - Field triage, alternator bench repair, diode desoldering,     │
│                               │   battery installation, terminal cleaning, ECU OBD2 scan       │
│                               │ Amount: ₱1,300.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Jun-Jun Auto-Electric — ORD-AUTO-06D)
1. **Electrical Intake & Parasitic Draw Audit:**
   * Step Key: `electrical_triage`
   * Digital multimeter records battery open-circuit voltage at 8.2V. Inductive DC clamp meter reveals a 3.8A continuous parasitic draw with ignition off, diagnosing shorted negative rectifier diodes inside the alternator.
2. **Alternator Removal:**
   * Step Key: `alternator_extraction`
   * Vacuum pump hose uncoupled; alternator drive belt loosened; B+ terminal unbolted. Alternator lifted out onto portable fold-out work table.
3. **Bench Teardown & Diode Pack Replacement:**
   * Step Key: `diode_pack_repair`
   * Alternator rear casing opened. High-power 100W soldering iron desolders stator phase windings. Shorted rectifier diode pack unbolted. Slip rings cleaned; new rectifier diode pack and carbon brushes soldered in.
4. **Bench Spin & Continuity Test:**
   * Step Key: `bench_testing`
   * Alternator rotor spun with electric drill; stator AC output and DC rectification verified on oscilloscope screen.
5. **Re-installation & Fresh Battery Installation:**
   * Step Key: `battery_alternator_installation`
   * *Gated Step.* Unlocked upon courier arrival with Motolite battery. Alternator remounted. Fresh Motolite battery seated; terminals cleaned and coated with dielectric silicone grease.
6. **ECU Scan, Charging Voltage Test & Sign-off:**
   * Step Key: `ecu_scan_signoff`
   * Engine started. Multimeter verifies stable 14.1V charging output across 1,000–3,000 RPM. Launch OBD2 diagnostic scanner plugged into DLC port; DTC codes `P0562` (System Voltage Low) cleared. Customer signs release.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While Courier Node `ORD-AUTO-06C` is traveling 8km upland to deliver the heavy battery, Jun-Jun disassembles and rebuilds the alternator on his portable bench.
* **Join via Dependency Gate:** Step `battery_alternator_installation` is locked until the battery courier emits event `ORD-AUTO-06C.delivered_to_site`.
* **Customer Approval Gate:** If testing the discharged battery on a digital conductance tester reveals that the battery can still hold a charge after a slow bench recharge, Jun-Jun can offer to cancel the ₱4,600.00 battery purchase and instead bill a ₱300.00 overnight bench-charge fee. Customer must approve via app prompt.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF alternator_vacuum_pump_seals_leaking_oil_into_windings == TRUE THEN
      EMIT AlternatorOilContamination(seal_failed)
      OFFER VacuumPumpResealKit(+₱350 Labor, +₱220 Seals)
  ```
* **Sidecar Errand:** Positive battery terminal clamp is found to be cracked from over-tightening. Jun-Jun requests a sidecar errand. Buyer confirms new Need, spawning child order `ORD-AUTO-06E` for a solid brass terminal clamp (₱75.00 parts + ₱40.00 runner).

#### 5. Child Order Escrow & Failure Mode
* **Battery Core Exchange Safety:** The trade-in credit of ₱400.00 for the old battery core is managed as a condition within `ORD-AUTO-06A`'s `PaymentObligation`. When courier verifies physical turnover of the old core, the net payable amount is finalized.
* **Failed Logistics Isolation:** If torrential upland rains cause a landslide on the Ambalayat road delaying the courier, mechanic Jun-Jun's labor contract does not cancel; the gate enters `weather_standby`, and child order `PaymentObligation` records remain isolated.

---

### Use Case 7: Windshield Crack Resin Repair with Auto-Glass Supply Transit

#### 1. Title & Real-World Municipal Scenario
* **Title:** Laminated Windshield Bullseye Crack Optical Resin Injection & UV Polymerization
* **Municipal Setting:** In Barangay Libtong, Tagudin, a commercial UV Express commuter van traveling on the provincial highway is struck by a flying gravel chip thrown up by a dump truck. The impact produces a 25mm combination bullseye and star crack on the driver's side laminated windshield. If left untreated, highway road vibrations and temperature changes from air-conditioning will cause the crack to run across the entire glass, requiring a ₱9,000 full windshield replacement. The driver books *ClearView Windshield Repair* for a mobile repair at Libtong terminal. Specialized high-index anaerobic UV-curable optical resin and vacuum-pressure injection seals must be transported from an automotive specialty supply store in Poblacion.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-007 (Windshield Resin Repair - Brgy. Libtong)                               │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Specialty Materials   │ ORD-AUTO-07A (Ilocos Auto-Glass Supply Depot - Merchant)        │
│                               │ - 1x Professional Low-Viscosity Optical Epoxy Resin (15 cps)   │
│                               │ - 1x High-Viscosity Pit-Filler Resin, 10x Mylar UV Curing Tabs  │
│                               │ Amount: ₱420.00 | Shape: A4 Product | Settlement: `collected`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Swift Courier Transit │ ORD-AUTO-07B (Toktok Express Moto - Courier Entity)             │
│                               │ - Rapid transit of resin kit to Brgy. Libtong terminal          │
│                               │ Amount: ₱90.00 | Shape: A4 Transit | Settlement: `delivered`    │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Specialist Tech Labor │ ORD-AUTO-07C (ClearView Mobile Glass Specialist - Trade Labor)  │
│                               │ - Complete glass restoration: excavation, vacuum moisture purge,│
│                               │   pressure resin injection, 365nm UV cure, razor leveling       │
│                               │ Amount: ₱850.00 | Shape: A1 Trade Labor | Settlement: Signoff   │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (ClearView Mobile Glass Specialist — ORD-AUTO-07C)
1. **Crack Assessment & Moisture Inspection:**
   * Step Key: `damage_assessment`
   * Crack measured with digital caliper (23mm diameter). Inspection mirror placed inside cabin. Crack probed with carbide scribe to ensure impact point does not breach the inner PVB plastic interlayer.
2. **Impact Point Drilling & Mini-Bullseye Tapping:**
   * Step Key: `drilling_stress_relief`
   * Variable-speed miniature rotary tool with diamond micro-burr drills through outer glass layer down to 0.05mm above PVB layer. Micro-bullseye popped with spring punch to create clean resin entry channel.
3. **Bridge Mounting & Vacuum Degassing Cycle:**
   * Step Key: `vacuum_evacuation`
   * Precision suction bridge centered directly over impact drill hole. Injector cylinder clamped. Vacuum stroke pulled with syringe pump for 5 minutes to boil out trapped air and moisture.
4. **High-Pressure Resin Injection Cycle:**
   * Step Key: `pressure_injection`
   * *Gated Step.* Unlocked upon courier arrival with resin. 5 drops of 15 cps optical resin loaded into injector. Pressure piston turned down; hydraulic pressure forces resin into micro-fissures. Heat gun gently applied inside to expand micro-cracks for 100% optical wetting.
5. **Pit Filling & 365nm UV Polymerization:**
   * Step Key: `uv_curing`
   * Bridge removed. Thick pit-filler resin applied over drill hole; covered with smooth Mylar tab. High-intensity 365nm ultraviolet lamp applied for 6 minutes to fully cure resin.
6. **Razor Leveling & Optical Polish Sign-off:**
   * Step Key: `polishing_signoff`
   * Hardened excess resin scraped flush with single-edge carbon steel razor blade at 90° angle. Cerium oxide polish applied. Optical clarity test verifies >95% refractive index match. Driver signs waiver.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While courier is in transit, the technician mounts the bridge and conducts moisture evacuation on-site.
* **Join via Dependency Gate:** Step `pressure_injection` is gated on event `ORD-AUTO-07B.delivered_to_site`.
* **Customer Approval Gate:** If the crack exceeds 30mm or has penetrated through the inner glass pane, resin injection cannot pass safety inspection. n8n emits a Rejection Notice with photo evidence and redirects the customer to a full windshield replacement quote.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF micro_fissure_spreads_during_drilling == TRUE THEN
      EMIT CrackRunningEmergency()
      APPLY MiniStopDrillHoleAtExtremity(+₱200 Scope Variance)
  ```
* **Sidecar Errand:** Tech runs out of high-index curing tabs. Customer approves a new Need, spawning child order `ORD-AUTO-07D` for acetone and optical razor blades (₱65.00).

#### 5. Child Order Escrow & Failure Mode
* **Thermal Shock Run Risk:** If direct sunlight causes the glass to crack edge-to-edge during repair despite proper shading, the technician's liability is strictly governed by the signed pre-inspection waiver. Sibling order `ORD-AUTO-07A`'s `PaymentObligation` for consumed resin is settled, while the technician's labor order `ORD-AUTO-07C` settles at its agreed triage fee milestone (₱425.00).

---

### Use Case 8: Diesel Pickup Fuel Injector Cleaning & Fuel Filter Change with Parts Runner

#### 1. Title & Real-World Municipal Scenario
* **Title:** Common-Rail Diesel Pickup Ultrasonic Injector Descaling, Copper Washer Replacement & Fuel Filter Servicing
* **Municipal Setting:** In Barangay Tampugo, Tagudin, a commercial farm owner's Isuzu D-Max 4JJ1 3.0L diesel pickup experiences severe black exhaust smoke, rough cold-start idling, and an intermittent check engine light (`P0087` Rail Pressure Too Low). The truck cannot reliably haul produce to market. Independent diesel specialist *Mang Roger Common-Rail Diagnostics* diagnoses clogged, carbon-encrusted injector nozzles and an overdue, water-contaminated primary fuel filter. The job requires on-site removal of four common-rail injectors, transit to a diesel injection test bench in town for ultrasonic cleaning and calibration, and installation of genuine fuel filters, leak-off O-rings, and heat-shield copper crush washers from *Tagudin Commercial Diesel Parts*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-008 (Common-Rail Injector & Filter Service - Brgy. Tampugo)                 │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Parts & Consumables   │ ORD-AUTO-08A (Tagudin Commercial Diesel Parts - Merchant)       │
│                               │ - 1x OEM Primary Fuel Filter Element & Water Sensor O-Ring      │
│                               │ - 4x Spec-Calibrated Copper Heat Shield Injector Washers        │
│                               │ - 4x Viton High-Pressure Return Leak-Off O-Rings                │
│                               │ Amount: ₱1,150.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Parts Runner Transit  │ ORD-AUTO-08B (Tampugo Express Runner - Courier Entity)          │
│                               │ - Pickup parts from central store; transport injectors to bench │
│                               │ Amount: ₱180.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Ultrasonic Bench Test │ ORD-AUTO-08C (Candon Diesel Calibration Center - Subcontractor) │
│                               │ - Ultrasonic bath cavitation, back-flush, multi-pulse spray     │
│                               │   dispersion pattern test, return flow volume check             │
│                               │ Amount: ₱1,600.00 | Shape: A3 Specialist | Settlement: `tested` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 4: Diesel Mechanic Labor │ ORD-AUTO-08D (Mang Roger Common-Rail - Trade Labor Entity)      │
│                               │ - Fuel depressurization, valve cover extraction, seat reaming,  │
│                               │   torque to 30 N·m, hand priming, air bleed, road test          │
│                               │ Amount: ₱1,800.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Mang Roger Common-Rail Diagnostics — ORD-AUTO-08D)
1. **Intake Live OBD2 Scantool Audit:**
   * Step Key: `live_data_audit`
   * Scantool logs injector feedback values. Cylinder #3 shows abnormal trim variance (+4.2 mm³/stroke). Fuel rail pressure during cranking lags target pressure by 80 bar.
2. **Fuel Depressurization & Injector Extraction:**
   * Step Key: `injector_extraction`
   * High-pressure fuel rail depressurized. Intercooler piping, wiring loom, and injector hard lines removed. Injector hold-down clamp bolts removed; slide hammer pops injectors from cylinder head wells.
3. **Injector Dispatch to Ultrasonic Bench Test:**
   * Step Key: `bench_dispatch`
   * 4 injectors numbered by cylinder position, capped with rubber plugs, and handed to runner for transport to Candon Diesel Calibration Center.
4. **Injector Well Seat Reaming & Fuel Filter Replacement:**
   * Step Key: `seat_preparation_filter_swap`
   * Injector bore well reamed with brass seat cleaner to remove carbon flakes. Fuel filter canister drained; water-saturated element replaced. Water separator sensor cleaned.
5. **Injector Installation with Calibrated Copper Washers:**
   * Step Key: `injector_installation`
   * *Gated Step.* Unlocked upon runner return with tested injectors and new parts. New copper crush washers fitted. Injectors seated; hold-down clamps torqued precisely to 30 N·m. New Viton leak-off O-rings lubricated with silicone and locked.
6. **Hand Priming, Air Bleed & High-Load Road Test:**
   * Step Key: `priming_road_test`
   * Priming pump hand-pumped until firm. High-pressure hard lines cracked to bleed trapped air, then re-torqued. Engine fired. Live scantool verifies all cylinder feedback values within ±0.8 mm³/stroke. Sign-off executed.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While injectors undergo ultrasonic cleaning and flow testing at the calibration center (`ORD-AUTO-08C`), Mang Roger replaces the fuel filter and reams the cylinder head injector seats on-site.
* **Join via Dependency Gate:** Step `injector_installation` waits on event `ORD-AUTO-08B.delivered_to_site`.
* **Customer Approval Gate:** If the test bench discovers that Injector #3 has a cracked piezo crystal or eroded command valve body that ultrasonic cleaning cannot resolve, requiring a ₱6,500.00 replacement injector, n8n triggers an instant Approval Modal to the truck owner.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF diesel_tank_contains_heavy_sediment_algae == TRUE THEN
      EMIT FuelTankContaminationDetected()
      OFFER FuelTankDrainAndFlush(+₱900 Labor)
  ```
* **Sidecar Errand:** Mang Roger finds that one fuel rail hard-pipe flare nut has damaged threads. Buyer approves a new Need, creating child order `ORD-AUTO-08E` for a replacement bridge pipe (₱350.00 parts + ₱50.00 runner).

#### 5. Child Order Escrow & Failure Mode
* **Bench Test Fault Isolation:** If testing at Candon Calibration proves that all four injectors are mechanically blown and require complete overhaul beyond scope, the bench test order `ORD-AUTO-08C`'s `PaymentObligation` is captured for its testing service (₱1,600.00), while the mechanic receives his extraction and diagnosis milestone under `ORD-AUTO-08D`. The unopened consumables from `ORD-AUTO-08A` are returned without cross-party escrow contagion.

---

### Use Case 9: Brake Shoe & Drum Re-Lining with Specialized Lathe Shop Turning Errand

#### 1. Title & Real-World Municipal Scenario
* **Title:** Commercial Heavy-Tricycle Rear Brake Drum Turning, Shoe Re-Lining & Hydraulic Bleed
* **Municipal Setting:** In Barangay Lacong, Tagudin, a public passenger tricycle operating on steep hilly routes experiences severe brake squeal, pedal pulsation, and dangerous brake fade when descending slopes. Driver Mang Nestor pulls into *Berto Moto-Brake Shop*. Mechanic Berto discovers that the rear brake shoes are worn down to their steel backing plates, heavily grooving and ovalizing the cast-iron brake drums. The repair requires riveting new asbestos-free friction linings onto the shoes, dismounting the drums and sending them via courier to a machine shop in town equipped with a specialized brake drum lathe, and refilling the hydraulic reservoir with fresh DOT 4 brake fluid from *Tagudin Auto Supply*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MOTO-009 (Brake Shoe Re-Lining & Drum Lathe - Brgy. Lacong)                      │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Brake Supply Depot    │ ORD-MOTO-09A (Tagudin Auto Supply & Friction - Merchant)        │
│                               │ - 1x Set Semi-Metallic Friction Lining Strips & Brass Rivets    │
│                               │ - 1x Brake Hardware Return Spring Kit, 1x 500ml DOT 4 Fluid     │
│                               │ Amount: ₱480.00 | Shape: A4 Product | Settlement: `collected`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Drum Transit Courier  │ ORD-MOTO-09B (Lacong Express Runner - Courier Entity)           │
│                               │ - Transport heavy drums & shoes to lathe shop and back          │
│                               │ Amount: ₱140.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Brake Drum Lathe Shop │ ORD-MOTO-09C (Precision Brake & Clutch Lathe - Machine Shop)    │
│                               │ - Skim and resurface two brake drums on rotary lathe            │
│                               │ - Pneumatic press-riveting friction linings to shoe cores       │
│                               │ Amount: ₱550.00 | Shape: A3 Specialist | Settlement: `machined` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 4: Brake Specialist Labor│ ORD-MOTO-09D (Berto Moto-Brake Shop - Trade Labor Entity)       │
│                               │ - Teardown, wheel cylinder overhaul, backing plate lubrication, │
│                               │   drum reassembly, brake shoe centering, DOT 4 hydraulic bleed  │
│                               │ Amount: ₱750.00 | Shape: A1 Trade Labor | Settlement: Signoff   │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Berto Moto-Brake Shop — ORD-MOTO-09D)
1. **Intake & Brake Fade Inspection:**
   * Step Key: `brake_triage`
   * Trike wheel raised on stand. Wheel spun by hand; severe scraping noise and binding spots indicate drum ovality. Drum dismounted; shoe lining measured at 0.4mm (minimum: 2.0mm).
2. **Drum & Shoe Extraction:**
   * Step Key: `drum_demounting`
   * Hub puller pops brake drums off axle splines. Return springs unhooked; brake shoes and drums cleaned of hazardous brake dust with chemical brake cleaner.
3. **Dispatch to Precision Machine Shop:**
   * Step Key: `dispatch_to_lathe`
   * Drums and worn shoes packed and handed to Lacong Express Runner for delivery to lathe shop in town.
4. **Backing Plate & Wheel Cylinder Servicing:**
   * Step Key: `wheel_cylinder_overhaul`
   * Wheel cylinder rubber dust boots pulled; piston seals checked for hydraulic fluid leaks. Backing plate shoe contact pads cleaned with wire brush and coated with high-temperature ceramic brake grease.
5. **Reassembly & Brake Shoe Adjustment:**
   * Step Key: `reassembly_adjustment`
   * *Gated Step.* Unlocked upon runner return with skimmed drums and freshly riveted shoes. Shoes installed with new return springs. Star wheel adjuster turned until shoes lightly drag drum, then backed off 3 clicks.
6. **Hydraulic System Bleed & Road Brake Test:**
   * Step Key: `hydraulic_bleed_signoff`
   * Master cylinder flushed with fresh DOT 4 fluid. Bleeder screw opened; pressure bleeding eliminates all air bubbles. Trike driven on 20% decline test hill; full lockup achieved without pulling or fade. Signoff approved.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While the lathe shop turns the drums and rivets linings (`ORD-MOTO-09C`), Berto overhauls the wheel cylinder and cleans the backing plates on-site.
* **Join via Dependency Gate:** Step `reassembly_adjustment` waits on n8n state `ORD-MOTO-09B.delivered_to_site`.
* **Customer Approval Gate:** If the brake drum lathe operator measures drum internal diameter and discovers it has exceeded the maximum safe discard diameter (e.g., >142mm), turning will make the drum dangerously thin. n8n issues an alert requiring Mang Nestor to approve purchase of a new brake drum (₱750.00).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF wheel_cylinder_piston_pitted_or_leaking == TRUE THEN
      EMIT HydraulicBrakeFluidLeak()
      OFFER WheelCylinderReplacement(+₱180 Part, +₱150 Labor)
  ```
* **Sidecar Errand:** Berto finds a snapped shoe hold-down spring pin. Customer confirms new Need, spawning child order `ORD-MOTO-09E` for a universal spring pin kit (₱35.00).

#### 5. Child Order Escrow & Failure Mode
* **Machining Delay Independence:** If the lathe shop experiences a power disruption, mechanic order `ORD-MOTO-09D` remains safely paused without penalty. If the buyer decides to retrieve the trike before machining finishes, the machine shop's `PaymentObligation` is settled for work commenced, while unperformed assembly labor is released back to the buyer.

---

### Use Case 10: Motorcycle Drive Chain & Sprocket Replacement with Chain Lube Service

#### 1. Title & Real-World Municipal Scenario
* **Title:** Underbone Motorcycle Heavy-Duty 428H Drive Chain & Hardened Sprocket Set Overhaul
* **Municipal Setting:** In Barangay Barrientos, Tagudin, a delivery rider operating a Yamaha Sight 115 underbone motorcycle suffers severe chain slack, grinding noise, and frequent chain derailment while carrying e-commerce packages. The chain has stretched past the maximum swingarm adjustment limit, and the rear sprocket teeth are hooked and sharp. Mechanic *Kiko Quick-Fix Moto* in Barrientos is booked to perform a full drive chain and sprocket replacement. The job requires sourcing a heavy-duty 428H 110-link chain, a 14T front engine sprocket, a 40T rear wheel sprocket, and synthetic chain lubricant from *Tagudin Central Motor Parts*, transported by a local runner.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MOTO-010 (Drive Chain & Sprocket Replacement - Brgy. Barrientos)                 │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Parts Sourcing        │ ORD-MOTO-10A (Tagudin Central Motor Parts - Merchant)           │
│                               │ - 1x Heavy-Duty 428H Gold Drive Chain (110 Links)               │
│                               │ - 1x Heat-Treated 14T Front Sprocket & 40T Rear Sprocket Kit    │
│                               │ - 1 Can (250ml) High-Adhesive Synthetic Motorcycle Chain Lube   │
│                               │ Amount: ₱820.00 | Shape: A4 Product | Settlement: `collected`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Runner Logistics      │ ORD-MOTO-10B (Barrientos Moto Runner - Courier Entity)          │
│                               │ - Sourcing transit from Central town to Barrientos workshop     │
│                               │ Amount: ₱80.00 | Shape: A4 Transit | Settlement: `delivered`    │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Motorcycle Tech Labor │ ORD-MOTO-10C (Kiko Quick-Fix Moto - Trade Labor Entity)         │
│                               │ - Chain cover removal, master link cutting, rear wheel removal, │
│                               │   sprocket bolt torque, laser alignment, tensioning, lube spray │
│                               │ Amount: ₱350.00 | Shape: A1 Trade Labor | Settlement: Signoff   │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Kiko Quick-Fix Moto — ORD-MOTO-10C)
1. **Drive System Intake & Sprocket Wear Triage:**
   * Step Key: `drive_train_triage`
   * Bike placed on center stand. Drive chain pulled away from rear sprocket at 3 o'clock position; entire tooth tip exposed, proving critical chain pitch elongation. Rear sprocket teeth visibly hooked.
2. **Disassembly & Rear Wheel Extraction:**
   * Step Key: `drive_train_teardown`
   * Left engine cover unbolted; front sprocket retaining plate removed. Chain master link ground and pushed out with chain breaker. Rear axle nut unbolted; rear wheel dropped.
3. **Sprocket Installation & Threadlock Torquing:**
   * Step Key: `sprocket_mounting`
   * *Gated Step.* Unlocked upon runner arrival with parts. Old rear sprocket unbolted. New 40T hardened steel sprocket fitted; mounting nuts treated with medium blue threadlocker and torqued in star pattern to 32 N·m. Front 14T sprocket mounted with new locking tab washer.
4. **Chain Sizing & Master Link Pressing:**
   * Step Key: `chain_sizing_installation`
   * 428H chain routed over sprockets. Chain sized with chain cutter to 106 links to match swingarm midpoint. Heavy-duty master link installed with clip closed-end facing the direction of forward wheel rotation.
5. **Wheel Alignment & Chain Slack Calibration:**
   * Step Key: `alignment_slack_adjustment`
   * Axle adjusters set symmetrically using precision swingarm hash marks and straight-edge chain alignment tool. Chain slack calibrated to precisely 25mm free play at midpoint. Rear axle nut torqued to 60 N·m.
6. **Synthetic Lubrication & Customer Sign-off:**
   * Step Key: `lubrication_signoff`
   * Wheel spun by hand while spraying synthetic chain lube onto inside rollers. Excess wiped off. Test drive confirms silent transmission; digital signoff completed.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While runner travels to town to buy the chain kit, Kiko removes the rear wheel, cleans road grime and hardened grease from the front engine countershaft sprocket cavity.
* **Join via Dependency Gate:** Step `sprocket_mounting` is gated until runner emits `ORD-MOTO-10B.delivered_to_site`.
* **Customer Approval Gate:** If rear wheel removal reveals damaged rear wheel cush drive rubber dampers (*goma ng hub*) resulting in rotational play, n8n triggers an approval alert for damper replacement (+₱120.00).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF swingarm_pivot_bushings_have_excessive_play == TRUE THEN
      EMIT SwingarmWornWarning(play_detected)
      OFFER SwingarmBushingOverhaul(+₱300 Labor, +₱150 Bushings)
  ```
* **Sidecar Errand:** Front sprocket retaining clip bolts are corroded and rounded off. Buyer confirms new Need, spawning child order `ORD-MOTO-10D` for two M5 Allen bolts (₱20.00).

#### 5. Child Order Escrow & Failure Mode
* **Independent Runner Escrow:** If the runner is delayed by highway traffic, Node `ORD-MOTO-10B` does not cause cancellation. Kiko remains idle on clean teardown without penalty. If the customer cancels before parts arrive, the runner's `PaymentObligation` is captured for transport, the store accepts returned sealed parts, and the customer settles the teardown milestone of `ORD-MOTO-10C` (₱150.00).

---

### Use Case 11: Farm Hand-Tractor (Kuliglig) Diesel Engine Overhaul Before Planting Season

#### 1. Title & Real-World Municipal Scenario
* **Title:** Agricultural Kuliglig R180 Diesel Engine Complete Field Teardown, Liner Hone & Crank Overhaul
* **Municipal Setting:** In Barangay Becques, Tagudin, prime rice planting season is starting. Farmer Mang Carding's two-wheel walking tractor (*kuliglig*), powered by an 8HP water-cooled horizontal single-cylinder diesel engine (Changfa/R180), suffered severe overheating during land preparation due to an empty water hopper, resulting in a seized piston and scored cylinder liner. With no transport to bring the heavy 80kg cast-iron engine to town, mobile small-engine mechanic *Mang Isko Agro-Tech* conducts an in-field engine overhaul under a mango tree beside the rice paddy. The overhaul requires a new 80mm piston and liner kit, connecting rod bearings, valve grind, and hopper descaling chemicals sourced from *Tagudin Farm Supply* and transported via cargo trike.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AGRI-011 (Kuliglig R180 Diesel Overhaul - Brgy. Becques)                         │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Agri-Engine Parts     │ ORD-AGRI-11A (Tagudin Farm Machineries & Supply - Merchant)     │
│                               │ - 1x R180 Wet Cylinder Liner, 1x 80mm Piston & Ring Set, Pin    │
│                               │ - 1x Full Copper Head Gasket Set, 1x Pair Con-Rod Shell Bearings│
│                               │ - 2x Intake/Exhaust Valves, 1x Acid Hopper Descaling Powder     │
│                               │ Amount: ₱2,100.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Heavy Cargo Transit   │ ORD-AGRI-11B (Becques Farm-to-Market Trike Runner - Courier)    │
│                               │ - Transit of heavy cast-iron liner & parts to rice paddy field  │
│                               │ Amount: ₱150.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Agricultural Mechanic │ ORD-AGRI-11C (Mang Isko Agro-Tech - Trade Labor Entity)         │
│                               │ - Comprehensive field overhaul: Teardown, wet liner pull, crank │
│                               │   inspection, rod fitting, valve lap, hopper descaling, startup │
│                               │ Amount: ₱1,500.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Mang Isko Agro-Tech — ORD-AGRI-11C)
1. **Field Intake & Seizure Diagnosis:**
   * Step Key: `engine_seizure_triage`
   * Hand crank inserted and rotated; engine completely locked at top dead center. Water hopper empty; burnt oil residue coats cylinder block.
2. **Cylinder Head & Piston Extraction:**
   * Step Key: `field_teardown`
   * Rocker cover, push rods, and cylinder head unbolted. Oil sump plate unbolted; connecting rod cap removed. Piston driven out with wooden mallet; severe aluminum galling observed on piston skirt.
3. **Wet Cylinder Liner Extraction & Block Cleaning:**
   * Step Key: `liner_pulling`
   * Universal screw puller extracts seized wet cylinder liner from crankcase bore. Water hopper internal cooling jacket scraped of rust and limestone scale deposits.
4. **New Wet Liner Installation & O-Ring Sealing:**
   * Step Key: `liner_installation`
   * *Gated Step.* Unlocked upon parts arrival. New rubber water-jacket sealing rings fitted to outer liner grooves, lubricated with vegetable oil soap. Wet liner tapped home into block until flange seats flush (0.05–0.10mm liner protrusion above deck).
5. **Piston Assembly, Con-Rod Shell Torquing & Valve Lapping:**
   * Step Key: `rotating_assembly_reassembly`
   * New con-rod shell bearings fitted. Piston rings compressed with ring band; rod torqued to 42 N·m; cotter pin locked. Valves lapped into head with grinding paste; head torqued down.
6. **Water Hopper Descaling, Hand-Crank Startup & Sign-off:**
   * Step Key: `startup_field_testing`
   * Water hopper filled with water and descaling solution. Hand crank spun with decompression lever pulled; decompression released; engine fires with rhythmic diesel knock. Tested under rotary tiller cultivator load in wet mud for 30 minutes. Mang Carding approves signoff.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While parts are traveling across farm-to-market roads (`ORD-AGRI-11B`), Isko pulls the old liner, descales the water hopper, and cleans the crankcase sump in the field.
* **Join via Dependency Gate:** Step `liner_installation` waits on event `ORD-AGRI-11B.delivered_to_site`.
* **Customer Approval Gate:** If crankshaft journal has deep grooves from spun rod bearings requiring crank removal and machine shop turning in town, Isko pauses work and issues an appraisal modal for an additional ₱1,200.00 in machine work.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF high_pressure_diesel_injection_pump_plunger_stuck == TRUE THEN
      EMIT InjectionPumpFuelStarvation()
      OFFER FuelPumpPlungerRebuild(+₱400 Labor, +₱300 Plunger)
  ```
* **Sidecar Errand:** Isko notices that the decompression lever spring is snapped. Buyer confirms new Need, spawning child order `ORD-AGRI-11D` for a replacement spring (₱25.00).

#### 5. Child Order Escrow & Failure Mode
* **Field Weather Disruption:** If a sudden tropical downpour hits the open paddy, Isko tarp-wraps the exposed engine block. The order enters `rain_delay_pause`. `PaymentObligation` records remain isolated. Sibling order `ORD-AGRI-11A` remains settled as parts were already delivered intact.

---

### Use Case 12: Car Radiator Boil-Over & Chemical Flush with Coolant Delivery

#### 1. Title & Real-World Municipal Scenario
* **Title:** Emergency Radiator Thermal Flush, Pressure Cap Replacement & 50/50 Premix Coolant Servicing
* **Municipal Setting:** In Barangay Pudoc, a coastal village in Tagudin, a tourist's family van (Nissan Urvan NV350) suffers sudden radiator boil-over and steam eruption while climbing the coastal highway overpass. The temperature gauge spiked to the red zone, blowing rusty boiling water out of the plastic coolant overflow tank. The driver pulls into a roadside coconut grove and requests emergency cooling system service via Serbizyu. Mobile radiator technician *Mang Kanor Thermal Solutions* is dispatched. The system requires a chemical cooling flush to dissolve rust sludge, radiator pressure testing, a new 1.1 bar radiator pressure cap, and 8 liters of ethylene glycol 50/50 premix coolant delivered from *Poblacion Auto Care*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-012 (Radiator Boil-Over & Chemical Flush - Brgy. Pudoc)                     │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Cooling Parts Store   │ ORD-AUTO-12A (Poblacion Auto Care & Chemical Supply - Merchant) │
│                               │ - 2x 4-Liter Jugs 50/50 Pre-Diluted Long Life Coolant           │
│                               │ - 1x 500ml Heavy-Duty Radiator Alkaline Flush Chemical         │
│                               │ - 1x OEM 1.1 Bar Radiator Pressure Cap                          │
│                               │ Amount: ₱1,450.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Courier Logistics     │ ORD-AUTO-12B (Pudoc Coastal Moto Delivery - Courier Entity)     │
│                               │ - Hot-shot transport of coolant jugs & flush chemicals          │
│                               │ Amount: ₱110.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Mobile Radiator Labor │ ORD-AUTO-12C (Mang Kanor Thermal Solutions - Trade Labor)       │
│                               │ - Field service: Cooldown safety triage, chemical flush, reverse│
│                               │   water purge, 15 PSI pressure decay test, vacuum bleed & test  │
│                               │ Amount: ₱850.00 | Shape: A1 Trade Labor | Settlement: Signoff   │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Mang Kanor Thermal Solutions — ORD-AUTO-12C)
1. **Cooldown & Thermal Safety Assessment:**
   * Step Key: `safety_cooldown`
   * Infrared thermometer verifies engine block cools below 50°C. Protective cloth used to relieve residual pressure. System inspected for burst heater hoses or cracked plastic radiator end-tanks.
2. **Radiator Chemical Descaling & Flush:**
   * Step Key: `chemical_flush_cycle`
   * *Gated Step.* Unlocked upon chemical delivery. Radiator drain petcock opened; rusty water discharged into catchment container. Chemical flush added with clean water. Engine run for 15 minutes with cabin heater on maximum to circulate chemical through heater core and engine water jackets.
3. **Reverse-Flow Water Purging:**
   * Step Key: `reverse_purge`
   * Lower radiator hose disconnected. Pressurized clean water back-flushed through upper hose until discharge water runs crystal clear, removing dislodged rust flakes.
4. **Radiator Pressure Decay Leak Test:**
   * Step Key: `pressure_decay_test`
   * Cooling system pressure tester hand-pumped to 15 PSI. System held under pressure for 10 minutes; dial gauge verifies zero drop in pressure, confirming head gasket and hose integrity.
5. **Vacuum Filling & 50/50 Coolant Bleeding:**
   * Step Key: `coolant_refill_bleeding`
   * Vacuum cooling refill tool pulls 25 inHg vacuum on empty cooling system, collapsing hoses. Valve opened to draw in 8 liters of 50/50 premixed coolant without introducing air pockets. New 1.1 bar radiator cap installed.
6. **Thermal Fan Activation & Sign-off:**
   * Step Key: `fan_verification_signoff`
   * Engine idled until operating temperature reaches 92°C. Scan tool verifies electric radiator cooling fans engage at low and high speeds. Temperature stabilizes; digital signoff completed.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While courier is picking up coolant and chemicals (`ORD-AUTO-12B`), Kanor allows the engine to cool down safely and inspects the thermostat and water pump weep hole.
* **Join via Dependency Gate:** Step `chemical_flush_cycle` is locked until event `ORD-AUTO-12B.delivered_to_site`.
* **Customer Approval Gate:** If the 15 PSI pressure test shows rapid pressure loss and bubbling in the radiator filler neck, indicating a blown cylinder head gasket rather than a simple boil-over, Kanor pauses work. n8n issues an alert terminating the flush to avoid filling cylinders with water, routing the customer to an engine mechanic.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF thermostat_stuck_closed == TRUE THEN
      EMIT ThermostatFailure()
      OFFER ThermostatReplacement(+₱450 OEM Thermostat, +₱200 Labor)
  ```
* **Sidecar Errand:** Lower radiator hose clamp is stripped. Buyer confirms new Need, creating child order `ORD-AUTO-12D` for an all-stainless worm-gear clamp (₱30.00).

#### 5. Child Order Escrow & Failure Mode
* **Head Gasket Abort Protection:** If the diagnostic reveals a cracked engine block or blown head gasket before chemical injection, the coolant jugs remain unopened. Sibling order `ORD-AUTO-12A`'s `PaymentObligation` is released back to the buyer, while Kanor satisfies his diagnostic and pressure testing milestone under `ORD-AUTO-12C` (₱500.00).

---

### Use Case 13: Auto Aircon Evaporator Disassembly & Freon Recharge with Expansion Valve

#### 1. Title & Real-World Municipal Scenario
* **Title:** In-Dash AC Evaporator Core Extraction, Block Expansion Valve Swap & R134a Deep Vacuum Recharge
* **Municipal Setting:** In Barangay Poblacion East, Tagudin, a Toyota Vios ride-hailing sedan experiences complete loss of cabin cooling during sweltering 36°C tropical heat. The aircon vents blow humid, warm air with a faint sweet, chemical odor of refrigerant oil. Driver Jayson books *Polar Bear Auto-Aircon Services* in Poblacion East. AC technician *Kuya Sonny* uses an electronic halogen leak detector to pinpoint an unrepairable refrigerant leak inside the dashboard evaporator core. The complex repair requires a complete interior dashboard removal, extracting the HVAC heater-evaporator box, replacing the aluminum evaporator core and block expansion valve, replacing the receiver drier, flushing lines, nitrogen pressure testing, and pulling a deep 30-minute vacuum before recharging with pure R134a freon and PAG 46 oil sourced from *Tagudin Refrigeration Supply*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-013 (Auto Aircon Evaporator Overhaul - Brgy. Poblacion East)                │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: AC Parts Sourcing     │ ORD-AUTO-13A (Tagudin Refrigeration & AC Wholesale - Merchant)   │
│                               │ - 1x Aluminum Multi-flow Evaporator Core (Toyota Vios Spec)     │
│                               │ - 1x Block Expansion Valve, 1x Desiccant Bag Receiver Drier     │
│                               │ - 2x Cans R134a Refrigerant (1kg total), 1x 250ml PAG 46 Oil    │
│                               │ Amount: ₱3,650.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Parts Runner Transit  │ ORD-AUTO-13B (Poblacion Swift Moto Runner - Courier Entity)      │
│                               │ - Transit of delicate aluminum core & freon cylinders to shop   │
│                               │ Amount: ₱100.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Specialist Auto AC    │ ORD-AUTO-13C (Polar Bear Auto-Aircon Services - Trade Labor)    │
│                               │ - Full dashboard drop, steering column lowering, HVAC box split,│
│                               │   expansion valve swap, nitrogen pressure test to 200 PSI,      │
│                               │   vacuum hold at 500 microns, calibrated R134a refrigerant fill │
│                               │ Amount: ₱2,800.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Polar Bear Auto-Aircon Services — ORD-AUTO-13C)
1. **AC System Intake & Sniffer Leak Triage:**
   * Step Key: `leak_confirmation`
   * Halogen leak sniffer probe inserted into center AC vent; alarm screams continuously. System manifold gauge connects to service ports; static pressure reads zero, proving total loss of refrigerant charge.
2. **Dashboard Disassembly & HVAC Box Drop:**
   * Step Key: `dashboard_teardown`
   * Battery disconnected. Steering column unbolted; center console, instrument cluster, passenger airbag, and main dashboard skin carefully disassembled. Engine bay expansion valve firewall bolts detached; HVAC box dropped onto clean tarp.
3. **Evaporator Core & Expansion Valve Replacement:**
   * Step Key: `core_replacement`
   * *Gated Step.* Unlocked upon parts delivery. HVAC casing split. Old corroded evaporator core pulled; bottom shows green UV dye oil staining. New aluminum core installed with new block-type thermal expansion valve. All internal rubber O-rings replaced and lubricated with fresh PAG 46 oil.
4. **Nitrogen Leak & Pressure Hold Test:**
   * Step Key: `nitrogen_pressure_test`
   * HVAC box remounted in car; line connections torqued. System pressurized with dry nitrogen gas to 200 PSI. Soapy bubble water applied to all fittings. Pressure held for 20 minutes with zero gauge drop.
5. **Deep Vacuum Evacuation:**
   * Step Key: `vacuum_evacuation`
   * Nitrogen vented. Dual-stage rotary vane vacuum pump attached. System evacuated down to 500 microns for 30 minutes to boil off all internal atmospheric moisture.
6. **Refrigerant Charging & Vent Temp Sign-off:**
   * Step Key: `charging_vent_test`
   * 450 grams of pure R134a refrigerant weighed into system using digital charging scale. Engine idled with AC on full blower. Digital probe in center air vent measures freezing 4.8°C outlet air. Dashboard reassembled without rattles; signoff completed.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While the runner is dispatched to collect the evaporator core and freon cans (`ORD-AUTO-13B`), Kuya Sonny spends the necessary 2 hours meticulously disassembling the vehicle's dashboard.
* **Join via Dependency Gate:** Step `core_replacement` is gated on event `ORD-AUTO-13B.delivered_to_site`.
* **Customer Approval Gate:** If dashboard removal exposes a leaking heater core that is bypassed or corroding, Sonny generates a photo modal offering a concurrent heater core replacement (+₱1,200.00 parts, zero extra labor since dash is already open).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF ac_compressor_clutch_magnetic_coil_burnt == TRUE THEN
      EMIT CompressorMagneticClutchDead()
      OFFER MagneticClutchReplacement(+₱1,100 Part, +₱400 Labor)
  ```
* **Sidecar Errand:** Sonny needs two green HNBR metric O-rings for the high-pressure liquid line. Buyer confirms new Need, creating child order `ORD-AUTO-13D` with its own `PaymentObligation` (₱30.00).

#### 5. Child Order Escrow & Failure Mode
* **Fragile Core Protection:** The runner must sign for the delicate aluminum evaporator core without crushed fins at pickup. If dropped during transit, Courier Node `ORD-AUTO-13B` insurance covers the cost, and the merchant issues a replacement core under a new child order without holding up Sonny's labor `PaymentObligation`.

---

### Use Case 14: Tricycle Passenger Cabin Vinyl Reupholstery & Weather Canvas Sewing

#### 1. Title & Real-World Municipal Scenario
* **Title:** Tricycle Passenger Coach Marine Vinyl Re-cushioning & Custom Heavy PVC Weather Canvas Sewing
* **Municipal Setting:** In Barangay Bitalag, Tagudin, a commuter tricycle driver's sidecar passenger cabin has tattered, foam-rotted seats and cracked vinyl upholstery that soaks passengers' clothes with rainwater during monsoon typhoons. The driver, Kuya Marlo, hires *Mang Tonying Auto-Tarp & Upholstery Works* in Bitalag. The refurbishment requires peeling the old upholstery, carving high-density polyurethane foam blocks, stapling heavy-duty waterproof marine-grade vinyl over wooden seat pans, and custom-tailoring heavy clear-PVC rain flaps and a top canopy canvas with reinforced brass eyelet grommets and nylon tie cords sourced from *Tagudin Textile & Upholstery Center*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MOTO-014 (Tricycle Cabin Reupholstery & Tarp Sewing - Brgy. Bitalag)            │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Upholstery Materials  │ ORD-MOTO-14A (Tagudin Textile & Upholstery Center - Merchant)   │
│                               │ - 3 Meters Heavy Marine-Grade Vinyl Fabric (Black/Yellow)       │
│                               │ - 1 Sheet 2-inch High-Density Polyurethane Cushion Foam         │
│                               │ - 4 Meters Heavy-Duty Clear Flexible PVC Sheet (Rain Flaps)     │
│                               │ - 1 Box Stainless Steel Air Staples, 20x Brass Eyelets/Grommets │
│                               │ Amount: ₱1,950.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Materials Runner      │ ORD-MOTO-14B (Bitalag Moto Runner - Courier Entity)             │
│                               │ - Transport bulky foam rolls & vinyl fabric to upholstery shop   │
│                               │ Amount: ₱120.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Master Upholsterer    │ ORD-MOTO-14C (Mang Tonying Auto-Tarp & Upholstery - Trade Labor)│
│                               │ - Old foam stripping, plywood base inspection, foam sculpting,  │
│                               │   pneumatic vinyl stapling, heavy-duty industrial walking foot  │
│                               │   sewing of rain curtains, grommet punch press installation     │
│                               │ Amount: ₱1,400.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Mang Tonying Auto-Tarp & Upholstery Works — ORD-MOTO-14C)
1. **Intake & Pattern Measurement:**
   * Step Key: `pattern_measurement`
   * Tricycle sidecar seat bases, backrests, and roof canopy measured with tailor's tape. Clear PVC rain flap drop points and passenger door opening clearance drafted onto pattern paper.
2. **Stripping Old Seats & Wood Rot Inspection:**
   * Step Key: `stripping_teardown`
   * Rusty staples pried loose with tack puller. Mildewed rotting foam peeled from wooden seat pans. Marine plywood bases inspected for termite damage and structural integrity.
3. **Foam Carving & Cushion Contouring:**
   * Step Key: `foam_fabrication`
   * *Gated Step.* Unlocked upon foam delivery. 2-inch high-density foam marked and sliced with electric foam carving knife to provide ergonomic lumbar and thigh support for passengers.
4. **Marine Vinyl Stretching & Pneumatic Stapling:**
   * Step Key: `vinyl_upholstering`
   * Marine vinyl cut with 2-inch seam margins. Vinyl stretched taut over foam cushions using webbing pliers. Fastened to underside of plywood bases using 71-series stainless steel pneumatic staples at 10mm intervals.
5. **Industrial Machine Sewing of PVC Rain Flaps:**
   * Step Key: `canvas_sewing`
   * Clear PVC sheet and weather canvas stitched together on heavy-duty walking-foot industrial sewing machine using bonded nylon UV-resistant thread. Heavy hem edges folded twice. Brass grommets punched along top edge using manual arbor eyelet press.
6. **Installation, Snap Fitting & Customer Sign-off:**
   * Step Key: `fitting_signoff`
   * Finished cushioned seats bolted back into tricycle cabin. Weather canvas and roll-up rain flaps tied to sidecar roof frame with bungee ties. Kuya Marlo inspects stitching and water repellency; signs digital completion.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While runner travels to town to buy vinyl and foam (`ORD-MOTO-14B`), Tonying strips the old seats and cleans the cabin frame.
* **Join via Dependency Gate:** Step `foam_fabrication` waits on n8n state `ORD-MOTO-14B.delivered_to_site`.
* **Customer Approval Gate:** If stripping old seats reveals that the marine plywood seat base is rotted through and crumbling, Tonying cannot staple new vinyl. n8n issues an approval prompt for a new 1/2-inch marine plywood base (+₱350.00 parts + ₱100.00 carpentry cut fee).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF passenger_cabin_roof_sheet_metal_rusted_through == TRUE THEN
      EMIT RoofSheetMetalCorrosion()
      OFFER RoofPatchAndSeal(+₱300 Labor, +₱150 Sealant/Plate)
  ```
* **Sidecar Errand:** Tonying runs out of heavy bonded V-69 nylon sewing thread. Buyer approves new Need, spawning child order `ORD-MOTO-14D` for a spool of thread (₱45.00).

#### 5. Child Order Escrow & Failure Mode
* **Material Integrity Isolation:** If the runner's trike is caught in mud and soils the vinyl rolls, the runner's logistics insurance pays for dry-cleaning or fabric replacement. Tonying's labor `PaymentObligation` remains untouched, resuming as soon as clean fabric is on the work table.

---

### Use Case 15: Fleet Tricycle Mandatory Barangay Roadworthiness Inspection & Tuning

#### 1. Title & Real-World Municipal Scenario
* **Title:** Barangay TODA Tricycle Annual Roadworthiness Compliance Inspection, Exhaust Decibel Audit & Tune-Up
* **Municipal Setting:** In Barangay Quirino, Tagudin, the local Tricycle Operators and Drivers Association (TODA) conducts its annual roadworthiness preparation before members submit renewal applications to the Municipal Licensing Office. Tricycle fleet operator Mang Gorio owns four commercial tricycles that must meet safety criteria: headlight luminous intensity, exhaust noise decibel limits (<90 dB), brake stopping distance, wheel alignment, and smoke emissions. Mang Gorio books certified small-engine technician and TODA-accredited mechanic *Dan Fleet Audit & Tuning* to perform a structured 15-point pre-franchise inspection checklist and comprehensive tune-up. The technician uses calibrated decibel meters, a digital lux meter, replacement NGK spark plugs, and air filter elements sourced from *Tagudin Central Moto Spares*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-FLEET-015 (Fleet Tricycle Compliance & Tuning - Brgy. Quirino)                   │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Tune-Up Parts Supply  │ ORD-FLT-15A (Tagudin Central Moto Spares - Merchant)             │
│                               │ - 4x Genuine NGK C7HSA Spark Plugs, 4x Foam Air Filter Inserts  │
│                               │ - 2x 2T/4T Carburetor Cleaner Spray, 4x Headlight Halogen Bulbs │
│                               │ Amount: ₱1,100.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Delivery Courier      │ ORD-FLT-15B (Quirino Express Delivery - Courier Entity)         │
│                               │ - Courier transit of tune-up package to TODA terminal           │
│                               │ Amount: ₱90.00 | Shape: A4 Transit | Settlement: `delivered`    │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Technical Audit/Tuning│ ORD-FLT-15C (Dan Fleet Audit & Tuning - Trade Labor Entity)     │
│                               │ - 15-Point TODA Technical Safety Inspection on 4 vehicles:      │
│                               │   Decibel exhaust meter test, lux headlight check, brake test,  │
│                               │   carburetor cleaning & idle mixture tuning, emissions check,   │
│                               │   digital pre-inspection checklist dossier generation           │
│                               │ Amount: ₱2,000.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Dan Fleet Audit & Tuning — ORD-FLT-15C)
1. **Fleet Intake & Static Safety Audit:**
   * Step Key: `static_safety_audit`
   * 4 tricycles lined up at TODA terminal. Frame numbers and engine numbers verified against registration records. Horn, turn signals, brake lights, and tire tread depths checked against 1.6mm threshold.
2. **Headlight Lux & Alignment Test:**
   * Step Key: `photometric_audit`
   * Digital lux meter placed 5 meters in front of each vehicle. High and low beam intensity measured (target: >10,000 candela). Headlight beam angle adjusted to prevent blinding oncoming traffic.
3. **Exhaust Decibel Sound Level Audit:**
   * Step Key: `acoustic_exhaust_test`
   * Calibrated Type-2 sound level meter positioned at 45° angle, 0.5 meters from exhaust tip. Engine revved to 3,500 RPM. Unit #3 fails at 96 dBA due to a deteriorated muffler baffle packing.
4. **Carburetor Cleaning & Ignition Overhaul:**
   * Step Key: `engine_tuneup`
   * *Gated Step.* Unlocked upon parts arrival. Carburetors sprayed and cleaned. Fresh NGK spark plugs gapped to 0.7mm and installed. Air filter sponges oiled and seated. Idle air-fuel mixture screws tuned for clean combustion.
5. **Muffler Acoustic Remediation (Unit #3):**
   * Step Key: `acoustic_remediation`
   * Baffle repacked with steel wool and fiberglass packing to bring noise emission down to a compliant 86 dBA.
6. **Technical Checklist Dossier & Sign-off:**
   * Step Key: `compliance_signoff`
   * Inspector generates an evidence-backed digital pre-inspection dossier with attached audio/photometric logs. Mang Gorio signs mobile signoff; dossier is exported for Mang Gorio to present to the Barangay Hall and Tagudin Municipal Licensing Office.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While the courier delivers the tune-up parts (`ORD-FLT-15B`), Dan conducts electrical and photometric tests on all four vehicles.
* **Join via Dependency Gate:** Step `engine_tuneup` waits on event `ORD-FLT-15B.delivered_to_site`.
* **Customer Approval Gate:** If Unit #2 fails the brake stopping distance test due to a bent brake pedal linkage, n8n flags a remediation gate requiring Mang Gorio to approve an emergency linkage realignment (₱200.00).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF tricycle_chassis_vin_stamp_corroded_or_mismatched == TRUE THEN
      EMIT ChassisNumberMismatchNotice()
      FLAG VehicleInspectionHalt()
      NOTE RequireOperatorVerificationBeforeSignoff()
  ```
* **Sidecar Errand:** Unit #4 has a burned out dual-contact 12V brake light bulb. Buyer confirms new Need, spawning child order `ORD-FLT-15D` for a replacement bulb (₱25.00).

#### 5. Child Order Escrow & Failure Mode
* **Per-Vehicle Granular Settlement:** If 3 tricycles pass inspection and tuning but 1 tricycle requires major engine rebuilding, the order does not fail universally. The `PaymentObligation` for the 3 completed inspections and tune-ups settles immediately; the failing vehicle is placed on a re-test hold without penalizing the mechanic.

---

### Use Case 16: Motorcycle Clutch Plate Slipping Replacement with Synthetic Oil Change

#### 1. Title & Real-World Municipal Scenario
* **Title:** Underbone Clutch Pack Friction Disc Replacement, Damper Spring Inspection & JASO MA2 Oil Change
* **Municipal Setting:** In Barangay Bio, Tagudin, a motorcycle courier riding a Honda Wave 110 semi-automatic commuter motorcycle experiences severe clutch slippage: when climbing steep highway bridges or twisting the throttle under load, the engine revs loudly but the rear wheel fails to accelerate proportionally. Mechanic *Ramil Moto-Works* in Bio diagnoses worn friction clutch plates and tired centrifugal clutch shoe springs. The repair requires dropping the right crankcase engine cover, replacing five friction plates, changing centrifugal clutch weight springs, replacing the clutch cover paper gasket, and refilling the crankcase with genuine JASO MA2 10W-30 motorcycle oil sourced from *Tagudin Central Motor Supply*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MOTO-016 (Clutch Plate Replacement & Oil Change - Brgy. Bio)                     │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Clutch Parts Sourcing │ ORD-MOTO-16A (Tagudin Central Motor Supply - Merchant)          │
│                               │ - 1x Set (5 pcs) High-Friction FCC Clutch Plates                │
│                               │ - 1x Right Crankcase Cover Gasket, 1x Centrifugal Spring Set    │
│                               │ - 1L Honda Genuine JASO MA2 10W-30 4T Motorcycle Engine Oil     │
│                               │ Amount: ₱880.00 | Shape: A4 Product | Settlement: `collected`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Courier Logistics     │ ORD-MOTO-16B (Bio Swift Moto Express - Courier Entity)          │
│                               │ - Rapid transport of clutch plates & oil to Bio workshop        │
│                               │ Amount: ₱80.00 | Shape: A4 Transit | Settlement: `delivered`    │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Specialist Mechanic   │ ORD-MOTO-16C (Ramil Moto-Works - Trade Labor Entity)            │
│                               │ - Oil drain, footrest/exhaust pipe removal, right cover drop,   │
│                               │   special locknut clutch basket extraction, plate soak, clutch  │
│                               │   spring tension measurement, centrifugal shoe deglazing, tuning│
│                               │ Amount: ₱550.00 | Shape: A1 Trade Labor | Settlement: Signoff   │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Ramil Moto-Works — ORD-MOTO-16C)
1. **Intake & Clutch Slip Confirmation:**
   * Step Key: `clutch_slip_triage`
   * Motorcycle placed on stand. High-gear stall test conducted: with rear brake held tight, clutch engaged in 3rd gear; engine continues running instead of stalling immediately, confirming severe clutch slippage.
2. **Exhaust Pipe & Crankcase Cover Removal:**
   * Step Key: `crankcase_teardown`
   * Engine oil drained into clean pan. Exhaust header pipe and footrest assembly dropped. Right-side crankcase cover bolts removed in cross pattern. Cover gently tapped with rubber mallet to separate without marring surfaces.
3. **Centrifugal & Primary Clutch Basket Disassembly:**
   * Step Key: `clutch_basket_disassembly`
   * Special 4-prong castle locknut socket unbolts oil filter rotor and primary clutch hub. Clutch basket pulled; friction plates inspected. Friction material burned down to smooth steel cores (0.8mm thick; spec: >2.6mm).
4. **Friction Plate Oil Soaking:**
   * Step Key: `plate_oil_soaking`
   * *Gated Step.* Unlocked upon oil and parts delivery. New FCC friction plates pre-soaked in fresh engine oil for 20 minutes to saturate cork-paper material and prevent dry-burn during initial startup.
5. **Clutch Stack Assembly & Centrifugal Shoe Deglazing:**
   * Step Key: `clutch_reassembly`
   * Clutch plates and steel drive plates stacked alternately into clutch basket. Clutch pressure plate springs torqued to 12 N·m. Centrifugal clutch shoes lightly sanded with 320-grit paper to remove glaze. New crankcase gasket fitted dry. Cover torqued.
6. **Fresh Oil Fill, Clutch Free-Play Adjustment & Sign-off:**
   * Step Key: `oil_fill_adjustment_signoff`
   * 1.0L of 10W-30 JASO MA2 oil poured in. External clutch adjuster screw turned clockwise until slight resistance is felt, then backed off 1/8 turn and locked with jam nut. Road test confirms crisp acceleration and smooth gear changes. Signoff completed.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While courier is en route (`ORD-MOTO-16B`), Ramil drains the oil, unbolts footrests and exhaust, and strips the old paper gasket from crankcase mating surfaces.
* **Join via Dependency Gate:** Step `plate_oil_soaking` is locked until event `ORD-MOTO-16B.delivered_to_site`.
* **Customer Approval Gate:** If the clutch basket aluminum slots are heavily notched from plate tang impacts, preventing smooth disengagement, Ramil files an approval card to either file notches smooth (₱100.00) or replace the clutch basket outer hub (₱650.00).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF centrifugal_one_way_clutch_bearing_seized == TRUE THEN
      EMIT OneWayBearingLocked()
      OFFER SpragBearingReplacement(+₱250 Part, +₱100 Labor)
  ```
* **Sidecar Errand:** Oil drain plug crush washer is deformed and leaking. Buyer confirms new Need, creating child order `ORD-MOTO-16D` for an aluminum crush washer (₱15.00).

#### 5. Child Order Escrow & Failure Mode
* **Contaminated Oil Protection:** If the merchant delivers non-motorcycle automotive oil containing friction modifiers (which ruin wet clutches), mechanic Ramil rejects delivery at the gate. Sibling order `ORD-MOTO-16A` is placed on redelivery status; the merchant covers runner exchange costs without touching Ramil's labor `PaymentObligation`.

---

### Use Case 17: Car Front Suspension Ball Joint & Tie Rod Replacement with Wheel Alignment

#### 1. Title & Real-World Municipal Scenario
* **Title:** Front MacPherson Strut Lower Ball Joint, Tie Rod End Replacement & Manual Trammel Alignment
* **Municipal Setting:** In Barangay Ambalayat, Tagudin, a farmer's pickup utility vehicle (Toyota Hilux Workmate) operating on rutted, rocky farm-to-market feeder roads develops severe front-end metallic clunking over potholes, wandering steering, and rapid inside tire shoulder wear. Upland mobile mechanic *Lito Suspension Tech* inspects the vehicle and identifies torn dust boots and excessive radial play in both lower ball joints and outer tie rod ends. The repair requires high-strength ball joints, outer tie rod ends, and grease from *Tagudin Auto Parts*, on-demand courier transport to Ambalayat, and on-site manual optical/trammel-bar toe-in steering alignment.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-017 (Suspension Ball Joint & Alignment - Brgy. Ambalayat)                   │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Suspension Parts Depot│ ORD-AUTO-17A (Tagudin Auto Parts & Hardware - Merchant)         │
│                               │ - 2x Heavy-Duty 555 Lower Ball Joints (Hilux Spec)              │
│                               │ - 2x Outer Tie Rod Ends, 4x Stainless Steel Cotter Pins         │
│                               │ - 1 Tube High-Pressure Moly Lithium Chassis Grease              │
│                               │ Amount: ₱2,600.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Upland Courier Transit│ ORD-AUTO-17B (Ambalayat Mountain Moto Courier - Courier Entity) │
│                               │ - Transport heavy suspension hardware to upland farm            │
│                               │ Amount: ₱160.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Suspension Specialist │ ORD-AUTO-17C (Lito Suspension Tech - Trade Labor Entity)        │
│                               │ - Wheel removal, ball joint press extraction, pickle fork tie   │
│                               │   rod separation, torquing castellated nuts to 90 N·m, ball     │
│                               │   joint grease injection, trammel bar toe-in wheel alignment    │
│                               │ Amount: ₱1,400.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Lito Suspension Tech — ORD-AUTO-17C)
1. **Suspension Shake & Play Inspection:**
   * Step Key: `suspension_shake_triage`
   * Front axle jacked onto safety stands. 6-foot pry bar wedged under front tires; vertical levering reveals 5mm play in lower ball joint sockets. Steering wheel wiggled; tie rod ends exhibit visible slop.
2. **Component Disassembly & Separation:**
   * Step Key: `component_demounting`
   * Wheels removed. Cotter pins sheared; castellated nuts backed off. Mechanical ball joint separator tool pops tie rod ball studs from steering knuckle without damaging taper seat.
3. **Ball Joint Press Extraction:**
   * Step Key: `ball_joint_pressing`
   * Lower control arm unbolted. Heavy-duty C-frame screw press tool presses worn lower ball joints out of control arm eyes. Control arm bore cleaned and inspected for egg-shaped deformation.
4. **New Ball Joint & Tie Rod Installation:**
   * Step Key: `component_installation`
   * *Gated Step.* Unlocked upon parts delivery. New 555 ball joints pressed into control arms until circlip snaps into locking groove. Outer tie rod ends threaded onto inner rods, matching exact measured thread turns. Castellated nuts torqued to 90 N·m; new cotter pins locked.
5. **Chassis Grease Injection:**
   * Step Key: `grease_injection`
   * Lever grease gun clamped to grease zerk fittings. Moly grease pumped in until rubber dust boots swell slightly without blowing out seal lips.
6. **Trammel Bar Toe-In Alignment & Sign-off:**
   * Step Key: `wheel_alignment_signoff`
   * Wheels remounted; truck rolled forward 5 meters to settle suspension. Precision trammel alignment bar measures front-to-rear tire centerline distance. Tie rod sleeves adjusted until toe-in is set to 2mm. Steering wheel centered; test driven on rocky road; signoff completed.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While parts courier rides to the upland farm (`ORD-AUTO-17B`), Lito jacks the truck, removes wheels, and presses out old seized ball joints.
* **Join via Dependency Gate:** Step `component_installation` is locked until event `ORD-AUTO-17B.delivered_to_site`.
* **Customer Approval Gate:** If tie rod removal reveals that steering rack inner tie rods (*rack ends*) also have internal socket play, Lito flags an approval modal to approve replacement rack ends (+₱1,100.00 parts).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF wheel_hub_bearing_rough_or_noisy == TRUE THEN
      EMIT HubBearingWearDetected()
      OFFER HubBearingPacking(+₱350 Labor, +₱150 Seals)
  ```
* **Sidecar Errand:** One castle nut has damaged metric fine threads. Buyer confirms new Need, creating child order `ORD-AUTO-17D` for a high-tensile grade-10 castle nut (₱40.00).

#### 5. Child Order Escrow & Failure Mode
* **Independent Transit Liability:** If heavy rains turn the upland mountain trail to mud and the courier is delayed by 40 minutes, the gate holds safely under `weather_delay`. Lito's labor order cannot be cancelled without paying his earned triage milestone under `ORD-AUTO-17C` if the owner decides to abort.

---

### Use Case 18: Marine Bilge Pump Wiring & Battery Solar Trickle Charger for Fishing Boat

#### 1. Title & Real-World Municipal Scenario
* **Title:** Inboard Fishing Boat 12V 1100GPH Automatic Bilge Pump System & Marine Solar Trickle Charger Installation
* **Municipal Setting:** At the fishing harbor in Barangay Farola, Tagudin, commercial fisherman Mang Romy moors his 26-foot motorized fishing banca in tidal salt water. During heavy monsoon rainstorms, rainwater accumulates in the hull bilge, threatening to sink the vessel at its mooring when unattended. Marine electrical specialist *Sparky Maritime Systems* is contracted to install a rugged 12V 1100 GPH automatic submersible bilge pump with an integrated solid-state float switch, marine tinned-copper wiring, a dash-mounted Manual-Off-Auto illuminated rocker switch, and a 50W monocrystalline marine solar panel with a waterproof MPPT solar charge controller to keep the deep-cycle battery topped up continuously against the corrosive marine environment. Parts are sourced from *Tagudin Marine & Solar Depot*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-MAR-018 (Marine Bilge Pump & Solar Installation - Brgy. Farola)                  │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Marine Electrical Spares│ ORD-MAR-18A (Tagudin Marine & Solar Depot - Merchant)         │
│                               │ - 1x 12V 1100 GPH Submersible Bilge Pump w/ Float Switch        │
│                               │ - 1x 50W Marine Grade Rigid Monocrystalline Solar Panel         │
│                               │ - 1x Waterproof 10A IP67 Solar Charge Controller                │
│                               │ - 15m 14-AWG Marine Tinned Copper Duplex Wire, Heatshrink Crimp │
│                               │ - 1x 3-Way Marine Rocker Switch Panel, 2m 1-1/8" Bilge Hose     │
│                               │ Amount: ₱3,850.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Harbor Delivery Runner│ ORD-MAR-18B (Farola Harbor Express - Courier Entity)            │
│                               │ - Transport solar panel & marine hardware to boat landing       │
│                               │ Amount: ₱130.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Marine Electrician    │ ORD-MAR-18C (Sparky Maritime Systems - Trade Labor Entity)      │
│                               │ - Bilge pump mounting, hull thru-hull discharge port drilling,  │
│                               │   anti-siphon loop installation, solar bracket fabrication,     │
│                               │   tinned wire routing, heat-shrink marine terminal crimping     │
│                               │ Amount: ₱1,600.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Sparky Maritime Systems — ORD-MAR-18C)
1. **Hull Layout & Bilge Sump Triage:**
   * Step Key: `bilge_layout_triage`
   * Lowest point of boat wooden hull (*kasko*) located. Deepest bilge pocket cleared of wood shavings and sand. Thru-hull discharge location selected 300mm above water line.
2. **Thru-Hull Fitting Drilling & Hose Routing:**
   * Step Key: `thru_hull_installation`
   * Hole saw cuts 1-1/8" hole through wooden topside hull. Marine bronze thru-hull fitting bedded in polyurethane marine adhesive sealant (3M 5200) and tightened. Flexible ribbed bilge hose routed with high anti-siphon loop to prevent wave back-siphoning.
3. **Bilge Pump Base Mounting & Wiring:**
   * Step Key: `pump_installation`
   * *Gated Step.* Unlocked upon parts arrival. Bilge pump strainer base plate screwed to hardwood mounting pad in bilge sump. 14-AWG marine tinned duplex wire routed through PVC conduit along gunwales. Connections sealed with dual-wall adhesive-lined heat shrink crimp connectors.
4. **Switch Panel & Battery Fuse Integration:**
   * Step Key: `switch_battery_wiring`
   * Manual-Off-Auto rocker switch installed in cockpit console. In-line waterproof marine blade fuse holder (5A) installed directly at battery positive terminal to ensure circuit protection.
5. **Solar Panel & MPPT Controller Mounting:**
   * Step Key: `solar_charging_setup`
   * 50W solar panel mounted to bamboo roof canopy using stainless U-bolts. IP67 waterproof charge controller wired to battery; LCD status confirms active solar charging at 14.4V bulk absorption.
6. **Water Submersion Float Test & Sign-off:**
   * Step Key: `system_commissioning_signoff`
   * 20 liters of seawater dumped into bilge sump. Float switch automatically lifts; pump activates instantly, discharging water overboard in 25 seconds. Manual override tested. Mang Romy completes digital signoff.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While courier delivers the solar panel and pump (`ORD-MAR-18B`), marine electrician drills the hull and mounts the bronze thru-hull fitting.
* **Join via Dependency Gate:** Step `pump_installation` is locked until event `ORD-MAR-18B.delivered_to_site`.
* **Customer Approval Gate:** If testing the boat's battery reveals a dead cell that cannot accept solar charging, the electrician triggers an approval card to supply a deep-cycle marine battery (₱3,200.00).
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF boat_bilge_hardwood_stringer_rotten == TRUE THEN
      EMIT WoodRotDetected(structural_compromise)
      OFFER MarineEpoxyHardwoodBackingPlate(+₱350 Labor, +₱200 Epoxy)
  ```
* **Sidecar Errand:** Electrician needs stainless 316 marine wood screws. Buyer confirms new Need, creating child order `ORD-MAR-18D` for 12 screws (₱50.00).

#### 5. Child Order Escrow & Failure Mode
* **Harbor Weather Safety:** If a storm surge forces the boat to move to an inland mangrove estuary, the order enters a `harbor_storm_standby` state. Neither the electrician nor the merchant suffers payment cancellation; obligations stay isolated.

---

### Use Case 19: Vehicle Ceramic Paint Coating with 2-Stage Scratch Compound Machine Polish

#### 1. Title & Real-World Municipal Scenario
* **Title:** Full Vehicle 2-Stage Paint Correction, Heavy Scratch Rotary Compounding & 9H Ceramic Quartz Coating
* **Municipal Setting:** In Barangay Poblacion Norte, Tagudin, an owner's modern compact SUV (Ford Everest) has heavily oxidized clear coat, dense spider-web wash swirls, and deep branch scratches from driving through narrow agricultural mountain trails. The owner wants full professional paint rejuvenation and ceramic protection before the rainy season. Professional mobile detailer *Pro-Shine Auto Detailing Studio* in Poblacion Norte is booked. The intensive detailing job requires iron fallout chemical decontamination, clay bar treatment, 2-stage machine paint correction (rotary wool heavy compounding followed by dual-action foam finishing polish), isopropyl alcohol panel wipe down, and hand application of professional 9H ceramic quartz coating sourced from *Tagudin Auto Care Specialty Depot*.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-AUTO-019 (Ceramic Paint Coating & Paint Correction - Brgy. Poblacion Norte)      │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Detailing Supplies    │ ORD-AUTO-19A (Tagudin Auto Care Specialty Depot - Merchant)     │
│                               │ - 1x 50ml 9H Ceramic Quartz Coating Kit with Applicator Block   │
│                               │ - 1L Heavy Cut Micro-Abrasive Compound, 1L Micro-Finishing Polish│
│                               │ - 1 Bottle (500ml) pH-Neutral Iron Fallout Remover Gel          │
│                               │ - 1x Fine Grade Detailing Clay Bar, 5x Edgeless Microfiber Towels│
│                               │ Amount: ₱3,200.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Courier Logistics     │ ORD-AUTO-19B (Poblacion Detail Courier - Courier Entity)        │
│                               │ - Careful transit of delicate ceramic coating chemicals         │
│                               │ Amount: ₱90.00 | Shape: A4 Transit | Settlement: `delivered`    │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Master Detailer Labor │ ORD-AUTO-19C (Pro-Shine Auto Detailing Studio - Trade Labor)    │
│                               │ - Complete detailing: 2-bucket foam decontam wash, iron melt,   │
│                               │   clay sweep, masking, stage-1 rotary wool cut, stage-2 DA foam │
│                               │   finish, IPA wipe, ceramic wipe/buff, IR bake inspection       │
│                               │ Amount: ₱3,500.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Pro-Shine Auto Detailing Studio — ORD-AUTO-19C)
1. **Decontamination Wash & Iron Chemical Melt:**
   * Step Key: `decontamination_wash`
   * High-pressure foam wash removes surface grit. Color-changing iron fallout chemical sprayed on paint; turns dark purple as it dissolves embedded brake dust and metallic rail dust. Rinsed with de-ionized water.
2. **Clay Bar Treatment & Paint Thickness Gauge Audit:**
   * Step Key: `clay_paint_gauge_audit`
   * Lubricated fine clay bar rubbed over all panels to remove stubborn tree sap and road tar. Digital ultrasonic paint depth gauge records clear coat thickness across all panels (averaging 115 microns; safe for compounding).
3. **Stage-1 Heavy Rotary Machine Compounding:**
   * Step Key: `stage_1_rotary_cutting`
   * *Gated Step.* Unlocked upon polishing compound delivery. Plastic trim and rubber weatherstrips taped with 3M automotive masking tape. Rotary polisher with twisted wool pad and micro-abrasive compound worked at 1,400 RPM to eliminate deep scratches, sanding marks, and oxidation.
4. **Stage-2 Dual-Action Polish & Swirl Elimination:**
   * Step Key: `stage_2_da_finishing`
   * Dual-action random orbital polisher fitted with soft yellow foam finishing pad and jewel polish compound worked at speed 4 to remove compounding haze and rotary holograms, bringing paint to deep mirror gloss.
5. **Panel Wipe Degreasing (IPA):**
   * Step Key: `panel_degreasing_wipe`
   * Panels wiped twice with 30% Isopropyl Alcohol (IPA) solvent solution to dissolve all polishing oils and fillers, exposing bare, squeaky-clean clear coat for maximum ceramic chemical bonding.
6. **9H Ceramic Coating Application & Inspection:**
   * Step Key: `ceramic_application_signoff`
   * Ceramic quartz liquid dripped onto suede-wrapped applicator block. Applied in cross-hatch 2x2 foot sections. Left to flash for 90 seconds until rainbow oil slick appearance forms. Buffed off with virgin edgeless microfiber towels. High-CRI LED inspection light verifies zero high spots or streaks. 12-hour infrared bake cure; customer signs acceptance.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While courier is en route with ceramic chemicals (`ORD-AUTO-19B`), the detailer performs the 2-bucket wash, iron fallout decontamination, and clay bar process.
* **Join via Dependency Gate:** Step `stage_1_rotary_cutting` is gated on event `ORD-AUTO-19B.delivered_to_site`.
* **Customer Approval Gate:** If paint thickness gauge reveals a previously repainted panel with dangerously thin clear coat (<65 microns), aggressive compounding will burn through to the base coat. n8n issues an alert recommending that panel receive light polishing only.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF paint_has_deep_scratches_down_to_bare_primer == TRUE THEN
      EMIT PrimerLevelScratchDetected()
      OFFER SpotAirbrushTouchUpPaint(+₱450 Labor, +₱200 Paint)
  ```
* **Sidecar Errand:** Detailer runs low on 3M automotive masking tape. Buyer confirms new Need, creating child order `ORD-AUTO-19D` for 3 rolls of tape (₱120.00).

#### 5. Child Order Escrow & Failure Mode
* **Defective Coating Fluid Protection:** If the glass ceramic coating bottle arrives unsealed or prematurely crystallized, the detailer rejects the chemical at the gate. Node `ORD-AUTO-19A` is flagged for instant merchant swap. The detailer's stage-1 and stage-2 polishing progress is preserved and protected under their `PaymentObligation`.

---

### Use Case 20: Hydraulic Dump Truck Piston Seal Leak Repair with Industrial Hose Crimping

#### 1. Title & Real-World Municipal Scenario
* **Title:** Heavy 10-Wheeler Dump Truck Hydraulic Tipping Ram Seal Overhaul & High-Pressure Hose Crimping
* **Municipal Setting:** At an aggregate river quarry in Barangay Bitalag, Tagudin, an Isuzu Giga 10-wheeler gravel dump truck suffers a sudden hydraulic failure while unloading river sand: high-pressure hydraulic oil blows out of the main telescoping hoist cylinder packing nut, and a 2-wire braided hydraulic feed hose ruptures under 210 bar pressure, spilling oil and leaving the heavy dump bed stuck half-raised. The quarry operator hires heavy mobile equipment specialist *V-Tech Hydraulic Field Services*. The high-risk repair requires mobile hoist crane support to secure the dump bed, dismounting the leaking hydraulic cylinder, replacing multi-stage polyurethane V-packing chevron seals, and dispatching a courier to an industrial lathe and hydraulic crimping shop in town to crimp a custom 3/4-inch 2-wire R2AT high-pressure hydraulic hose with BSP female fittings, along with 20 liters of ISO VG 68 hydraulic fluid.

#### 2. Macro Deal Chain: Coordinated Independent Nodes
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-HVY-020 (Dump Truck Hydraulic Ram & Hose Repair - Brgy. Bitalag Quarry)         │
├───────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Node 1: Hydraulic Seal Depot  │ ORD-HVY-20A (Tagudin Industrial Seals & Lubricants - Merchant)  │
│                               │ - 1x Multi-Stage Polyurethane Hydraulic Cylinder V-Packing Set  │
│                               │ - 1x Piston Wiper Seal, 1x Piston Wear Ring                     │
│                               │ - 1x 20L Pail ISO VG 68 Anti-Wear Heavy Hydraulic Oil          │
│                               │ Amount: ₱4,500.00 | Shape: A4 Product | Settlement: `collected` │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 2: Mobile Courier Transit│ ORD-HVY-20B (Bitalag Heavy Trike Cargo - Courier Entity)        │
│                               │ - Transport 20L oil pail and seal kits to quarry site           │
│                               │ Amount: ₱200.00 | Shape: A4 Transit | Settlement: `delivered`   │
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 3: Specialized Crimping  │ ORD-HVY-20C (Ilocos Industrial Hose Crimping - Machine Shop)    │
│                               │ - Custom fabrication & hydraulic crimping of 3/4" 2-wire R2AT   │
│                               │   braided hose (2.2m length) with 3/4" BSP swaged swivel ends   │
│                               │ Amount: ₱1,850.00 | Shape: A3 Specialist | Settlement: `crimped`│
├───────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Node 4: Heavy Equipment Tech  │ ORD-HVY-20D (V-Tech Hydraulic Field Services - Trade Labor)     │
│                               │ - Full field service: Dump bed safety prop lock, cylinder drop, │
│                               │   gland nut disassembly, seal pack replacement, hose routing,   │
│                               │   hydraulic oil refill, 250 bar pressure relief calibration     │
│                               │ Amount: ₱3,500.00 | Shape: A1 Trade Labor | Settlement: Signoff │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (V-Tech Hydraulic Field Services — ORD-HVY-20D)
1. **Quarry Site Safety Lockout & Dump Bed Prop:**
   * Step Key: `safety_lockout_bed_prop`
   * Critical safety protocol: heavy steel mechanical safety support props positioned between truck chassis and raised dump bed to eliminate crush hazards. Hydraulic pump PTO disengaged. Residual pressure bled to tank.
2. **Hydraulic Cylinder & Ruptured Hose Extraction:**
   * Step Key: `cylinder_hose_demount`
   * Ruptured 3/4" hose unbolted and measured for length and fitting angles. Hoist ram lower trunnion pin and upper crosshead pin hammered out. Telescoping cylinder lifted and placed on clean timber cribbing.
3. **Cylinder Gland Teardown & Inspection:**
   * Step Key: `cylinder_gland_teardown`
   * Heavy spanner wrench unscrews cylinder gland cap. Telescoping chrome stages pulled. Extruded, shredded polyurethane chevron seals extracted. Chrome cylinder rods inspected for gouges, pitting, or bends.
4. **Hose Sourcing & Machine Shop Crimping Dispatch:**
   * Step Key: `hose_crimping_dispatch`
   * Sample ruptured hose handed to courier with exact length and swivel orientation specs for dispatch to Ilocos Industrial Hose Crimping shop.
5. **New Seal Pack Installation & Piston Repacking:**
   * Step Key: `seal_installation_cylinder_reassembly`
   * *Gated Step.* Unlocked upon seal kit delivery. New polyurethane chevron V-packing seals and nitrile energizers lubricated with clean hydraulic oil and fitted in correct orientation. Dust wiper pressed into gland. Cylinder stages reassembled and gland nut torqued to 350 N·m with threadlock.
6. **Crimped Hose Installation, Oil Fill, Pressure Test & Sign-off:**
   * Step Key: `hose_install_pressure_testing`
   * *Gated Step.* Newly crimped 2-wire hose installed and routed with protective anti-abrasion spiral sleeve. 20L of ISO VG 68 hydraulic oil poured into tank. PTO engaged. Dump bed cycled up and down 5 times under full 15-ton gravel load. Pressure gauge confirms clean 210 bar relief valve cutoff with zero leaks. Quarry manager signs digital release.

#### 4. n8n Conditional Logic & Gates
* **Parallel Fork:** While the courier transports the hose to town for hydraulic crimping (`ORD-HVY-20C`), the field mechanic tears down the telescoping cylinder and replaces the V-packing seals on-site.
* **Join via Dependency Gate:** Step `hose_install_pressure_testing` is gated until both events `ORD-HVY-20B.delivered_to_site` (seals/oil) and `ORD-HVY-20C.crimped_and_delivered` are verified in n8n.
* **Customer Approval Gate:** If inspecting the chrome telescoping rod reveals a deep structural gouge that will tear new seals immediately, requiring hydraulic rod resurfacing or a replacement stage (₱4,500.00), n8n triggers an instant managerial approval gate.
* **Diagnostic Pause / Scope Variance:**
  ```text
  IF hydraulic_gear_pump_shows_metal_cavitation_shavings == TRUE THEN
      EMIT HydraulicPumpFailureDetected()
      OFFER HydraulicPumpRebuild(+₱1,800 Labor, +₱3,200 Pump)
  ```
* **Sidecar Errand:** Field mechanic needs four 3/4" bonded Dowty copper-rubber seal washers. Buyer confirms new Need, spawning child order `ORD-HVY-20E` for washers (₱80.00).

#### 5. Child Order Escrow & Failure Mode
* **Quarry Site Failure Isolation:** If the machine shop mis-crimps the hose fitting angle, Node `ORD-HVY-20C` is held liable for an immediate free re-crimp. The field mechanic's labor `PaymentObligation` under `ORD-HVY-20D` is NOT penalized, and the merchant's 20L oil payment `ORD-HVY-20A` remains locked and intact. Each child obligation maintains strict bilateral isolation under the Serbizyu 2.0 architecture contract.

---

### Architectural Verification Summary Matrix

| Case # | Sector / Vehicle | Macro Chain Nodes | Public References | Primary Work Shape | Critical n8n Gate Type | Escrow Isolation Safeguard |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| **01** | Honda TMX 125 Overhaul | 4 Nodes | `ORD-MOTO-01A..D` | A1, A3, A4 | Reassembly Wait Gate & Scour Approval | Lathe failure releases Node 3 only; Node 1 sealed parts paid |
| **02** | Tricycle Welded Molye | 3 Nodes | `ORD-MOTO-02A..C` | A1, A4 | Suspension Delivery Gate & Rust Variance | Hardware stockout refunds Node 1; Runner receives trip fee |
| **03** | Flatbed Tow Trike Rescue | 4 Nodes | `ORD-AUTO-03A..D` | A1, A4 | Roadside Hotshot Gate & Tow Trike Fork | Tow Trike Node 1 settles upon safe bay arrival regardless of repair |
| **04** | Outboard Banca Propshaft| 4 Nodes | `ORD-MAR-04A..D` | A1, A3, A4 | Shaft Return Gate & Spline Twist Check | Lathe blank/press error borne by shop; Labor paused safely |
| **05** | Crown Tread Tire Vulcanizing | 2 Nodes | `ORD-TIRE-05A..B` | A1, A4 | Crown Safety Gate & Carcass Plies | Non-crown injury rejects repair; Demount inspection fee paid |
| **06** | Alternator & Battery Swap | 4 Nodes | `ORD-AUTO-06A..D` | A1, A4 | Battery Delivery Gate & Core Trade Escrow | Upland rain landslide triggers weather pause without refund |
| **07** | Windshield Resin Repair | 3 Nodes | `ORD-AUTO-07A..C` | A1, A4 | Optical Resin Gate & Crack Length Check | Thermal shock run covered by waiver; Consumed resin paid |
| **08** | D-Max Injector Cleaning | 4 Nodes | `ORD-AUTO-08A..D` | A1, A3, A4 | Bench Delivery Gate & Piezo Variance | Blown injectors settles bench test Node 3; Parts unboxed returned |
| **09** | Brake Shoe Re-Lining | 4 Nodes | `ORD-MOTO-09A..D` | A1, A3, A4 | Drum Lathe Gate & Drum Discard Diameter | Lathe power outage holds labor order without cross penalty |
| **10** | 428H Chain & Sprocket | 3 Nodes | `ORD-MOTO-10A..C` | A1, A4 | Sprocket Arrival Gate & Damper Approval | Runner traffic delay keeps mechanic idle on teardown safely |
| **11** | Kuliglig R180 Overhaul | 3 Nodes | `ORD-AGRI-11A..C` | A1, A4 | Paddy Delivery Gate & Spun Rod Variance | Paddy storm downpour triggers rain pause; Escrow protected |
| **12** | Radiator Chemical Flush | 3 Nodes | `ORD-AUTO-12A..C` | A1, A4 | Coolant Delivery Gate & Head Gasket Check | Blown gasket aborts flush; Coolant refunded 100% unopened |
| **13** | Auto Aircon Evaporator | 3 Nodes | `ORD-AUTO-13A..C` | A1, A4 | Dash Core Gate & Heater Core Opportunity | Fin transit damage covered by courier; Dash labor preserved |
| **14** | Tricycle Reupholstery | 3 Nodes | `ORD-MOTO-14A..C` | A1, A4 | Foam Delivery Gate & Wood Rot Variance | Soiled vinyl transit insured; Upholsterer labor untouched |
| **15** | Fleet TODA Roadworthiness| 3 Nodes | `ORD-FLT-15A..C` | A1, A4 | Tuning Delivery Gate & dB Decibel Check | Granular per-vehicle settlement; Failing trike isolated |
| **16** | Clutch Plate Wave 110 | 3 Nodes | `ORD-MOTO-16A..C` | A1, A4 | Oil Soak Gate & Basket Notch Approval | Wrong oil spec triggers redelivery at merchant expense |
| **17** | Hilux Suspension & Alignment| 3 Nodes | `ORD-AUTO-17A..C` | A1, A4 | Ball Joint Gate & Rack End Variance | Road mud delay holds gate safely; Labor protected |
| **18** | Fishing Boat Bilge Pump | 3 Nodes | `ORD-MAR-18A..C` | A1, A4 | Marine Gear Gate & Submersion Test | Storm surge triggers harbor standby; Bilge drill labor secure |
| **19** | Ceramic Paint Coating | 3 Nodes | `ORD-AUTO-19A..C` | A1, A4 | Compound Delivery Gate & Paint Gauge Check | Crystallized ceramic replaced by store; 2-stage cut preserved |
| **20** | Heavy Dump Truck Hydraulic | 4 Nodes | `ORD-HVY-20A..D` | A1, A3, A4 | Dual Join (Seal + Hose) & Rod Gouge Var | Mis-crimped hose re-done by shop; Oil & Labor isolated |
