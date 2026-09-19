# Serbizyu 2.0 Deal Chains & Work Execution Architecture
## Sector Dossier: Personal Care, Health, Domestic & Professional Services (Tagudin, Ilocos Sur)
### 20 Production-Grade Business Use Cases

This document defines 20 exhaustive business use cases across Personal Care, Health, Domestic, and Professional Services within the Serbizyu 2.0 modular monolith architecture, set in the Municipality of Tagudin, Ilocos Sur (incorporating authentic local topographies and barangays: Del Pilar, Libtong, Rizal, Poblacion Centro, Quirino, Bio, Ambalayat, Bitalag, Dacutan, Pallogan, Baracbac, Farola, Poblacion West, Cabugaoan, Magsaysay, Garitan, Bucao East, Pao, Del Rosario, and Central East).

Every use case strictly adheres to ratified architectural invariants (`AD-5`, `AD-17`, `AD-20`, `AD-21`, `AD-22`) and the settled graph boundaries in `FRONTEND-FIRST-SOLUTION-DESIGN.md` (§8.1, lines 489–492) and `docs/planning-hardening/26-deal-chain-and-work-step-dependency-gates-synthesis.md`:
1. **Macro Chain Nodes are cross-provider/order units only:** Each billable Deal Need corresponds to exactly one bilateral child `Order`, one independent provider entity, and one isolated `PaymentObligation`. A provider’s internal execution phases remain encapsulated in their child order's **Micro Work Pipeline Steps**—never split into artificial graph nodes. Internal bots, algorithms, or platform sensors are evidence verification policies or dependency gates, not billable macro nodes.
2. **Parallel Forks are concurrent child orders:** Independent child orders execute concurrently without waiting for a coarse parent status.
3. **Joins are evidence-backed dependency gates:** Synchronization is mediated through `work_step_dependency_gates`, holding internal steps in `WAITING_FOR_DEPENDENCY` until asynchronous transactional outbox events unblock the gate. A Join specifically defines `predecessor facts -> target step`.
4. **Human-in-the-Loop Approvals:** Mandatory customer sign-off gates are enforced prior to irreversible physical actions (such as chemical application, fabric cutting, notarial oaths, or medical gas delivery).
5. **Diagnostic Pauses & Safety Halts:** When unexpected damage or clinical contraindications are discovered, the workflow triggers a Diagnostic Pause. Scope variances require customer acceptance; if declined or contraindicated, safety policies trigger a hard halt, evaluating diagnostic/trip fees without penalty cascades.
6. **Canonical Money & Isolated Payment Obligations:** A Deal Chain has NO parent escrow, pooled wallet, or universal liability. Every child `Order` maintains its own isolated `PaymentObligation` with its own authorized amount, lane, due condition, and capture/release history. Handoff or delivery records evidence; the snapshotted due condition and evidence policy evaluate payment eligibility.

---

### Use Case 1: Home Haircut & Hair Rebonding with Chemical Treatment Ventilation Check

#### 1. Title & Real-World Municipal Scenario
* **Title:** In-Home Hair Rebonding & Chemical Straightening with Mechanical Ventilation Verification
* **Setting:** Barangay Del Pilar, Tagudin, Ilocos Sur. A coastal residential compound where an indoor living area is prepared for an in-home hair straightening and chemical treatment. Coastal humidity and restricted cross-ventilation present chemical vapor hazards (ammonium thioglycolate softening agents and peroxide neutralizers).
* **Participants:**
  * *Customer (Buyer):* Jocelyn V., resident booking in-home salon care.
  * *Cosmetologist (Labor Provider):* Certified local hair stylist.
  * *Cosmetics Merchant (Materials Provider):* Accredited salon care and chemical supply distributor.
  * *Local Courier (Transit Provider):* Barangay tricycle courier.

#### 2. Macro Deal Chain (Coordinated Independent Nodes)
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-SALON-001 (In-Home Hair Rebonding - Brgy. Del Pilar)                   │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Materials Sourcing    │ ORD-SALON-01A (Candon Salon Care & Chemical Depot)     │
│                               │ - Professional rebonding cream kit (Thio Softener)     │
│                               │ - Neutralizing cream, botanical serum, disposable cape │
│                               │ Amount: ₱1,250.00 | Shape: A4 Handoff | Fact: collected│
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Rapid Transit         │ ORD-SALON-01B (Kuya Arnel Express Trike Dispatch)      │
│                               │ - Doorstep transit from depot to Brgy. Del Pilar home  │
│                               │ Amount: ₱120.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Skilled Salon Labor   │ ORD-SALON-01C (Ate Gemma Hair Innovations - Stylist)   │
│                               │ - Scalp triage, strand elasticity test, chemical       │
│                               │   application, flat-ironing, neutralization, cut/trim  │
│                               │ Amount: ₱1,800.00 | Shape: A1 Trade Labor | Fact: Done │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline (Ate Gemma's Operational Steps)
1. **Intake & Scalp Assessment:** Examine scalp integrity, hair porosity, tensile elasticity, and chemical history; photograph crown and hairline for baseline record.
2. **Ventilation Setup & Evidence Capture:** Position an exhaust fan facing an open exterior window; capture photo evidence proving active outward airflow path away from living quarters.
3. **Softening Application (Gated):** Verify chemical kit delivery and confirmed ventilation; apply softening cream in sections; monitor strand breakdown via regular elasticity pull tests.
4. **Thermal Ironing & Neutralization:** Rinse out softening agent, blow-dry completely, flat-iron hair in thin sections at controlled temperature, apply neutralizer per manufacturer timing.
5. **Rinse, Trim & Customer Sign-Off:** Final water rinse, light trim of split ends, customer mirror review, and digital sign-off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** While the courier travels to the merchant to collect the chemical treatment kit, the stylist concurrently sets up the styling station, sanitizes tools, and arranges the room exhaust fan.
* **Join:** Predecessor facts (`NEED-CHEM-DELIVERY: delivered_to_site` AND `NEED-VENTILATION: exhaust_photo_verified`) $\rightarrow$ unblocks target step `apply_chemical_softener`. The engine blocks chemical application until both physical materials and outward airflow evidence are logged.
* **Approval:** Customer reviews strand test result and signs digital confirmation: "Hair strand test confirmed; authorized to proceed with full chemical application and thermal ironing."
* **Diagnostic Pause:**
  * `IF` intake reveals active scalp abrasions, open sores, or severe chemical breakage:
  * `THEN` execute **Hard Safety Stop**. Chemical application is halted to prevent chemical burns; service aborts; an initial diagnostic/trip fee is evaluated under the labor order; the remaining labor payment authorization is cancelled and released to the customer.
* **Sidecar Errand:** If customer hair density requires an additional tub of neutralizer, stylist initiates an on-demand courier run (`ERRAND-NEUTRALIZER-02`) without resetting the primary work instance.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Each node forms an independent bilateral contract (`ORD-SALON-01A`, `ORD-SALON-01B`, `ORD-SALON-01C`). Handoff records evidence; the snapshotted due/evidence policy evaluates payment eligibility.
* **Failure Isolation:** If the courier experiences vehicle trouble in transit, `ORD-SALON-01B` enters `failed` and triggers courier replacement. The stylist’s diagnostic fee remains eligible under `ORD-SALON-01C` for on-site time. The merchant’s claim is governed by standard transit terms. No cross-order penalty cascade occurs.

---

### Use Case 2: Traditional Prenatal Hilot Massage with Herbal Poultice Preparation

#### 1. Title & Real-World Municipal Scenario
* **Title:** Traditional Prenatal Hilot Massage with Steamed Herbal Poultice Application
* **Setting:** Barangay Libtong, Tagudin, Ilocos Sur. An expectant mother in her third trimester requests gentle home comfort care for lower back tightness and leg fatigue. Service safety rules mandate medical pre-clearance and on-site vital signs screening.
* **Participants:**
  * *Customer (Buyer):* Marites C., expectant mother (uncomplicated pregnancy, 31 weeks).
  * *Clinical Reviewer (Clinical Tele-Screening):* Tagudin Municipal Tele-Midwife / Attending Clinician.
  * *Hilot Practitioner (Labor Provider):* Nanay Lusing Hilot (TESDA-Certified Traditional Practitioner).
  * *Herbal Producer (Materials Provider):* Ambalayat Botanical Garden (Fresh medicinal leaves: sambong, guava, lemongrass, and pure virgin coconut oil).
  * *Local Courier (Transit Provider):* Kuya Bryan Mountain Habal-Habal Runner.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-HILOT-002 (Prenatal Comfort Care - Brgy. Libtong)                      │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Clinical Pre-Clearance│ ORD-HILOT-02A (Tagudin Municipal Tele-Midwife Review)  │
│                               │ - Verification of prenatal card, gestational age check │
│                               │ Amount: ₱150.00 | Shape: A3 Specialist | Fact: Cleared │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Botanical Sourcing    │ ORD-HILOT-02B (Ambalayat Botanical Garden)             │
│                               │ - 3x Freshly harvested herbal poultices, 250ml pure VCO│
│                               │ Amount: ₱320.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Expedited Logistics   │ ORD-HILOT-02C (Kuya Bryan Habal-Habal Logistics)       │
│                               │ - Thermal tote transport from Ambalayat to Libtong     │
│                               │ Amount: ₱140.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: Skilled Hilot Labor   │ ORD-HILOT-02D (Nanay Lusing Hilot Practitioner)        │
│                               │ - Side-lying comfort massage, warm herbal compress     │
│                               │ Amount: ₱650.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Vitals Verification:** Check maternal resting blood pressure, pulse, temperature; screen for reported headaches, visual changes, or fluid leakage.
2. **Clearance & Materials Gate:** Confirm verified clinical clearance record and physical arrival of freshly steamed herbal bundles.
3. **Compress Warming:** Steam herbal poultices in a double boiler to a comfortable temperature ($40^\circ\text{C}-42^\circ\text{C}$).
4. **Side-Lying Prenatal Hilot:** Position client in lateral left decubitus with bolster pillows; perform gentle upward strokes; strictly avoid deep abdominal pressure and contra-indicated pressure points.
5. **Compress Application & Sign-Off:** Place warm compresses on upper back and shoulders; record post-session status and customer sign-off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** While the courier rides to collect fresh herbal cuttings from the nursery, the practitioner prepares maternity positioning pillows, boils water, and screens baseline vitals.
* **Join:** Predecessor facts (`NEED-OB-CLEARANCE: cleared_by_clinician` AND `NEED-HERBS-DELIVERY: delivered_to_site`) $\rightarrow$ unblocks target step `warm_compress_application`.
* **Approval:** Customer confirms comfortable side-lying position, pillow support, and authorizes herbal compress application.
* **Diagnostic Pause:**
  * `IF` maternal $BP \ge 140/90\,\text{mmHg}$, or if client reports headache, visual disturbances, abdominal pain, spotting, or regular contractions:
  * `THEN` execute **Immediate Clinical Halt**. Massage is locked out; the engine triggers an alert recommending immediate checkup at the local rural health unit or hospital. No customer waiver is permitted to override clinical contraindications. An intake/travel fee is authorized to the practitioner; remaining labor payment authorization is cancelled and released.
* **Sidecar Errand:** If clean flannel wrapping cloths are needed, runner fetches them from town pharmacy via an ad-hoc child order.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders maintain strictly independent payment and settlement terms. Handoff records evidence; the snapshotted due policy evaluates payment eligibility.
* **Failure Isolation:** Because herbs were cut to order and delivered, `ORD-HILOT-02B` and `ORD-HILOT-02C` record delivery evidence, making them eligible for payment evaluation under their terms. If maternal hypertension causes an intake halt, unrendered labor is cancelled and released to the buyer without penalizing the agricultural supplier or transit rider.

---

### Use Case 3: Elderly Bedridden Patient Home Nurse Vital Check & Wound Catheter Dressing

#### 1. Title & Real-World Municipal Scenario
* **Title:** Home Nursing Vital Signs Monitoring, Wound Cleansing & Catheter Exit-Site Dressing
* **Setting:** Barangay Rizal, Tagudin, Ilocos Sur. An elderly bedridden resident requires routine home nursing care for vital sign monitoring, indwelling urinary catheter exit-site cleansing and dressing renewal, and sacral pressure wound dressing changes per physician protocol.
* **Participants:**
  * *Family Caregiver (Buyer):* Arturo T., son and primary caregiver.
  * *Attending Physician (Clinical Tele-Review):* Dr. Ramos, MD (Attending Internist / Care Protocol Review).
  * *Home Health Nurse (Labor Provider):* Nurse Karen, RN (Licensed Private Duty Nurse).
  * *Medical Supply Partner (Materials Provider):* Farmacia Tagudin Centro.
  * *Medical Courier (Transit Provider):* Kuya Jojo Medical Express (Sanitized dry-box carrier).

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-NURSE-003 (Bedridden Patient Nursing Visit - Brgy. Rizal)              │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Physician Order Review│ ORD-NURSE-03A (Dr. Ramos Tele-Order Validation)        │
│                               │ - Clinical review of wound care and catheter regimen   │
│                               │ Amount: ₱150.00 | Shape: A3 Specialist | Fact: Cleared │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Sterile Consumables   │ ORD-NURSE-03B (Farmacia Tagudin Centro)                │
│                               │ - Sterile non-adherent dressings, normal saline, tape, │
│                               │   catheter securement device, antiseptic prep swabs    │
│                               │ Amount: ₱680.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Sanitized Transit     │ ORD-NURSE-03C (Kuya Jojo Medical Express)              │
│                               │ - Temperature-stable, sealed dry-box delivery to home  │
│                               │ Amount: ₱90.00 | Shape: A4 Transit | Fact: delivered   │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: Skilled Nursing Labor │ ORD-NURSE-03D (Nurse Karen, RN - Home Health Nurse)    │
│                               │ - Vitals monitoring, catheter exit-site antiseptic     │
│                               │   cleansing, dressing renewal, sacral wound care       │
│                               │ Amount: ₱850.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Baseline Vitals:** Measure blood pressure, heart rate, oxygen saturation, temperature; inspect urine drainage bag for color, volume, and clarity; inspect existing dressing condition.
2. **Supply Inspection Gate:** Verify delivered dressing supplies have intact tamper seals and valid expiration dates.
3. **Catheter Site Cleansing & Securement Renewal:** Cleanse skin around insertion site with antiseptic solution; apply sterile securement device and dry dressing; ensure tension-free tubing alignment.
4. **Sacral Wound Cleansing & Dressing:** Gently remove old dressing; cleanse wound margin with sterile normal saline; apply prescribed protective barrier dressing.
5. **Documentation & Caregiver Sign-Off:** Document vitals and wound appearance in clinical log; obtain caregiver digital signature.

#### 4. n8n Conditional Logic & Gates
* **Fork:** While the courier travels to collect the sterile dressing supplies from the pharmacy, the nurse checks baseline vital signs, observes catheter drainage clarity, and reviews the previous visit chart.
* **Join:** Predecessor facts (`NEED-MD-ORDER: active_order_verified` AND `NEED-DRESSING-SUPPLIES: delivered_to_site`) $\rightarrow$ unblocks target step `catheter_wound_dressing_renewal`.
* **Approval:** Caregiver inspects delivered sterile supply seals and signs authorization modal: "Sterile packaging integrity verified; proceed with wound and catheter dressing protocol."
* **Diagnostic Pause:**
  * `IF` nurse observes gross blood in urine, purulent exit-site discharge, temperature $>38.5^\circ\text{C}$, or acute wound tissue breakdown:
  * `THEN` execute **Clinical Escalation Halt**. The nurse stabilizes the dressing, halts further manipulation, and initiates an immediate tele-consult with the attending physician or advises hospital transfer.
* **Sidecar Errand:** If extra sterile gauze or skin barrier film is required, nurse dispatches an on-demand courier to the nearest open pharmacy.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders carry distinct obligations. Delivery records evidence; snapshotted due conditions determine payment eligibility.
* **Failure Isolation:** If sterile supplies arrive intact but patient condition necessitates immediate emergency hospital transfer during intake, pharmacy (`ORD-NURSE-03B`) and courier (`ORD-NURSE-03C`) records of delivery satisfy their evidence requirements. The nurse receives an assessment fee, and remaining labor authorization is released.

---

### Use Case 4: Mobile Dog Grooming with Anti-Rabies Vaccination Verification by Licensed Vet

#### 1. Title & Real-World Municipal Scenario
* **Title:** Mobile Dog Grooming with Veterinary Rabies Vaccination Record Verification
* **Setting:** Barangay Poblacion Centro, Tagudin, Ilocos Sur. A dog owner books mobile grooming for family pets. Under platform handler-safety policy and standard municipal animal health precautions, groomers verify active anti-rabies vaccination records issued by a licensed veterinarian before handling pets. Groomers do not administer vaccines.
* **Participants:**
  * *Pet Owner (Buyer):* Atty. Mark D., resident pet owner.
  * *Reviewing Veterinarian (Veterinary Review):* Dr. Michelle B., DVM (Licensed Small Animal Clinician).
  * *Mobile Groomer (Labor Provider):* Paws & Bubbles Mobile Grooming (Hydro-bath mobile van).
  * *Pet Supply Merchant (Materials Provider):* Ilocos Pet Care Supply (Pet shampoo, ear cleaner, disinfectants).

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-PET-004 (Mobile Canine Hydro-Bath & Grooming - Poblacion Centro)       │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Rabies Verification   │ ORD-PET-04A (Dr. Michelle B., DVM - Veterinary Review) │
│                               │ - Verification of anti-rabies booklet and clinic stamp │
│                               │ Amount: ₱150.00 | Shape: A3 Specialist | Fact: Cleared │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Grooming Consumables  │ ORD-PET-04B (Ilocos Pet Care Supply)                   │
│                               │ - Medicated oatmeal shampoo, ear wash, sanitizer wipes │
│                               │ Amount: ₱280.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Skilled Grooming Labor│ ORD-PET-04C (Paws & Bubbles Mobile Grooming)           │
│                               │ - Mobilization, coat brushing, warm hydro-bath, blow   │
│                               │   drying, claw clipping, ear cleansing, sanitary trim  │
│                               │ Amount: ₱1,550.00 | Shape: A1 Trade Labor | Fact: Done │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Rabies Record Gate:** Verify active veterinary rabies verification status; perform visual check of coat and skin for open lesions.
2. **Pre-Wash Brushing:** De-mat coat; trim nails carefully; wipe outer ear canals with clean pads.
3. **Hydro-Bath:** Bathe pet in warm water with pet-safe shampoo; rinse thoroughly.
4. **Drying & Trimming:** Dry coat with warm-air dryer; brush out loose fur; perform sanitary trim.
5. **Inspection & Owner Sign-Off:** Owner inspects pet cleanliness and nail trim; signs off on mobile application.

#### 4. n8n Conditional Logic & Gates
* **Fork:** While the veterinarian verifies the vaccination booklet photo and clinic credentials, the mobile groomer pressurizes water tanks and prepares sanitizing solutions.
* **Join:** Predecessor facts (`NEED-VET-RABIES-AUDIT: rabies_record_verified` AND `NEED-GROOMING-SUPPLIES: delivered_to_site`) $\rightarrow$ unblocks target step `load_pet_into_grooming_van`.
* **Approval:** Pet owner reviews pre-grooming assessment, approves coat trim length, and signs authorization: "Pet temperament and coat plan confirmed; authorized to proceed with bathing and claw trimming."
* **Diagnostic Pause:**
  * `IF` rabies record is expired, missing, or unverified, OR if intake reveals open skin lesions, severe pyoderma, or active heavy tick/flea infestation:
  * `THEN` execute **Immediate Service Lockout**. The groomer is prohibited from handling the animal. Washing infected skin is barred; a trip/mobilization fee is evaluated under the labor order; remaining labor authorization is cancelled and released.
* **Sidecar Errand:** If replacement clipper blades are needed for dense coats, groomer orders them via on-demand courier.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders maintain independent payment terms. Delivery and handoff record evidence; due policies evaluate payment authority.
* **Failure Isolation:** If service is halted during intake due to unverified rabies records or open skin lesions, the veterinary verification fee settles for completed review; materials remain in van inventory; grooming labor is adjusted to a trip fee without cross-penalties.

---

### Use Case 5: School Graduation Barong/Gown Tailoring with On-Site Fitting & Hem Alteration

#### 1. Title & Real-World Municipal Scenario
* **Title:** On-Site Graduation Attire Fitting, Hem Shortening & Tailoring Alteration
* **Setting:** Barangay Quirino, Tagudin, Ilocos Sur. A graduating student requires on-site pinning, sleeve adjustments, and hem alterations on formal graduation attire 48 hours before the commencement ceremony.
* **Participants:**
  * *Customer (Buyer):* Elena S., parent of graduating student.
  * *Master Tailor (Labor Provider):* Mang Tonyo Custom Threads (Alteration Specialist).
  * *Haberdashery Merchant (Materials Provider):* Tagudin Central Textile & Notions.
  * *Local Courier (Transit Provider):* Kuya Gary Express (Motorcycle courier).

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-TAILOR-005 (Urgent Graduation Attire Alteration - Brgy. Quirino)       │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Notions Sourcing      │ ORD-TLR-05A (Tagudin Central Textile & Notions)        │
│                               │ - Champagne silk thread spool, #3 nylon zipper, organza│
│                               │ Amount: ₱280.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Express Logistics     │ ORD-TLR-05B (Kuya Gary Express)                        │
│                               │ - Rapid transit of sewing notions & portable serger    │
│                               │ Amount: ₱100.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Tailoring Craft Labor │ ORD-TLR-05C (Mang Tonyo Custom Threads)                │
│                               │ - In-person pinning, basting, cutting, machine serging,│
│                               │   blind hemming, and high-pressure steam pressing      │
│                               │ Amount: ₱900.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Basting Fit:** Student wears attire; tailor checks shoulder fit, sleeve drop, and hemline; marks alterations with pins and tailor's chalk.
2. **Notions Arrival & Color Match Gate:** Receive matching thread; check color match against fabric under natural light.
3. **Cutting & Stitching (Irreversible Action):** Trim excess fabric; serge raw edges to prevent fraying; complete blind hem stitching.
4. **Steam Pressing:** Press collar, cuffs, and hem using iron and pressing cloth.
5. **Final Fitting & Sign-Off:** Student tries on altered garment; parent confirms fit and signs mobile approval.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Mang Tonyo pins, bastes, and chalks the garment while Kuya Gary rides to the haberdashery to purchase color-matched thread spools.
* **Join:** Predecessor facts (`NEED-THREAD-DELIVERY: delivered_to_site` AND `NEED-FIT-ASSESSMENT: chalking_completed`) $\rightarrow$ unblocks target step `cut_and_serge_fabric`.
* **Approval:** Customer inspects the pinned hem and chalk line, signing the modal: "Confirming 2.5-inch hem shortening; irreversible fabric cut authorized."
* **Diagnostic Pause:**
  * `IF` unpicking reveals dry rot or fabric fraying along internal seam allowances:
  * `THEN` execute Diagnostic Pause; tailor explains risk and proposes stay-tape reinforcement variance.
  * `ELSE IF` declined: tailor executes gentle hand basting without durability guarantee on high-stress seams.
* **Sidecar Errand:** If an embroidered school crest patch needs attachment, tailor dispatches a runner to the school supply store.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders hold independent payment obligations. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If the tailor's portable sewing machine experiences mechanical failure mid-job, delivered materials and transit fees record delivery evidence and evaluate to settled. The labor order enters `replacement_needed`, allowing a relief seamstress to complete the hemming without re-billing the customer for materials.

---

### Use Case 6: Legal Document Notary Public On-Site Signing with Municipal Hall Runner

#### 1. Title & Real-World Municipal Scenario
* **Title:** Mobile Notarial Acknowledgment & Municipal Document Lodgment
* **Setting:** Barangay Bio, Tagudin, Ilocos Sur. Elderly co-heirs with limited mobility require in-home notarization of an extrajudicial estate settlement followed by submission to the municipal assessor’s office.
* **Participants:**
  * *Requesting Party (Buyer):* Manolo G., estate administrator.
  * *Notary Public (Labor Provider):* Atty. Ferdinand R., Commissioned Notary Public for Ilocos Sur.
  * *Legal Printing Hub (Materials Provider):* Bio Legal Services.
  * *Liaison Runner (Transit Provider):* Kuya Dexter, municipal court messenger.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-LEGAL-006 (On-Site Notarization & Assessor Filing - Brgy. Bio)         │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Security Paper Depot  │ ORD-LEG-06A (Bio Legal Services)                       │
│                               │ - 80gsm security bond paper, foil wafers, ribbons, DST │
│                               │ Amount: ₱270.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Legal Notarial Labor  │ ORD-LEG-06B (Atty. Ferdinand R., Notary Public)        │
│                               │ - Identity review, capacity check, oath administration,│
│                               │   notarial registry entry, steel seal embossing        │
│                               │ Amount: ₱1,550.00 | Shape: A3 Specialist | Fact: Done  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Municipal Submission  │ ORD-LEG-06C (Kuya Dexter - Liaison Messenger)          │
│                               │ - Transport of sealed folios to Tagudin Municipal Hall │
│                               │ Amount: ₱400.00 | Shape: A4 Transit | Fact: delivered  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Identity Check:** Examine original government-issued photo IDs; verify voluntary consent and legal capacity of all signatories.
2. **Document Preparation:** Collate legal descriptions and tax declarations; bind pages with ribbon; prepare Notarial Register entry.
3. **Sworn Oath & Execution (Irreversible):** Administer formal oath; observe signing; capture thumbprints in official notarial ledger.
4. **Notarial Seal & Stamping:** Notary signs, stamps, affixes notarial seal and documentary stamps to all copies.
5. **Runner Handoff & Municipal Lodgment:** Transfer sealed copies to messenger for municipal hall submission; customer tracks runner progress.

#### 4. n8n Conditional Logic & Gates
* **Fork:** The attorney reviews property titles and drives to the residence while the print hub collates the bound folios and the messenger collects assessor queue slips.
* **Join:** Predecessor facts (`NEED-PRINTED-DEEDS: delivered_to_site` AND `NEED-IDENTITY-CHECK: signatories_verified`) $\rightarrow$ unblocks target step `administer_oath_and_affix_seal`.
* **Approval:** Co-heirs confirm document contents and sign sworn declaration modal: "I swear that this Deed represents my free and voluntary act."
* **Diagnostic Pause:**
  * `IF` a signatory exhibits lack of legal capacity, cognitive impairment, or signs of duress:
  * `THEN` execute **Notarial Refusal Stop**. Signing is legally halted. Notary issues a refusal memorandum; an appearance fee is settled under the notarial order; remaining legal fee obligation is cancelled and released.
* **Sidecar Errand:** If an updated copy of a tax declaration is needed, runner is dispatched on a sidecar errand to the assessor satellite window.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders maintain separate payment terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If the municipal hall closes unexpectedly due to a local power interruption after notarization is complete, the notary fee evaluates to eligible because notarization evidence was recorded. The runner order remains `in_progress` with an extended SLA window until the next business morning.

---

### Use Case 7: Passport & National ID Portrait Capture with Mobile Photo Printer

#### 1. Title & Real-World Municipal Scenario
* **Title:** In-Home Government ID & Passport Portrait Photography with Mobile Thermal Printing
* **Setting:** Barangay Ambalayat, Tagudin, Ilocos Sur. Senior and disabled residents in an upland sitio require compliant passport and national ID photos taken and printed at home.
* **Participants:**
  * *Requester (Buyer):* Barangay Kagawad on behalf of residents.
  * *Portrait Photographer (Labor Provider):* Lens & Light Mobile Studio.
  * *Imaging Merchant (Materials Provider):* Tagudin Digital Imaging Center.
  * *Motorcycle Courier (Transit Provider):* Kuya Lito Upland Route Logistics.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-PHOTO-007 (Mobile Biometric ID Portraiture - Brgy. Ambalayat)          │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Photo Media Sourcing  │ ORD-PHT-07A (Tagudin Digital Imaging Center)           │
│                               │ - Thermal dye-sub paper & ribbon, white matte backdrop │
│                               │ Amount: ₱450.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Upland Trail Transit  │ ORD-PHT-07B (Kuya Lito Logistics)                      │
│                               │ - Transit of battery pack & printer to mountain sitio  │
│                               │ Amount: ₱180.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Portraiture Labor     │ ORD-PHT-07C (Lens & Light Mobile Studio)               │
│                               │ - Strobe lighting setup, posture assist, camera        │
│                               │   framing, RAW capture, thermal printing, die-cutting  │
│                               │ Amount: ₱650.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Setup:** Set up portable white backdrop behind subject; arrange diffuse battery-powered lighting units.
2. **Framing & Capture:** Position subject with neutral expression and straight eye-line; capture multi-frame exposures.
3. **Quality Check:** Review photo on camera for glare, shadows, and compliant head dimensions.
4. **Printing (Gated):** Await verified delivery of photo media; print passport and standard ID photo sets.
5. **Die-Cutting & Sign-Off:** Cut photos to exact dimensions using manual die-cutter; package in sleeves; client signs delivery form.

#### 4. n8n Conditional Logic & Gates
* **Fork:** The photographer sets up background stands and balances lighting diffusers while the courier rides to deliver thermal paper and dye ribbon packs.
* **Join:** Predecessor facts (`NEED-PRINT-MEDIA: delivered_to_site` AND `NEED-RAW-CAPTURE: portrait_framed_and_approved`) $\rightarrow$ unblocks target step `execute_thermal_printing`.
* **Approval:** Resident reviews digital camera preview screen and confirms: "Photo preview approved for physical printing."
* **Diagnostic Pause:**
  * `IF` involuntary subject movements require custom handheld diffuser positioning or multi-take composite:
  * `THEN` photographer pauses; proposes assistive setup variance.
  * `ELSE IF` declined: photographer captures best possible single-frame exposure within standard session time.
* **Sidecar Errand:** If flash batteries run low, runner fetches replacement AA lithium batteries from the nearest store.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders have distinct payment terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If mountain trail mud blocks courier arrival before printing, photo capture files remain safely stored on camera; courier attempt fee is arbitrated; paper order remains valid; printing obligation remains open until transit clears.

---

### Use Case 8: High School Math & Physics Home Tutoring with Custom Worksheets

#### 1. Title & Real-World Municipal Scenario
* **Title:** In-Home STEM Tutoring with Custom Problem Set Printing
* **Setting:** Barangay Bitalag, Tagudin, Ilocos Sur. A senior high school STEM student requires in-person coaching on calculus and kinematics with printed custom study packets before college entrance exams.
* **Participants:**
  * *Parent (Buyer):* Engr. Roberto M., parent.
  * *Tutor (Labor Provider):* Teacher Kenneth, LPT (Licensed Science Educator).
  * *Print Shop (Materials Provider):* Bitalag FastPrint Services.
  * *Local Courier (Transit Provider):* Kuya Marlon E-bike Express.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-TUTOR-008 (STEM Exam Prep & Custom Syllabus - Brgy. Bitalag)           │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Custom Syllabus Print │ ORD-TTR-08A (Bitalag FastPrint Services)               │
│                               │ - 60-page bound calculus problem set, formula summaries│
│                               │ Amount: ₱290.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: E-Bike Express Transit│ ORD-TTR-08B (Kuya Marlon E-bike Express)               │
│                               │ - Fast delivery of study modules to student residence  │
│                               │ Amount: ₱70.00 | Shape: A4 Transit | Fact: delivered   │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Academic Coaching     │ ORD-TTR-08C (Teacher Kenneth, LPT)                     │
│                               │ - 3-hour coaching, concept deconstruction, guided      │
│                               │   drills, timed mock exam marking, diagnostic feedback │
│                               │ Amount: ₱950.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Assessment:** Review student's recent test mistakes; set priority topics for the session.
2. **Worksheet Arrival Gate:** Await physical delivery of printed problem sets before starting timed exercises.
3. **Guided Instruction:** Explain formulas and problem-solving steps; student works through practice problems.
4. **Mock Exercise:** Student completes an unassisted problem set; tutor reviews and marks errors.
5. **Debrief & Parent Sign-Off:** Review performance with parent; provide recommended self-study areas; parent signs off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Tutor conducts theoretical review and mental math drills while courier collects printed problem sets from the print shop.
* **Join:** Predecessor facts (`NEED-PRINTED-WORKSHEETS: delivered_to_site` AND `NEED-THEORY-REVIEW: lecture_concluded`) $\rightarrow$ unblocks target step `start_timed_mock_drills`.
* **Approval:** Parent reviews session focus topics and signs approval modal to authorize proceeding with timed drills.
* **Diagnostic Pause:**
  * `IF` student demonstrates severe prerequisite algebra gaps preventing calculus progress:
  * `THEN` tutor pauses; proposes foundation remediation extension.
  * `ELSE IF` parent declines: tutor focuses on high-yield basic formulas within contracted time.
* **Sidecar Errand:** If student needs a scientific calculator, tutor orders one via on-demand bookstore runner.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders maintain independent settlement rules. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If tutor arrives late due to vehicle trouble, print shop and courier fees settle immediately upon on-time delivery; tutor session time is adjusted or rescheduled per bilateral agreement without holding merchant funds.

---

### Use Case 9: Commercial Sofa & Mattress Deep Steam Extraction with Anti-Mite Treatment

#### 1. Title & Real-World Municipal Scenario
* **Title:** Deep Upholstery Hot-Water Extraction & Anti-Mite Treatment
* **Setting:** Barangay Dacutan, Tagudin, Ilocos Sur. A vacation rental cottage requires deep cleaning of a fabric sectional sofa and mattresses following tourist guest checkouts.
* **Participants:**
  * *Property Host (Buyer):* Claire H., rental home host.
  * *Cleaning Specialist (Labor Provider):* CleanPro Ilocos Deep Cleaning Services.
  * *Janitorial Supplier (Materials Provider):* Tagudin Commercial Janitorial Chemicals.
  * *Logistics Partner (Transit Provider):* CleanPro Mobile Equipment Van.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-STEAM-009 (Commercial Upholstery Decontamination - Brgy. Dacutan)      │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Chemical Sourcing     │ ORD-STM-09A (Tagudin Janitorial Chemicals)             │
│                               │ - Low-foaming extraction shampoo, anti-mite solution   │
│                               │ Amount: ₱510.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Heavy Van Logistics   │ ORD-STM-09B (CleanPro Mobile Equipment Van)            │
│                               │ - Van delivery of hot extraction unit, wet vac, blowers│
│                               │ Amount: ₱260.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Extraction Labor      │ ORD-STM-09C (CleanPro Deep Cleaning Crew)              │
│                               │ - Dry agitation, vacuuming, pressurized steam          │
│                               │   injection, soiled extraction, anti-mite treatment    │
│                               │ Amount: ₱2,250.00 | Shape: A1 Trade Labor | Fact: Done │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Fabric Check:** Inspect upholstery seams for tears; test fabric colorfastness on an unexposed patch.
2. **Dry Vacuuming:** Vacuum deep dust, sand, and surface debris using commercial agitator vacuum.
3. **Steam Extraction (Gated):** Receive cleaning chemicals; inject heated solution and extract dirty liquid into recovery tank.
4. **Anti-Mite Mist & Drying:** Apply anti-mite treatment spray; position commercial air movers for rapid drying.
5. **Inspection & Customer Sign-Off:** Show extracted waste liquid; verify fabric moisture content; customer signs off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Crew member A performs mechanical dry agitation and particulate vacuuming while member B connects heavy hot-water extraction hoses and mixes enzyme detergents.
* **Join:** Predecessor facts (`NEED-EXTRACTION-ENZYME: delivered_to_site` AND `NEED-COLORFAST-CHECK: patch_test_passed`) $\rightarrow$ unblocks target step `inject_heated_extraction_solution`.
* **Approval:** Property host reviews fabric patch test result and signs confirmation: "Colorfastness approved; authorized to proceed with pressurized hot-water injection."
* **Diagnostic Pause:**
  * `IF` crew discovers structural frame rot or deep upholstery tears during dry vacuuming:
  * `THEN` execute Diagnostic Pause; photograph damage; propose frame repair variance.
  * `ELSE IF` declined: clean exterior fabric only, documenting pre-existing frame condition.
* **Sidecar Errand:** If specialized pet odor neutralizer is requested, crew dispatches an on-demand courier to the veterinary supply store.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders carry separate payment terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If client's water supply shuts off mid-job, transit and delivered chemicals settle in full. The labor order is split: completed dry vacuuming is settled, and remaining balance is held pending water restoration.

---

### Use Case 10: Wash-Dry-Fold Laundry Service with Heavy Comforter Pickup & Delivery

#### 1. Title & Real-World Municipal Scenario
* **Title:** Doorstep Laundry Service with Heavy Bedding & Comforter Processing
* **Setting:** Barangay Pallogan, Tagudin, Ilocos Sur. A multi-generational home arranges pickup, washing, drying, folding, and return of everyday clothes and thick blankets during continuous monsoon rains.
* **Participants:**
  * *Customer (Buyer):* Nanay Remedios P., household head.
  * *Laundromat (Labor Provider):* Tagudin Bubble Wash Hub.
  * *Cargo Courier (Transit Provider):* Kuya Noel Trike Cargo Logistics.
  * *Wholesale Supplier (Materials Provider):* Ilocos Wholesale FMCG Distributors.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-LAUNDRY-010 (Doorstep Wash-Dry-Fold & Bulky Comforters - Brgy. Pallogan)│
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Inbound Cargo Transit │ ORD-LND-10A (Kuya Noel Trike Cargo Logistics)          │
│                               │ - Pickup of 35kg tagged dirty laundry sacks from home  │
│                               │ Amount: ₱100.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Packaging Consumables │ ORD-LND-10B (Ilocos Wholesale FMCG Distributors)       │
│                               │ - Industrial detergent, fabric softener, poly wrap     │
│                               │ Amount: ₱240.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Laundry Processing    │ ORD-LND-10C (Tagudin Bubble Wash Hub)                  │
│                               │ - Sorting, wash cycle, gas tumble dry, folding, vacuum │
│                               │ Amount: ₱1,170.00 | Shape: A1 Trade Labor | Fact: Done │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: Outbound Return Ride  │ ORD-LND-10D (Kuya Noel Trike Cargo Logistics)          │
│                               │ - Doorstep delivery of fresh, crisp laundry packages   │
│                               │ Amount: ₱100.00 | Shape: A4 Transit | Fact: delivered  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Weighing:** Weigh laundry sacks on hanging scale; sort into darks, lights, and bulky comforters; check pockets.
2. **Washing:** Wash garments and comforters in commercial front-load washers with appropriate cycles.
3. **Drying:** Transfer loads to commercial dryers; tumble dry until completely dry.
4. **Folding & Packaging:** Fold garments neatly; vacuum-pack bulky comforters in protective bags.
5. **Outbound Handover & Sign-Off:** Courier delivers clean bundles; customer verifies item count and signs delivery receipt.

#### 4. n8n Conditional Logic & Gates
* **Fork:** While Garment Wash Batch #1 is spinning in the drum, Comforter Batch #2 undergoes manual spot pre-treatment in a dedicated wash tub.
* **Join:** Predecessor facts (`NEED-LAUNDRY-WORK: packaging_completed` AND `NEED-WEIGHT-SCALE: dry_weight_reconciled`) $\rightarrow$ unblocks target step `dispatch_outbound_courier`.
* **Approval:** If valuables (e.g., jewelry or cash) are found in pockets during sorting, photos are transmitted to customer for recorded verification before washing.
* **Diagnostic Pause:**
  * `IF` sorting reveals garments with heavy stubborn mud stains requiring manual pre-soak:
  * `THEN` execute Diagnostic Pause; propose stain treatment variance.
  * `ELSE IF` declined: wash in standard wash cycle without stain removal guarantee.
* **Sidecar Errand:** If customer asks to add laundry detergent pods for home use, courier purchases them during the delivery run.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders have independent settlement rules. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If the delivery trike breaks down on the return trip, laundry processing payment settles to the laundromat without disruption; an automated replacement courier order is created to complete the delivery.

---

### Use Case 11: Senior Citizen Maintenance Medication Pharmacy Pabili with Prescription

#### 1. Title & Real-World Municipal Scenario
* **Title:** Senior Citizen Prescription Medicine Procurement & Home Delivery
* **Setting:** Barangay Baracbac, Tagudin, Ilocos Sur. A senior resident requires monthly refills of hypertension and diabetes maintenance medications, requiring presentation of a valid doctor's prescription and senior citizen booklet for statutory discounts.
* **Participants:**
  * *Customer (Buyer):* Lola Corazon (via daughter in Manila).
  * *Errand Runner (Labor & Transit Provider):* Kuya Reynaldo, Tagudin Pabili Express.
  * *Retail Pharmacy (Materials Provider):* Mercury Drug Tagudin National Highway Branch.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-PABILI-011 (Senior Medication Refill & Cold-Chain Return - Baracbac)   │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Document Collection   │ ORD-MED-11A (Kuya Reynaldo - Errand Transit)           │
│                               │ - Pickup of physical prescription and Senior ID booklet│
│                               │ Amount: ₱90.00 | Shape: A4 Transit | Fact: collected   │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Prescribed Medicines  │ ORD-MED-11B (Mercury Drug Tagudin Highway Branch)      │
│                               │ - 30-day Losartan, Metformin, and Lantus Solostar pens │
│                               │ Amount: ₱2,480.00 | Shape: A4 Handoff | Fact: receipt  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Cold-Chain Return     │ ORD-MED-11C (Kuya Reynaldo - Cold-Chain Courier)       │
│                               │ - Insulated thermal pouch delivery back to residence   │
│                               │ Amount: ₱110.00 | Shape: A4 Transit | Fact: delivered  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Document Custody:** Collect paper prescription and senior booklet; upload photo of prescription.
2. **Pharmacy Dispensation:** Present documents to licensed pharmacist; pharmacist enters records and dispenses medicine.
3. **Receipt Check & Packing:** Verify medication names, dosages, and expiration dates; pack insulin in mini cooler with ice pack.
4. **Return Transit:** Deliver medications, official receipt, and senior booklet back to patient.
5. **Verification & Sign-Off:** Caregiver verifies sealed blisters and insulin vial; signs delivery acceptance.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Family member in Manila reviews mobile checkout while runner rides to collect the physical paper documents from Lola Corazon.
* **Join:** Predecessor facts (`NEED-PRESCRIPTION-AUDIT: pharmacist_receipt_uploaded` AND `NEED-PRICE-CONFIRMATION: customer_total_approved`) $\rightarrow$ unblocks target step `dispatch_cold_chain_return`. (Payment eligibility is evaluated independently by the medication order’s snapshotted lane and evidence policies).
* **Approval:** Buyer reviews itemized pharmacy receipt total reflecting statutory senior discount on mobile app and approves purchase total.
* **Diagnostic Pause:**
  * `IF` a prescribed brand is unavailable:
  * `THEN` pharmacist notes bioequivalent generic; runner uploads substitution recommendation for buyer approval.
  * `ELSE IF` buyer declines: runner visits a secondary pharmacy via automated routing add-on.
* **Sidecar Errand:** Resident calls runner while at pharmacy to add a bottle of alcohol and box of cotton swabs to the purchase.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders have distinct terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If the pharmacy is out of stock and order cannot be filled, runner's travel obligation settles for travel completed; unspent medication payment authorization is cancelled and released to the buyer.

---

### Use Case 12: Emergency Home Medical Oxygen Tank Exchange, Regulator Setup & Flow Calibration

#### 1. Title & Real-World Municipal Scenario
* **Title:** Certified Home Medical Oxygen Cylinder Exchange & Regulator Hookup
* **Setting:** Barangay Farola, Tagudin, Ilocos Sur. A patient with advanced respiratory disease requires an emergency exchange of an empty oxygen cylinder. Medical oxygen cannot be refilled by improvisation; it requires delivery of a factory-certified cylinder from a licensed depot, followed by verified regulator hookup, surfactant bubble leak testing, and flow calibration.
* **Participants:**
  * *Caregiver (Buyer):* Christian M., family caregiver.
  * *Attending Physician (Clinical Order Review):* Dr. Alcantara, MD (Attending Pulmonologist).
  * *Medical Gas Depot (Materials Provider):* Ilocos Medical & Industrial Gases Depot.
  * *Hazmat Transporter (Transit Provider):* Kuya Edgar Heavy Cargo Trike.
  * *Respiratory Technician (Labor Provider):* Mark, EMT-B (Home Respiratory Care Tech).

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-OXYGEN-012 (Emergency Medical Oxygen Delivery & Calibration - Farola)  │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Clinical Verification │ ORD-O2-12A (Dr. Alcantara Tele-Order Review)           │
│                               │ - Verification of flow prescription (2.0L/min) & tank  │
│                               │ Amount: ₱150.00 | Shape: A3 Specialist | Fact: Cleared │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Medical Oxygen Supply │ ORD-O2-12B (Ilocos Medical & Industrial Gases Depot)   │
│                               │ - Full 50-lb USP oxygen cylinder, sealed valve cap     │
│                               │ Amount: ₱950.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Hazmat Cylinder Ride  │ ORD-O2-12C (Kuya Edgar Heavy Cargo Trike)              │
│                               │ - Upright secure transport with chain restraints       │
│                               │ Amount: ₱250.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: Technical Setup Labor │ ORD-O2-12D (Mark, EMT-B - Respiratory Technician)      │
│                               │ - Tank exchange, brass regulator seating, surfactant   │
│                               │   leak test, flow calibration, vitals check            │
│                               │ Amount: ₱600.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Prescription Check:** Confirm active medical prescription and target flow rate; record baseline patient SpO2.
2. **Cylinder Reception:** Verify delivered cylinder has intact tamper-evident seal and valid hydrostatic test stamp.
3. **Cylinder Demount & Valve Inspection:** Disconnect empty tank; inspect valve threads on new tank for cleanliness.
4. **Regulator Installation & Leak Test (Gated):** Seat regulator with new sealing washer; tighten nut; open valve; apply surfactant leak-test fluid to all joints; verify zero bubbles.
5. **Flow Calibration & Sign-Off:** Set flowmeter to prescribed flow rate; connect sterile nasal cannula; confirm patient SpO2 stabilizes; caregiver signs safety sheet.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Respiratory tech travels to patient to monitor airway stability while cargo trike transports cylinder from depot.
* **Join:** Predecessor facts (`NEED-O2-PRESCRIPTION: physician_order_verified` AND `NEED-OXYGEN-CYLINDER: delivered_to_site`) $\rightarrow$ unblocks target step `mount_regulator_and_pressurize`.
* **Approval:** Caregiver reviews delivered cylinder valve seal and signs authorization modal: "Cylinder inspection verified; authorized to seat regulator and calibrate oxygen delivery."
* **Diagnostic Pause:**
  * `IF` leak test reveals bubbling or damaged regulator threads:
  * `THEN` execute **Hard Technical Stop**. All improvisations (e.g., plumber's tape on high-pressure oxygen fittings) are strictly prohibited due to combustion risk. Technician halts pressurization; initiates emergency regulator hot-swap dispatch; if patient SpO2 drops critically, technician initiates immediate emergency medical ambulance dispatch.
* **Sidecar Errand:** If the plastic humidifier bottle is damaged, technician orders a replacement sterile bottle from medical supply depot.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders have distinct terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If the patient requires emergency ambulance evacuation before regulator setup, technician labor converts to an emergency triage attendance fee and the balance is cancelled and released, ensuring financial concerns do not impede emergency care.

---

### Use Case 13: Leather Shoe & Luxury Bag Restoration, Sole Replacement & Stitching

#### 1. Title & Real-World Municipal Scenario
* **Title:** Leather Footwear Welt Re-Soling & Luxury Handbag Restoration
* **Setting:** Barangay Poblacion West, Tagudin, Ilocos Sur. A resident submits Goodyear-welted leather shoes with worn outsoles and a leather handbag with edge scuffs and stains for workshop restoration.
* **Participants:**
  * *Customer (Buyer):* Dra. Marilou T., municipal doctor.
  * *Cobbler / Artisan (Labor Provider):* Mang Boni Leather Artistry Workshop.
  * *Materials Merchant (Materials Provider):* Candon Shoe Findings & Leathercraft Supply.
  * *White-Glove Courier (Transit Provider):* Kuya Kevin White-Glove Runner.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-LEATHER-013 (Luxury Leathergoods Restoration - Poblacion West)         │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Inbound Custody Ride  │ ORD-LTR-13A (Kuya Kevin White-Glove Runner)            │
│                               │ - Tagged, tamper-evident bag collection to workshop    │
│                               │ Amount: ₱130.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Findings & Soles      │ ORD-LTR-13B (Candon Shoe Findings & Leathercraft)      │
│                               │ - Vibram dress half-soles, welt, barge cement, dyes    │
│                               │ Amount: ₱680.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Cobbler Artistry Labor│ ORD-LTR-13C (Mang Boni Leather Artistry Workshop)      │
│                               │ - De-soling, cork bed renewal, lock-stitch outsole     │
│                               │   sewing, stain extraction, recoloring, edge burnishing│
│                               │ Amount: ₱1,850.00 | Shape: A1 Trade Labor | Fact: Done │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: Outbound Return Ride  │ ORD-LTR-13D (Kuya Kevin White-Glove Runner)            │
│                               │ - Delivery of restored items in flannel dust covers    │
│                               │ Amount: ₱130.00 | Shape: A4 Transit | Fact: delivered  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Photo Documentation:** Inspect leather surfaces, seams, and sole wear; photograph existing condition from multiple angles.
2. **De-Soling & Cleaning:** Remove worn outsoles; clean inner footbed; clean handbag leather with pH-neutral leather cleanser.
3. **Sole Installation (Gated):** Await arrival of replacement soles; apply adhesive; stitch sole along welt line with heavy-duty lock-stitcher.
4. **Conditioning & Edge Burnishing:** Condition leather; burnish sole edges with wax; allow proper curing time.
5. **Final Review & Outbound Delivery:** Photograph completed work; package in protective bags; courier delivers to customer for sign-off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Cobbler cleans and conditions the handbag while courier travels to source the replacement soles.
* **Join:** Predecessor facts (`NEED-VIBRAM-SOLES: delivered_to_site` AND `NEED-OLD-SOLE-STRIPPED: welt_prepped`) $\rightarrow$ unblocks target step `apply_adhesive_and_stitch_welt`.
* **Approval:** Customer reviews digital macro photographs of color-matched dye test swatch and confirms approval before full vamp dye application.
* **Diagnostic Pause:**
  * `IF` de-soling reveals that the internal steel shank is snapped in half:
  * `THEN` execute Diagnostic Pause. Cobbler uploads photo of fractured shank; proposes shank replacement variance.
  * `ELSE IF` customer declines: cobbler refuses sole attachment on broken shank due to structural failure risk; shoes returned disassembled with triage fee charged.
* **Sidecar Errand:** Customer requests a pair of cedar shoe trees; cobbler dispatches a courier to purchase them from a department store.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders carry separate settlement terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If the supplier delivers the wrong sole size, the supplier bears re-delivery costs; cobbler's labor schedule is protected via an automatic SLA extension without financial penalty to the customer.

---

### Use Case 14: Debut Bridal Glam Hair & Makeup Artist with Touch-Up Assistant

#### 1. Title & Real-World Municipal Scenario
* **Title:** Event Hair & Makeup Artistry with On-Site Reception Touch-Up Assistance
* **Setting:** Barangay Cabugaoan, Tagudin, Ilocos Sur. A family books professional makeup artistry, formal hairstyling, and an on-site touch-up assistant for an evening debut celebration.
* **Participants:**
  * *Client (Buyer):* Kristine Joy & Mrs. Cynthia P.
  * *Lead Makeup Artist (Labor Provider):* Master Glam by Dennis.
  * *Touch-Up Assistant (Labor Provider):* Assistant Sarah.
  * *Cosmetics Merchant (Materials Provider):* Ilocos Professional Beauty Supply.
  * *Van Transport (Transit Provider):* Kuya Jomar Van Express.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-BEAUTY-014 (Debutante Grand Entrance Artistry - Brgy. Cabugaoan)       │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Cosmetics Sourcing    │ ORD-GLM-14A (Ilocos Professional Beauty Supply)        │
│                               │ - Airbrush foundation pods, 3D faux mink lashes, pins  │
│                               │ Amount: ₱1,000.00 | Shape: A4 Handoff | Fact: collected│
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Equipment Transport   │ ORD-GLM-14B (Kuya Jomar Van Express)                   │
│                               │ - Vanity mirrors, compressor, ring lights, trunks      │
│                               │ Amount: ₱350.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Lead Artist Labor     │ ORD-GLM-14C (Master Glam by Dennis)                    │
│                               │ - Prep, airbrush foundation, contour, lash styling     │
│                               │ Amount: ₱4,500.00 | Shape: A1 Trade Labor | Fact: Done │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: Touch-Up Standby Labor│ ORD-GLM-14D (Touch-Up Assistant Sarah)                 │
│                               │ - 6-hour reception standby, wardrobe fluffing, blotting│
│                               │ Amount: ₱1,200.00 | Shape: A1 Trade Labor | Fact: Done │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Skin Assessment:** Cleanse face; inspect skin condition; apply hydrating primer; plan hairstyle sections.
2. **Hairstyling:** Thermal curl hair in sections; pin into place to set.
3. **Airbrush Application (Gated):** Connect mini compressor; apply airbrush foundation mist; complete eye and lip styling.
4. **Lash Setting & Hair Finalization:** Apply cluster lashes; release and style hair curls; apply setting mist.
5. **Flash Photo Check & Assistant Handoff:** Test photos under flash lighting to check for powder reflection; client approves; assistant takes over reception watch.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Lead artist sections and curls hair while assistant steams gowns, arranges beauty trunks, and prepares vanity ring lights.
* **Join:** Predecessor facts (`NEED-AIRBRUSH-PODS: delivered_to_site` AND `NEED-SKIN-PREPARATION: primer_set`) $\rightarrow$ unblocks target step `apply_airbrush_foundation`.
* **Approval:** Celebrant inspects completed eye makeup, lip tone, and hair contour in vanity mirror, approving grand entrance appearance.
* **Diagnostic Pause:**
  * `IF` client exhibits acute allergic dermatitis or severe eye infection:
  * `THEN` execute **Hard Safety Stop**. Application of airbrush chemicals or eye cosmetics is halted to prevent eye injury. Gentle mineral powder used if safe, or service aborted with medical referral.
* **Sidecar Errand:** If an emergency replacement hair accessory is needed, assistant dispatches a courier to town.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders maintain distinct payment obligations. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** Once the lead artist completes the initial glam and client signs off, the lead artist's payment obligation settles. The assistant's obligation settles upon conclusion of the reception, keeping lead artist compensation independent from event duration.

---

### Use Case 15: Post-Stroke Physical Therapy Rehabilitation Home Exercise Visit

#### 1. Title & Real-World Municipal Scenario
* **Title:** In-Home Post-Stroke Physical Therapy & Bedside Functional Rehabilitation
* **Setting:** Barangay Magsaysay, Tagudin, Ilocos Sur. A recovering post-stroke patient with unilateral weakness requires in-home physical therapy, mobility training, and gait re-education per physiatrist protocol.
* **Participants:**
  * *Patient / Family (Buyer):* Mang Danilo & Daughter Grace.
  * *Physiatrist (Clinical Protocol Review):* Dr. Alcantara, PTRP/MD.
  * *Physical Therapist (Labor Provider):* PTRP Michael (Licensed Physical Therapist).
  * *Rehabilitation Supplier (Materials Provider):* Candon Orthopedic & Physical Therapy Supplies.
  * *Local Courier (Transit Provider):* Kuya Allan Trike.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-REHAB-015 (Bedside Neuro-Rehabilitation Therapy - Brgy. Magsaysay)     │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Physiatry Protocol    │ ORD-RHB-15A (Dr. Alcantara Clinical Review)            │
│                               │ - Brain imaging review, FIM parameters, vital limits   │
│                               │ Amount: ₱150.00 | Shape: A3 Specialist | Fact: Cleared │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Therapy Consumables   │ ORD-RHB-15B (Candon Orthopedic & PT Supplies)          │
│                               │ - Theraband loops, non-slip gait belt, TENS electrodes │
│                               │ Amount: ₱560.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Plinth & Gear Transit │ ORD-RHB-15C (Kuya Allan Trike)                         │
│                               │ - Transport of folding therapy plinth and TENS machine │
│                               │ Amount: ₱130.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: PT Clinical Labor     │ ORD-RHB-15D (PTRP Michael - Physical Therapist)        │
│                               │ - Vitals check, spasticity reduction, bed mobility,    │
│                               │   assisted standing, gait coaching, caregiver training │
│                               │ Amount: ₱870.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Vitals Check:** Measure blood pressure, heart rate, oxygen saturation; evaluate resting muscle tone and joint mobility.
2. **Equipment Preparation:** Receive gait belt and resistance bands; set up portable therapy table.
3. **Passive & Active-Assisted Mobilization:** Perform gentle passive range of motion exercises to prevent limb stiffness; apply neuromuscular stimulation as indicated.
4. **Functional Mobility Practice:** Use gait transfer belt to assist patient through safe bed-to-chair transfers and standing balance exercises.
5. **Caregiver Instruction & Sign-Off:** Teach family proper lifting technique; log session accomplishments; caregiver signs session log.

#### 4. n8n Conditional Logic & Gates
* **Fork:** PT Michael coaches the family on bed mobility and repositioning while Kuya Allan transports the therapy table and resistance loops.
* **Join:** Predecessor facts (`NEED-GAIT-BELT: delivered_to_site` AND `NEED-VITALS-CHECK: vitals_cleared`) $\rightarrow$ unblocks target step `execute_standing_transfers_and_gait`.
* **Approval:** Family caregiver verifies resting vitals log and signs consent modal: "Patient vital signs cleared; authorized to proceed with assisted standing and transfer drills."
* **Diagnostic Pause:**
  * `IF` patient complains of sudden calf pain and shows unilateral leg warmth and swelling (indicative of Deep Vein Thrombosis), or resting $BP \ge 180/110\,\text{mmHg}$:
  * `THEN` execute **Immediate Clinical Halt**. Exercise and leg mobilization are strictly halted to avoid pulmonary embolism. Engine triggers emergency medical hospital referral. Triage fee captured; remaining labor obligation cancelled and released.
* **Sidecar Errand:** If rubber tips on patient's walker are worn through, therapist orders new non-slip tips from the pharmacy.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders have independent settlement rules. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If a session is halted during intake due to elevated vitals, delivered supplies remain patient property; therapist receives an intake assessment fee, and unrendered therapy balance is cancelled and released.

---

### Use Case 16: Senior Citizen Wheelchair Wheel Replacement with Clinic Spare Parts

#### 1. Title & Real-World Municipal Scenario
* **Title:** Manual Wheelchair Wheel, Bearing & Tire Replacement
* **Setting:** Barangay Garitan, Tagudin, Ilocos Sur. A senior resident’s manual folding wheelchair has worn solid rubber tires and seized wheel bearings, hindering daily indoor and outdoor mobility.
* **Participants:**
  * *Customer (Buyer):* Ferdinand E., grandson and caregiver.
  * *Mobility Mechanic (Labor Provider):* Kuya Boyet Mobile Mobility Repair.
  * *Medical Depot (Materials Provider):* Ilocos Orthocare & Wheelchair Depot.
  * *Cargo Courier (Transit Provider):* Kuya Danny Express Trike.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-WHEEL-016 (Wheelchair Overhaul & Solid Tire Fitting - Brgy. Garitan)   │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Clinic Spare Parts    │ ORD-WHL-16A (Ilocos Orthocare & Wheelchair Depot)      │
│                               │ - 2x 24in solid polyurethane tires, 4x sealed bearings │
│                               │ Amount: ₱1,480.00 | Shape: A4 Handoff | Fact: collected│
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Bulky Parts Transit   │ ORD-WHL-16B (Kuya Danny Express Trike)                 │
│                               │ - Rapid transport of tires & hardware to residence     │
│                               │ Amount: ₱160.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Mechanical Overhaul   │ ORD-WHL-16C (Kuya Boyet Mobile Mobility Repair)        │
│                               │ - Wheel unmounting, bearing press extraction, solid tire│
│                               │   stretching, spoke truing, brake calibration, roll test│
│                               │ Amount: ₱670.00 | Shape: A1 Trade Labor | Fact: Done   │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Frame Inspection:** Inspect wheelchair chassis, folding mechanism, axle bolts, and brake clamps for structural soundness.
2. **Disassembly:** Unbolt rear wheels; remove old bearings and worn tires; clean axle housing.
3. **Bearing & Tire Mounting (Gated):** Await delivery of replacement parts; press new bearings into wheel hubs; mount solid tires to rims.
4. **Re-assembly & Brake Tuning:** Reattach wheels to frame; torque axle bolts; adjust parking brake shoes to grip new tires firmly.
5. **Roll Test & Sign-Off:** Perform manual roll and brake hold test; customer verifies smooth rolling and signs off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Kuya Boyet degreasers the wheel axle sleeves and tunes front casters while Courier Danny collects 24-inch solid tires from the clinic depot.
* **Join:** Predecessor facts (`NEED-WHEEL-PARTS: delivered_to_site` AND `NEED-AXLE-CLEANING: hub_prepared`) $\rightarrow$ unblocks target step `press_bearings_and_mount_tires`.
* **Approval:** Customer inspects extracted old damaged bearings and confirms approval modal: "Bearing condition inspected; authorized to install new sealed bearing assemblies."
* **Diagnostic Pause:**
  * `IF` intake inspection reveals a cracked main frame crossbar or bent axle mounting tube:
  * `THEN` execute **Hard Safety Stop**. Mounting new wheels on a compromised structural frame is prohibited due to collapse danger. Mechanic red-tags the wheelchair, refuses wheel installation, and refers customer to an orthopedic workshop. Triage inspection fee captured; remaining labor cancelled and released.
* **Sidecar Errand:** If axle locknuts show stripped threads, mechanic orders replacement nylon locknuts from the hardware store.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders operate under independent payment terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If the supplier provides incorrect diameter tires, the parts order enters `replacement_needed`. Mechanic's labor SLA is extended without penalty, and the supplier covers re-delivery costs.

---

### Use Case 17: Hand-Drawn Calligraphy Wedding Invitation Suite with Wax Delivery

#### 1. Title & Real-World Municipal Scenario
* **Title:** Bespoke Pointed-Pen Calligraphy Envelopes & Wax-Sealed Delivery
* **Setting:** Barangay Bucao East, Tagudin, Ilocos Sur. A couple commissioning 100 custom hand-lettered wedding envelopes on handmade deckled-edge cotton paper with botanical wax seal stamping.
* **Participants:**
  * *Customer (Buyer):* Alyssa M., bride.
  * *Calligrapher (Labor Provider):* Scripted Elegance Studio by Camille.
  * *Paper Mill / Supplier (Materials Provider):* Manila Artisan Paper Co. / Tagudin Fine Arts.
  * *Waterproof Courier (Transit Provider):* Kuya Jayson Waterproof Document Transport.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-CRAFT-017 (Calligraphy Envelopes & Botanical Wax Seals - Bucao East)   │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Paper & Wax Sourcing  │ ORD-CRF-17A (Manila Artisan Paper Co. / Tagudin Arts)  │
│                               │ - 110x 250gsm deckled cotton envelopes, gold gouache   │
│                               │ Amount: ₱1,150.00 | Shape: A4 Handoff | Fact: collected│
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Raw Material Transit  │ ORD-CRF-17B (Kuya Jayson Waterproof Courier)           │
│                               │ - Sealed waterproof transit of paper stock to studio   │
│                               │ Amount: ₱130.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Calligraphy & Sealing │ ORD-CRF-17C (Scripted Elegance Studio by Camille)      │
│                               │ - Pointed-pen copperplate lettering, wax melting,      │
│                               │   botanical seal impression, orthographic proofing     │
│                               │ Amount: ₱2,850.00 | Shape: A1 Trade Labor | Fact: Done │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 4: Finished Goods Transit│ ORD-CRF-17D (Kuya Jayson Waterproof Courier)           │
│                               │ - Boxed velvet-lined delivery of suites to bride home  │
│                               │ Amount: ₱150.00 | Shape: A4 Transit | Fact: delivered  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Name List Formatting:** Review guest names and formal titles from client list; prepare layout guidelines.
2. **Paper Preparation (Gated):** Receive handmade paper; mix gold calligraphy ink to proper consistency.
3. **Calligraphy Lettering:** Hand-letter guest names on envelopes using pointed dip pen; allow ink to dry thoroughly.
4. **Wax Seal Stamping:** Melt wax; pour on envelope flap; press custom brass monogram seal.
5. **Spelling Verification & Delivery:** Cross-check each envelope against master guest list; pack in rigid box; deliver to bride for final sign-off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Camille aligns guidelines and tests metallic ink flow on scrap sheets while Courier Jayson transports the handmade cotton paper envelopes.
* **Join:** Predecessor facts (`NEED-DECKLED-PAPER: delivered_to_site` AND `NEED-GUEST-LIST-PARSE: names_standardized`) $\rightarrow$ unblocks target step `execute_pointed_pen_lettering`.
* **Approval:** Customer reviews high-resolution photo of three sample envelopes and confirms: "Calligraphy slant, script style, and gold ink shade approved for full batch."
* **Diagnostic Pause:**
  * `IF` client provides an updated list adding 15 new guest names mid-production:
  * `THEN` execute Scope Variance; calculate additional cost for extra envelopes and lettering; wait for client confirmation.
  * `ELSE IF` declined: artist completes the contracted 100 envelopes.
* **Sidecar Errand:** If wax beads run low near the end of the batch, artist orders supplementary wax sticks from a local craft shop.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders hold separate payment terms. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** If heavy rain delays the final delivery, completed invitations remain safely packed in a sealed waterproof container. Courier SLA is adjusted for weather; artist labor settles upon verified delivery without risk to material payments.

---

### Use Case 18: House Move-In Deep Sanitation & Disinfection with Specialist Ozone Treatment

#### 1. Title & Real-World Municipal Scenario
* **Title:** Move-In Deep Surface Sanitation, Disinfection & Specialist-Controlled Ozone Odor Treatment
* **Setting:** Barangay Pao, Tagudin, Ilocos Sur. A newly renovated residential property requires comprehensive physical cleaning, particulate vacuuming, surface sanitization, and an optional specialist-controlled ozone gas application strictly for neutralizing persistent localized malodors. In accordance with public health advisories (e.g., US EPA guidance on indoor ozone devices), ozone is treated as a hazardous substance ineffective for mold or particulate remediation at safe levels; its use is strictly restricted to an unoccupied space protocol followed by mandatory mechanical exhaust and calibrated air monitoring before re-entry.
* **Participants:**
  * *Homeowner (Buyer):* Dr. Edwin L., property owner.
  * *Sanitation & Environmental Specialist (Labor Provider):* Tagudin Bio-Sanitize Masters.
  * *Chemical Supplier (Materials Provider):* Northern Luzon Environmental Safety Solutions.
  * *Equipment Logistics (Transit Provider):* CleanPro Heavy Van Logistics.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-SAN-018 (Move-In Decontamination & Odor Neutralization - Brgy. Pao)    │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Chemical & PPE Sourcing│ ORD-SAN-18A (Northern Luzon Environmental Safety)      │
│                               │ - Hospital disinfectant, surface wipes, vapor filters  │
│                               │ Amount: ₱720.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Equipment Logistics   │ ORD-SAN-18B (CleanPro Heavy Van Logistics)             │
│                               │ - Van delivery of commercial HEPA vacs, exhaust blowers│
│                               │ Amount: ₱320.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Sanitation Labor      │ ORD-SAN-18C (Tagudin Bio-Sanitize Masters)             │
│                               │ - Surface washing, HEPA vacuuming, ULV misting, method │
│                               │   statement ozone run, mechanical exhaust, sensor check│
│                               │ Amount: ₱2,550.00 | Shape: A1 Trade Labor | Fact: Done │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake, Physical Inspection & Method Statement:** Inspect all rooms; evaluate physical dirt, grime, and specific odor sources; prepare specialist method statement detailing whether ozone odor treatment is necessary, treating area boundaries, and ventilation plans.
2. **Physical Deep Cleaning & Surface Disinfection:** Vacuum dust and particulates with HEPA vacuum; wash hard surfaces and wipe fixtures with disinfectant solution.
3. **Pre-Treatment Gate & Site Evacuation Verification:** If ozone cycle is approved in the method statement, confirm 100% vacancy (zero humans, pets, or sensitive houseplants); post exterior hazard notices; seal internal zone doorways.
4. **Controlled Ozone Treatment & Mechanical Ventilation:** Operate portable ozone unit for the minimum calibrated duration specified in the method statement; immediately engage high-volume mechanical exhaust blowers to ventilate room air directly to the outside.
5. **Calibrated Air Measurement & Turnover:** Measure indoor air with a calibrated electrochemical gas sensor; verify ozone concentration has decayed below standard occupational safety limits before removing warning signs and clearing re-entry.

#### 4. n8n Conditional Logic & Gates
* **Fork:** While the technician sets up HEPA air filtration and masks perimeter HVAC registers, the equipment van driver unloads negative-air exhaust ducts and surface disinfectants.
* **Join:** Predecessor facts (`NEED-METHOD-STATEMENT: specialist_method_approved` AND `NEED-EVACUATION-TOKEN: site_100_percent_vacant` AND `NEED-HAZMAT-PPE: delivered_to_site`) $\rightarrow$ unblocks target step `energize_controlled_ozone_cycle`.
* **Approval:** Homeowner reviews method statement and signs **Premises Evacuation & Treatment Authorization**: "I confirm premises are 100% evacuated of all people, pets, and plants; authorized to initiate sealed odor treatment."
* **Diagnostic Pause:**
  * `IF` crew detects active mold colonies, water infiltration, or drywall rot during surface cleaning:
  * `THEN` execute **Diagnostic Pause**. Crew informs owner that ozone cannot remediate mold or water damage; flags the issue for structural repair/remediation; proposes physical mold containment variance or omits affected zone from service.
* **Sidecar Errand:** If additional surface disinfectant or heavy-duty trash liners are needed, an on-demand courier fetches them from town.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders carry separate settlement rules. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** Consumables and equipment transit evaluate to settled upon verified site delivery evidence. If an electrical outage interrupts mechanical exhaust blowers, the site remains locked and designated hazardous; once power returns, the full ventilation and sensor verification cycle must complete before re-entry clearance, keeping equipment and chemical obligations legally isolated.

---

### Use Case 19: Personal Grocery Shopper with Public Market Itemized Receipt Audit

#### 1. Title & Real-World Municipal Scenario
* **Title:** Dedicated Public Market Grocery Procurement & Doorstep Delivery
* **Setting:** Barangay Del Rosario, Tagudin, Ilocos Sur. A busy resident commissions a personal shopping concierge for fresh meat, fish, native vegetables, and dry staples at the Tagudin Public Market.
* **Participants:**
  * *Customer (Buyer):* Michelle B., resident.
  * *Market Stalls (Materials Providers):* Tagudin Wet & Dry Market Vendors Association.
  * *Personal Shopper (Labor Provider):* Ate Janice Market Concierge.
  * *Cargo Logistics (Transit Provider):* Kuya Wilson Heavy Cargo Tricycle.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-GROCERY-019 (Fresh Market Provisioning & Hauling - Del Rosario)        │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Market Basket Goods   │ ORD-MKT-19A (Tagudin Wet & Dry Market Vendors)         │
│                               │ - Fresh yellowfin tuna, pork cuts, highland vegetables,│
│                               │   native garlic/onions, 25kg Sinandomeng rice sack     │
│                               │ Amount: ₱3,250.00 | Shape: A4 Handoff | Fact: receipt  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Personal Shopper Labor│ ORD-MKT-19B (Ate Janice Market Concierge)              │
│                               │ - 2-hr stall haggling, produce inspection, price audit │
│                               │ Amount: ₱380.00 | Shape: A1 Trade Labor | Fact: Done   │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: Cargo Transit Haul    │ ORD-MKT-19C (Kuya Wilson Heavy Cargo Trike)            │
│                               │ - Insulated crate & rice transport to kitchen counter  │
│                               │ Amount: ₱160.00 | Shape: A4 Transit | Fact: delivered  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Shopping List Review:** Review requested items, cuts, and acceptable substitutions with customer.
2. **Market Sourcing:** Purchase fresh meat and fish; select fresh produce; collect rice sack.
3. **Receipt Compilation:** Collect vendor receipts and tally total expenditures against authorized budget.
4. **Packing & Loading:** Pack cold items with ice; load groceries into transport tricycle.
5. **Delivery & Customer Verification:** Transport groceries to customer home; customer checks items against list and receipts; signs off.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Shopper selects fresh fish and vegetables at market stalls while cargo courier collects the heavy 25kg rice sack from the grain wholesaler.
* **Join:** Predecessor facts (`NEED-MARKET-STALLS: items_purchased` AND `NEED-RECEIPTS: tally_reconciled`) $\rightarrow$ unblocks target step `dispatch_cargo_tricycle_to_residence`.
* **Approval:** If a requested fish variety is unavailable, shopper uploads photo and price of alternative catch; customer taps instant mobile approval before purchase.
* **Diagnostic Pause:**
  * `IF` seasonal market price increases exceed the estimated grocery budget by $>20\%$:
  * `THEN` execute Budget Variance Pause; shopper sends updated basket estimate for customer approval.
  * `ELSE IF` customer declines: shopper buys adjusted quantities to remain within pre-authorized budget.
* **Sidecar Errand:** Customer asks shopper to stop by a specific bakery for bread rolls on the way to delivery.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** The grocery purchase obligation captures the exact verified receipt total; remaining uncaptured authorization is released back to the buyer's account. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** Shopper service fee and transit fee settle upon successful home delivery evidence, even if certain market items were out of stock.

---

### Use Case 20: Certified Public Accountant Tax Book Audit with BIR Filing

#### 1. Title & Real-World Municipal Scenario
* **Title:** In-Office Accounting Ledger Examination & Electronic Tax Return Filing
* **Setting:** Barangay Central East, Tagudin, Ilocos Sur. A local commercial trading business requires on-site reconciliation of sales registers, expense vouchers, and accounting journals, followed by quarterly Bureau of Internal Revenue (BIR) tax return preparation and electronic filing.
* **Participants:**
  * *Business Owner (Buyer):* Jonathan S., Managing Director, Ilocos North Star Trading.
  * *Certified Public Accountant (Labor Provider):* CPA Michelle D., CPA (Accredited BIR Tax Practitioner).
  * *Secure Document Courier (Transit Provider):* Kuya Ronald Secure Courier.
  * *Office Supplies Partner (Materials Provider):* Bio Legal & BIR Filing Supplies.

#### 2. Macro Deal Chain
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEAL CHAIN: DCH-TAX-020 (Quarterly Tax Audit & BIR eFPS Submission - Central East)     │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Node 1: Filing Supplies Depot │ ORD-TAX-20A (Bio Legal & BIR Filing Supplies)          │
│                               │ - Tax compliance folios, documentary stamps, CTC print │
│                               │ Amount: ₱380.00 | Shape: A4 Handoff | Fact: collected  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 2: Secure Ledger Transit │ ORD-TAX-20B (Kuya Ronald Secure Courier)               │
│                               │ - Sealed locked box pickup & transport of journals     │
│                               │ Amount: ₱160.00 | Shape: A4 Transit | Fact: delivered  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Node 3: CPA Audit Labor       │ ORD-TAX-20C (CPA Michelle D., CPA)                     │
│                               │ - Voucher examination, input/output VAT reconciliation,│
│                               │   withholding tax check, 2550Q / 1702Q eFPS submission │
│                               │ Amount: ₱4,600.00 | Shape: A3 Specialist | Fact: Done  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### 3. Micro Work Pipeline
1. **Intake & Document Custody:** Log received receipt booklets and accounting ledgers; sign custody transfer record.
2. **Voucher & Ledger Examination:** Cross-check sales invoices and expense vouchers against bank statements; calculate allowable input tax.
3. **Tax Return Drafting:** Calculate net tax payable or excess credits; draft quarterly tax return forms.
4. **Client Review & Approval (Gated):** Present draft tax returns to business owner; obtain signed authorization to file.
5. **Electronic Submission & Acknowledgment:** Submit tax returns through official electronic filing portal; download confirmation receipt; return accounting books to client.

#### 4. n8n Conditional Logic & Gates
* **Fork:** Courier transports boxed physical ledgers from warehouse while CPA accesses historical electronic filings and configures audit spreadsheets.
* **Join:** Predecessor facts (`NEED-PHYSICAL-LEDGERS: delivered_to_office` AND `NEED-POS-LOGS: exported_to_cpa`) $\rightarrow$ unblocks target step `finalize_tax_computation_and_returns`.
* **Approval:** Business owner reviews tax figures and signs digital authorization modal before official electronic filing submission.
* **Diagnostic Pause:**
  * `IF` examination reveals unrecorded sales or missing official receipts exceeding normal variance:
  * `THEN` execute Audit Diagnostic Pause; CPA issues accounting findings memo; proposes comprehensive book reconstruction variance.
  * `ELSE IF` owner declines: CPA prepares return based strictly on verifiable records, noting scope limitations.
* **Sidecar Errand:** If an urgent certified document must be retrieved from the municipal treasurer, courier is dispatched on a sidecar errand.

#### 5. Child Order Payment Obligations & Failure Isolation
* **Bilateral Payment Obligations:** Sibling child orders hold distinct payment obligations. Delivery records evidence; snapshotted rules determine payment eligibility.
* **Failure Isolation:** CPA professional labor is insulated from external tax portal downtime. If the government filing portal experiences technical outages on filing deadline night, the completed audit labor obligation remains valid, while the system creates an automated task for next-morning submission retry without double-charging the client.

---

### Master Architecture & Invariant Synthesis Matrix

| # | Use Case Title | Barangay Setting | Macro Nodes (Providers) | Primary Predecessor Facts $\rightarrow$ Target Step (Join) | Approval Gate Boundary | Diagnostic Pause / Hard Stop Trigger | Failure Isolation Guarantee |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Haircut & Rebonding | Del Pilar | Materials, Transit, Stylist | `NEED-CHEM-DELIVERY: delivered` + `NEED-VENTILATION: verified` $\rightarrow$ `apply_chemical_softener` | Strand test confirmation before thermal iron | Scalp lesions / chemical breakage $\rightarrow$ Hard stop; diagnostic fee only | Sibling courier transit failure isolated; merchant replacement under courier terms |
| **2** | Prenatal Hilot | Libtong | Clinic, Botanicals, Courier, Hilot | `NEED-OB-CLEARANCE: cleared` + `NEED-HERBS-DELIVERY: delivered` $\rightarrow$ `warm_compress_application` | Ergonomic pillow support & compress consent | Maternal $BP \ge 140/90$ or spotting $\rightarrow$ Clinical halt; no waivers | Cut herbs & transit settle upon delivery; unrendered labor released to mother |
| **3** | Bedridden Nurse Visit | Rizal | MD Review, Pharmacy, Courier, Nurse | `NEED-MD-ORDER: verified` + `NEED-DRESSING-SUPPLIES: delivered` $\rightarrow$ `catheter_wound_dressing` | Sterile packaging seal inspection sign-off | Hematuria / severe wound necrosis $\rightarrow$ Clinical escalation halt | Sterile supplies & delivery settle; relief nurse assigned under replacement need |
| **4** | Mobile Dog Grooming | Poblacion Centro | Vet Review, Supplies, Groomer | `NEED-VET-RABIES-AUDIT: verified` + `NEED-GROOMING-SUPPLIES: delivered` $\rightarrow$ `load_pet_into_van` | Pre-grooming plan & claw trim authorization | Expired rabies / pyoderma $\rightarrow$ Service lockout; no washing of infected skin | Vet review fee settles; groomer trip fee settles; remaining labor released |
| **5** | Graduation Tailoring | Quirino | Haberdashery, Courier, Tailor | `NEED-THREAD-DELIVERY: delivered` + `NEED-FIT-ASSESSMENT: completed` $\rightarrow$ `cut_and_serge_fabric` | Pinned chalk line confirmed before cutting | Seam dry rot $\rightarrow$ Stay-tape variance; basting only if rejected | Machine breakdown leaves delivered thread intact; relief seamstress dispatched |
| **6** | Notary Public Signing | Bio | Paper Hub, Notary, Runner | `NEED-PRINTED-DEEDS: delivered` + `NEED-IDENTITY-CHECK: verified` $\rightarrow$ `administer_oath_and_seal` | Signatories sworn consent modal | Impaired capacity / duress $\rightarrow$ Notarial refusal memorandum | Municipal hall shutdown isolates notary fee; runner SLA auto-extended |
| **7** | Passport/ID Photo | Ambalayat | Imaging Depot, Courier, Studio | `NEED-PRINT-MEDIA: delivered` + `NEED-RAW-CAPTURE: approved` $\rightarrow$ `execute_thermal_printing` | Camera preview approval before print | Involuntary tremor $\rightarrow$ Assistive setup variance | Trail mud halts courier; RAW shots cached; media obligation stays intact |
| **8** | Math & Physics Tutor | Bitalag | Print Shop, E-bike, Tutor | `NEED-PRINTED-WORKSHEETS: delivered` + `NEED-THEORY-REVIEW: done` $\rightarrow$ `start_timed_mock_drills` | Topic plan approved before timed tests | Prerequisite algebra failure $\rightarrow$ Remediation variance | Late tutor discounts own fee; print shop & courier settled on delivery |
| **9** | Sofa Steam Extraction| Dacutan | Janitorial, Van, Clean Crew | `NEED-EXTRACTION-ENZYME: delivered` + `NEED-COLORFAST-CHECK: passed` $\rightarrow$ `inject_hot_solution` | Colorfast patch test confirmation | Internal wooden frame rot $\rightarrow$ Frame repair variance | Water supply failure partitions labor 50/50; van & chemicals settled |
| **10**| Wash-Dry-Fold Laundry | Pallogan | In-Courier, FMCG, Wash Hub, Out-Courier| `NEED-LAUNDRY-WORK: packaged` + `NEED-WEIGHT-SCALE: reconciled` $\rightarrow$ `dispatch_outbound_courier` | Valuables found in pockets photo approval | Heavy mud stains $\rightarrow$ Pre-soak stain variance | Transit breakdown creates replacement courier; wash hub fee protected |
| **11**| Senior Med Pabili | Baracbac | Errand Courier, Mercury Drug, Return | `NEED-PRESCRIPTION-AUDIT: uploaded` + `NEED-PRICE-CONFIRMATION: approved` $\rightarrow$ `dispatch_cold_return` | Itemized receipt with senior discount approval | Medicine stockout $\rightarrow$ Bioequivalent generic variance | Out of stock cancels medicine obligation; courier collection trip fee settled |
| **12**| Medical Oxygen Setup | Farola | Pulmonologist, Gas Depot, Trike, EMT | `NEED-O2-PRESCRIPTION: verified` + `NEED-OXYGEN-CYLINDER: delivered` $\rightarrow$ `mount_regulator_and_pressurize`| Cylinder seal & tank inspection approval | Regulator thread bubble leak $\rightarrow$ Hard stop; hot-swap dispatched | Emergency hospitalization converts labor to triage fee; depot/trike settled |
| **13**| Leather Restoration | Poblacion West | In-Transit, Findings, Cobbler, Out-Transit| `NEED-VIBRAM-SOLES: delivered` + `NEED-OLD-SOLE-STRIPPED: prepped` $\rightarrow$ `apply_adhesive_and_stitch` | Color test swatch confirmed before dying | Fractured steel shank $\rightarrow$ Shank replacement variance | Wrong sole model returns at vendor cost; cobbler SLA auto-extended |
| **14**| Debut Bridal Glam | Cabugaoan | Beauty Supply, Van, Stylist, Assistant | `NEED-AIRBRUSH-PODS: delivered` + `NEED-SKIN-PREPARATION: set` $\rightarrow$ `apply_airbrush_foundation`| Mirror review approved before photos | Allergic flare $\rightarrow$ Chemical halt; mineral powder fallback | Lead artist settles upon completion; assistant settles post-reception |
| **15**| Post-Stroke PT Rehab | Magsaysay | Physiatrist, Ortho Depot, Trike, PT | `NEED-GAIT-BELT: delivered` + `NEED-VITALS-CHECK: cleared` $\rightarrow$ `execute_standing_transfers` | Vitals cleared & transfer drill consent | Unilateral calf pain (DVT) $\rightarrow$ Emergency medical halt | Elevated vitals cancels labor with triage fee; delivered gear kept by client |
| **16**| Wheelchair Repair | Garitan | Orthocare Depot, Cargo Trike, Mechanic | `NEED-WHEEL-PARTS: delivered` + `NEED-AXLE-CLEANING: prepared` $\rightarrow$ `press_bearings_and_tires` | Damaged bearing inspection sign-off | Cracked frame crossbar $\rightarrow$ Collapse hazard; red-tagged | Incorrect tire size triggers replacement; mechanic labor SLA extended |
| **17**| Calligraphy Suite | Bucao East | Paper Mill, In-Courier, Artist, Out-Courier| `NEED-DECKLED-PAPER: delivered` + `NEED-GUEST-LIST-PARSE: done` $\rightarrow$ `execute_pointed_pen` | Sample envelope script & ink approval | Client adds 15 VIPs $\rightarrow$ Extra suite variance | Waterproof container protects artwork; weather delay extends transit SLA |
| **18**| Move-In Disinfection | Pao | Janitorial, Heavy Van, Sanitation Crew | `NEED-METHOD-STATEMENT: approved` + `NEED-EVACUATION-TOKEN: vacant` + `NEED-PPE: delivered` $\rightarrow$ `energize_ozone` | Method statement & 100% evacuation consent | Active black mold $\rightarrow$ Structural repair variance; no ozone | Power grid outage pauses safely; chemical & van orders settled |
| **19**| Personal Market Shopper| Del Rosario | Market Stalls, Concierge, Cargo Trike | `NEED-MARKET-STALLS: purchased` + `NEED-RECEIPTS: reconciled` $\rightarrow$ `dispatch_cargo_trike` | Unavailable fish replacement approval | Stall price hike $>20\%$ $\rightarrow$ Budget variance pause | Unspent purchase balance unfreezes; shopper & cargo fees settled |
| **20**| CPA Tax Book Audit | Central East | Filing Depot, Document Courier, CPA | `NEED-PHYSICAL-LEDGERS: delivered` + `NEED-POS-LOGS: exported` $\rightarrow$ `finalize_tax_computation` | Draft tax return figures approved before eFPS | Missing invoice gap $\rightarrow$ Book reconstruction variance | eFPS portal crash preserves completed audit fee; morning retry scheduled |
