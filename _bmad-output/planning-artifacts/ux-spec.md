# Serbizyu 2.0 — UX & Interaction Design Specification

> **BMAD Method Phase 2 Artifact: UX Design**  
> *Document Version:* 2.0.0  
> *Date:* July 25, 2026  
> *Authors:* David Datu N. Sarmiento, Christine M. Lopez, Jaypee G. Pagaduan, Prince John Vidaña (BSIT 4B)  

---

## 1. Design System & Aesthetics Tokens

Serbizyu's UX is designed to feel trustworthy, accessible, vibrant, and lightning-fast for provincial users across diverse screen types (low-end Android devices, iOS, PWAs, and SMS fallback).

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
[Buyer Posts Request] ---> [System Matches Local Servicers] ---> [Servicers Submit Quotes]
                                                                        |
[Escrow Released] <--- [Service Delivered] <--- [Buyer Selects Bid & Locks Escrow]
```

### Journey 2: Face-to-Face Quick Deal (QR Code)
```
[Buyer Scans Servicer QR] ---> [Loads Counter-Offer Modal (Max 3 Rounds)] 
                                              |
[Dual Confirmation (App Tap or SMS OTP)] <--- [Price & Scope Locked]
                      |
        [Escrow Funded via Cash/GCash]
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

## 3. Screen Layout Wireframe Specifications

### Screen A: Marketplace Discovery & Reverse Bidding Feed
* **Header:** Sticky location selector (`Tagudin, Ilocos Sur`), search bar, and Quick Deal QR scanner icon.
* **Category Carousel:** 28 categories in 8 horizontal pill groups with custom SVG icons.
* **Feed Modes:** Dual tab switcher — `Direct Offers` vs `Buyer Requests (Post & Bid)`.
* **Listing Cards:** Service thumbnail, title, verification badge (Unregistered / Sworn Declaration / 2303 Verified), price tag, rating, and distance tag (e.g., `1.2 km away`).

### Screen B: Face-to-Face Quick Deal Scanner & Negotiation Modal
* **Scanner:** Full-screen QR code viewfinder with camera torch toggle.
* **Negotiation Controls:**
  * Base amount input field.
  * "+ ₱50", "+ ₱100", "- ₱50" quick adjustment chips.
  * Negotiation round indicator (e.g., `Round 2 of 3`).
* **Dual Action Buttons:** `Accept & Lock Escrow` (Green) vs `Counter Offer` (Amber).

### Screen C: Delegated Agent Workspace
* **Managed Servicers List:** Cards showing offline business owners managed by the agent, current month earnings, and SMS OTP verification status.
* **Owner Action Bar:** `Create Listing for Owner`, `Submit Quote on Behalf`, `Withdraw Payout (Triggers Owner SMS Consent)`.
* **Graduation Tracker:** Progress bar showing owner's transition toward independent smartphone adoption and agent's 3× commission bonus goal.

---

## 4. Micro-Interactions & Motion Physics

1. **Escrow Lock Animation:** Smooth 300ms spring animation showing funds moving from wallet into the "Escrow Shield" container upon booking.
2. **Quick Deal Haptic Feedback:** Vibrates twice (50ms pulses) on mobile devices upon successful dual confirmation.
3. **SMS Fallback Banner:** Slide-in offline toast when signal drops: *"Network offline. SMS OTP code `ACCEPT X7K3` ready to send."*

---
*End of UX Design Specification.*
