# Glovo UI & UX Design Inspiration Library (from Mobbin)

A complete, organized archive of UI screens and end-to-end user flows for **Glovo** (iOS & Android) sourced from [Mobbin](https://mobbin.com).

Total Flows: **12 complete user flows + standalone benchmarks**  
Total Assets: **135 full-resolution screens + official logo (6.5 MB)**  

## Flow Directory & Navigation

| Directory | Flow Name | Platform | Screens | Description |
|---|---|---|---|---|
| [`01_ios_ordering_food_delivery/`](01_ios_ordering_food_delivery/README.md) | **Glovo iOS: Ordering a Food Delivery Flow** | `iOS` | **32** | The user orders food from a restaurant ('The Dirty Vegans'), customizes menu items with ad... |
| [`02_android_ordering_food_delivery/`](02_android_ordering_food_delivery/README.md) | **Glovo Android: Ordering a Food Delivery Flow** | `Android` | **22** | The Android food delivery experience: browsing restaurant menus, configuring item options ... |
| [`03_android_courier_service/`](03_android_courier_service/README.md) | **Glovo Android: Ordering a Courier Service Flow** | `Android` | **16** | The dedicated courier/messenger delivery flow: entering pickup and drop-off addresses, spe... |
| [`04_ios_onboarding/`](04_ios_onboarding/README.md) | **Glovo iOS: Onboarding & Account Creation Flow** | `iOS` | **18** | App introduction walkthrough, social/email authentication options (Google, Apple, Facebook... |
| [`05_ios_cancelling_subscription/`](05_ios_cancelling_subscription/README.md) | **Glovo iOS: Cancelling Subscription (Glovo Prime) Flow** | `iOS` | **7** | Subscription management flow where the user attempts to cancel Glovo Prime. Features UX re... |
| [`06_android_cancelling_subscription/`](06_android_cancelling_subscription/README.md) | **Glovo Android: Cancelling Subscription (Glovo Prime) Flow** | `Android` | **7** | The Android variant of the Glovo Prime cancellation journey: managing subscription setting... |
| [`07_android_filtering_and_sorting/`](07_android_filtering_and_sorting/README.md) | **Glovo Android: Filtering & Sorting Restaurants Flow** | `Android` | **7** | Searching and refining store listings using bottom-sheet filter modals: sorting by rating,... |
| [`08_android_cancelling_order/`](08_android_cancelling_order/README.md) | **Glovo Android: Cancelling an Active Order Flow** | `Android` | **6** | Cancelling an in-progress food order: accessing help options, selecting order cancellation... |
| [`09_ios_past_orders/`](09_ios_past_orders/README.md) | **Glovo iOS: Past Orders & Reorder Flow** | `iOS` | **6** | Navigating from profile to past orders: viewing receipt details of delivered and cancelled... |
| [`10_android_searching/`](10_android_searching/README.md) | **Glovo Android: Searching Glovo Flow** | `Android` | **3** | In-app global search interface: search input autocomplete, recent search chips, categorica... |
| [`11_ios_invite_friends/`](11_ios_invite_friends/README.md) | **Glovo iOS: Invite Friends & Referral Flow** | `iOS` | **3** | User referral journey: accessing the promo section from the profile, viewing referral bonu... |
| [`12_ios_order_updates/`](12_ios_order_updates/README.md) | **Glovo iOS: Order Updates & Live Tracking Flow** | `iOS` | **3** | Post-purchase live order updates: status progress banner (order received -> preparing -> o... |
| [`13_standalone_screens/`](13_standalone_screens/README.md) | **Glovo Standalone Key UI Screens & Design Elements** | `iOS / Android` | **4** | Curated collection of benchmark single-screen architectures from Glovo, highlighting progr... |

---

## Design System & UX Highlights Observed Across Glovo Flows

### 1. Visual Identity & Brand Accents
- **Primary Brand Color:** Glovo Yellow (`#FFC244` / energetic warm gold) paired with Glovo Teal/Emerald Green (`#00A082`).
- **Backgrounds:** Clean crisp whites (`#FFFFFF`) and off-white/light gray neutral containers (`#F5F5F5`).
- **Typography:** Bold rounded sans-serif headings with high contrast, legible body text, and prominent price tags.

### 2. Core UI/UX Patterns Documented in this Library
- **Sticky Bottom CTAs:** High-contrast full-width pill buttons with dynamic state (e.g. item count + price display directly on button).
- **Floating Bottom Sheets:** Used for filters, sorting, item options, dietary restrictions, and cancellation surveys.
- **Progress Indicators & Steppers:** Visual trackers showing order lifecycle (Received -> Accepted -> In Transit -> Delivered).
- **Cancellation Retention Loops:** Multi-step retention dialogues reminding users of accumulated savings before confirming cancellation.
- **Address & Location Modals:** Interactive map pins paired with street auto-complete and building/floor detail notes.
- **Error & Payment Recovery:** Non-blocking inline error sheets with clear retry alternatives when payment methods fail.

### 3. How to Navigate This Archive
Each subfolder contains:
1. Sequentially indexed, high-resolution screens (`screen_01_...webp`, `screen_02_...webp`, etc.).
2. A dedicated `README.md` with an overview table, OCR transcriptions of UI copy, element descriptions, and interaction notes.

