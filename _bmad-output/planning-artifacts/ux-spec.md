# Serbizyu 2.0 — UX & Interaction Design Specification

> HISTORICAL / NON-AUTHORITATIVE — superseded by `ux-spec-rebuilt.md`; preserved for traceability only.
> **BMAD Method Phase 2 Artifact: UX Design**  
> *Document Version:* 2.1.0 (Comprehensive Master Edition)  
> *Date:* July 25, 2026  
> *Authors:* David Datu N. Sarmiento, Christine M. Lopez, Jaypee G. Pagaduan, Prince John Vidaña (BSIT 4B, CCSIT 215)  

---

## 1. Design System & Aesthetics Tokens

Serbizyu's UX is designed to feel trustworthy, accessible, vibrant, and lightning-fast for provincial users across diverse screen types (low-end Android devices, iOS, PWAs, Kiosks, and SMS fallback).

```
+-----------------------------------------------------------------------------------+
| COLOR PALETTE                                                                     |
| Primary Teal:        #0D9488 (Trust, Financial Security, Escrow Protection)       |
| Warm Amber:          #F59E0B (Action, Bidding, Quick Deal QR Highlight)           |
| Deep Slate:          #0F172A (Text Hierarchy, Premium Dark Mode Base)             |
| Emerald Success:     #10B981 (Verified Badge, Escrow Release, 0% Drift)           |
| Crimson Alert:       #EF4444 (Dispute Open, SLA Warning)                          |
| Soft Sand Surface:   #FDFBF7 (Light Mode Background - Warm Provincial Feel)       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core User Experience Journeys

### Journey 1: Buyer Request & Reverse Bidding
```
[Buyer Posts Request] ---> [System Matches Local Servicers via H3] ---> [Servicers Submit Quotes]
                                                                                   |
[Escrow Released] <--- [Service Delivered & 3-Day Buffer] <--- [Buyer Selects Bid & Locks Escrow]
```

### Journey 2: Face-to-Face Quick Deal (Zero-Navigation Camera Loop)
```
[Buyer Scans Seller QR] ---> [Top Viewfinder Active + Bottom Dynamic Canvas QR]
                                                      |
[Dual Confirmation (App Tap or SMS OTP)] <--- [Continuous Counter Stepper (+/- ₱50)]
                      |
        [Air-Gapped External Cash or Cloud Escrow]
```

### Journey 3: Delegated Agent Onboarding & SMS Approval
```
[Agent Enters Servicer Info & Photos] ---> [SMS OTP Sent to Feature Phone Owner]
                                                          |
[Profile Live & Agent Manages Orders] <--- [Owner Replies "APPROVE <OTP>"]
                                                          |
             [Owner Graduates to Smartphone (Agent Earns 3x Bonus)]
```

---

## 3. Screen Layout & Wireframe Specifications

### Screen A: Marketplace Discovery & Reverse Bidding Feed
* **Header:** Sticky location selector (`Tagudin, Ilocos Sur`), search bar with Voice-First mic button (Web Speech API), L0–L4 Network Status Pill, and Quick Deal QR scanner icon.
* **Gamified Formalization Banner:** Prominently displays: *"Earnings Level 2 Unlocked: File 2-Min Sworn Declaration to Keep 100% of Payouts!"*
* **Category Carousel:** 28 categories in 8 horizontal pill groups with custom SVG icons.
* **Feed Modes:** Dual tab switcher — `Direct Offers` vs `Buyer Requests (Post & Bid)`.
* **Listing Cards:** Service thumbnail, title, verification badge (Unregistered / Sworn Declaration / 2303 Verified), price tag, rating, and H3 distance tag (e.g., `0.5 km away - Barangay Bio`).

### Screen B: Zero-Navigation Quick Deal Viewfinder & Counter-Offer Interface
* **Split Layout:**
  * **Top 50%:** Continuous Live Camera Viewfinder with active QR box detection and haptic scanning reticle.
  * **Bottom 50%:** Dynamic Canvas rendering Fountain Code animated QR streams (3–5 FPS) for air-gapped optical handshake.
* **Negotiation Steppers:**
  * Base amount input field.
  * `+ ₱50`, `+ ₱100`, `- ₱50` quick adjustment chips.
  * Circuit breaker round indicator (`Round 2 of 3`).
* **Dual Action Buttons:** `Accept & Lock Escrow` (Green) vs `Send Counter Offer` (Amber).

### Screen C: Delegated Agent Workspace & Graduation Dashboard
* **Managed Servicers List:** Cards showing offline business owners managed by the agent, current month earnings, and SMS OTP verification status.
* **Owner Action Bar:** `Create Listing for Owner`, `Submit Quote on Behalf`, `Withdraw Payout (Triggers Owner SMS OTP)`.
* **Graduation Bonus Tracker:** Visual progress bar showing owner's transition toward independent smartphone adoption and agent's 3× monthly commission bonus goal.

---

## 4. Micro-Interactions, Accessibility & Motion Physics

1. **Escrow Lock Animation:** Smooth 300ms spring animation showing funds moving from wallet into the "Escrow Shield" container upon booking.
2. **Quick Deal Haptic Feedback:** Vibrates twice (50ms pulses) on mobile devices upon successful dual confirmation.
3. **Voice-First Input Wrappers:** Microphone button next to text fields activates Web Speech API for users speaking Ilocano or Tagalog dialect inputs.
4. **SMS & Offline Network Fallback Toast:** Slide-in offline toast when signal drops: *"Network offline. SMS OTP code `ACCEPT X7K3` ready to send via Semaphore gate."*
5. **Optimistic UI State Rollback:** UI instantly updates state (*Job Accepted*); if network API fails, UI gracefully rolls back with an explanatory red toast.

---
*End of Phase 2 Comprehensive UX Design Specification.*
