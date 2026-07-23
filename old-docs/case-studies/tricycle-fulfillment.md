# Serbizyu — Case Study: Tricycle Transportation
*How the pluggable Work engine, connector ecosystem, and distribution layer handle a category that is nothing like a project-based service.*

---

## 1. The Problem

A tricycle driver in Candon, Ilocos Sur wants to offer rides. The original Work model (fixed Workflow Template → sequential Steps → buyer sign-off) is a terrible fit:
- A ride is not a project with milestones.
- There is no "design phase" and "revision phase."
- The buyer doesn't "sign off" on a route plan.
- The transaction is over in minutes, not days.

Forcing a tricycle ride through a 4-step milestone sequence would be absurd. But building a separate "Transportation" domain would duplicate listing, payment, and messaging logic. The Work engine's pluggability solves this.

---

## 2. The Tricycle Work Template

### Template Structure (JSONB)

```json
{
  "template_id": "tricycle_standard",
  "name": "Standard Tricycle Ride",
  "category": "transportation",
  "version": 1,
  "structure": {
    "type": "single_pass",
    "description": "One pickup, one dropoff, no intermediate stops",
    "steps": [
      {
        "id": "en_route_pickup",
        "label": "En route to pickup",
        "required_proof": "gps_location",
        "auto_advance": true,
        "auto_advance_condition": "driver_within_500m_of_pickup"
      },
      {
        "id": "passenger_boarded",
        "label": "Passenger boarded",
        "required_proof": "passenger_confirmation",
        "auto_advance": false
      },
      {
        "id": "en_route_dropoff",
        "label": "En route to destination",
        "required_proof": "gps_location",
        "auto_advance": true,
        "auto_advance_condition": "driver_within_500m_of_dropoff"
      },
      {
        "id": "completed",
        "label": "Ride completed",
        "required_proof": "passenger_confirmation",
        "auto_advance": false
      }
    ],
    "fallback_state": "disputed",
    "timeout_minutes": 30
  }
}
```

### Key Differences from Project Template

| Aspect | Project Template | Tricycle Template |
|---|---|---|
| Duration | Days to weeks | Minutes to hours |
| Steps | Sequential, milestone-based | State-machine, GPS-triggered |
| Proof | File upload, photo | GPS location, passenger confirmation |
| Sign-off | Explicit buyer approval | Implicit (ride ends when passenger confirms arrival) |
| Escrow release | After final milestone | After arrival confirmation |

---

## 3. The Work Instance Lifecycle

### Step 1: Booking
1. Buyer searches "tricycle Candon" → sees driver's Offer with map showing current location
2. Buyer enters pickup and dropoff (Mapbox autocomplete) → sees estimated fare and duration
3. Buyer books → funds held in escrow → Work Instance created

### Step 2: Driver Accepts
- Driver receives SMS/Messenger notification: "New booking #ABC123. Pickup at [address]. Reply ACCEPT to confirm."
- Driver replies ACCEPT → Work Instance status: `not_started` → `in_progress`

### Step 3: En Route to Pickup
- Driver's phone (or a cheap Android device mounted on the tricycle) shares GPS via the Serbizyu PWA
- Buyer sees driver's real-time position on the map (Reverb channel `work.{id}.location`)
- When driver is within 500m of pickup, Work Instance auto-advances to `passenger_boarded`

### Step 4: Passenger Boarded
- Driver confirms passenger is aboard (button in PWA or SMS reply "BOARDED")
- Buyer receives notification: "Your driver has picked you up. Track your ride: [link]"

### Step 5: En Route to Dropoff
- GPS tracking continues. Buyer can share live location with family (safety feature).
- When driver is within 500m of dropoff, Work Instance auto-advances to `completed` pending passenger confirmation.

### Step 6: Completion & Escrow Release
- Passenger confirms arrival (button in PWA or SMS reply "DONE")
- Work Instance status: `completed` → `OrderFulfilled` event fires
- Payments listens → escrow released to driver
- Growth listens → loyalty points credited
- Notifications listens → "How was your ride? Rate [driver name]" sent to buyer

### Timeout & Dispute
- If no GPS update for 10 minutes, status → `disputed` with reason "driver_unresponsive"
- If passenger doesn't confirm within 30 minutes of arrival, auto-confirm (with notification)
- Either party can flag a dispute at any point, freezing escrow

---

## 4. Tools Used

| Tool | Purpose | Config |
|---|---|---|
| Mapbox Map | Show driver location, route, pickup/dropoff | `originField: "pickup_address"`, `showRoute: true`, `realtimeTracking: true` |
| Route Planner | Optimize route (future: multi-stop for shared rides) | Phase 3 |
| Weather Connector | "Rain expected — bring cover" notification | Phase 3+ |

---

## 5. Distribution & Marketing

### Facebook
- Post: "Need a ride in Candon? [Driver Name] is on Serbizyu. Verified, tracked, insured. Book now: [link]"
- Boosted to 18–45, within 5km of Candon town proper
- Driver shares the Marketing Asset to their own network

### Messenger
- Click-to-Messenger ad: "Book a tricycle without haggling"
- Bot flow: "Where are you?" → "Where to?" → "₱XX. Book now?" → "Driver is on the way. Track: [link]"

### SMS
- "TRICYCLE [pickup] to [dropoff]" to 22565 → bot replies with fare estimate and driver details

### Offline
- QR code on the tricycle itself. Scan → Messenger booking or SMS shortcode
- TODA (Tricycle Operators and Drivers Association) partnership: all members get Serbizyu onboarding at the barangay hall

---

## 6. Why This Works Without a Dedicated Ride-Hailing App

| Ride-Hailing Feature | Serbizyu Equivalent | How |
|---|---|---|
| Real-time tracking | Mapbox Map Connector + Reverb | PWA shares GPS, buyer watches on map |
| Fare estimation | Offer attribute + Mapbox routing | Fixed price per route, or per-km rate calculated at booking |
| Driver dispatch | Work Instance + Notifications | Nearest available driver gets SMS/Messenger alert |
| Payment | Escrow + Xendit | Held at booking, released on arrival |
| Rating | Review system | Post-ride prompt |
| Safety | Live location sharing + dispute freeze | Family can track, dispute freezes payment |

**What we don't build:** surge pricing, driver heat maps, ride pooling, in-app navigation. The tricycle driver uses their own judgment for route; Serbizyu provides the coordination and trust layer.

---

## 7. Scaling to Other Transport

The same template generalizes:

| Vehicle | Template Variant | Tools |
|---|---|---|
| Motorcycle (habal-habal) | Same, different fare rate | Mapbox, Weather |
| Van (UV Express) | Multi-stop, scheduled departure | Mapbox, Route Planner, Calendar |
| Boat (island hopping) | Multi-stop, weather-dependent | Mapbox, Route Planner, Weather |
| Delivery (motorcycle) | Add "package_photo" proof step | Mapbox, Document Generator |

Each is a Work Template with different JSONB structure and tool configs. No new domain code.

---

## 8. The Platform Insight

The tricycle case proves the core thesis: **the Work engine's pluggability is not about handling more categories — it's about handling more *shapes* of work.**

A project-based service (web design) has a linear, milestone shape.
A transport service (tricycle) has a state-machine, GPS-triggered shape.
An appointment service (tutoring) has a calendar-slot shape.
A product sale (meat vendor) has a pack-ship-handoff shape.

All four are Work Instances with different JSONB structures, different tools, and different proof types — but the same `status` enum, the same `OrderFulfilled` event, the same escrow release, the same review prompt. That's the platform.

---

## 9. Metrics for the Tricycle Pilot

| Metric | Target | Measurement |
|---|---|---|
| Time from booking to pickup | <10 min | Work Instance timestamps |
| GPS tracking uptime | >95% | Reverb connection logs |
| Passenger confirmation rate | >90% | % rides auto-confirmed vs disputed |
| Driver acceptance rate | >70% | SMS/Messenger reply rate |
| Repeat booking rate | >30% | Same buyer, same driver, 30 days |
| Average fare | ₱30–80 | Order totals |

---

*End of Tricycle Case Study. The Work engine bends; it doesn't break. That's the point.*
