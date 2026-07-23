# Serbizyu — Work Engine Connector Ecosystem
*Pluggable tools that Work Templates can reference. Maps, routing, calendar, documents, IoT. The marketplace becomes a platform.*

---

## 1. The Insight

The Work engine's three tiers (preset → customized → AI-assisted) solve the *structure* problem. But structure alone doesn't make a marketplace "the best platform for all." A tricycle driver needs a map. A tutor needs a calendar. A caterer needs a menu builder. These aren't Work structure problems — they're *tool* problems.

The connector ecosystem provides a registry of tools that Work Templates can reference. Each tool is a deep module: small interface, rich implementation, swappable behind a seam.

---

## 2. Tool Registry

| Tool | Interface | Phase | Categories that need it |
|---|---|---|---|
| **Mapbox Map** | `MapConnector` | 2 | Transport, delivery, field service, real estate |
| **Route Planner** | `RoutingConnector` | 3 | Transport, delivery, multi-stop services |
| **Calendar** | `CalendarConnector` | 2 | Tutoring, consulting, appointment-based |
| **Document Generator** | `DocumentConnector` | 3 | Legal, accounting, printing, government services |
| **Payment Split** | `SplitConnector` | 3 | Multi-vendor orders, affiliate commissions |
| **Inventory Check** | `InventoryConnector` | 3+ | Product sellers, rental equipment |
| **Weather** | `WeatherConnector` | 3+ | Outdoor services, agriculture, events |
| **IoT/Sensor** | `SensorConnector` | 4+ | Equipment rental, vehicle tracking, agriculture |

---

## 3. Tool Interface (Conceptual)

Every tool implements a `WorkTool` interface:

```php
interface WorkTool
{
    public function key(): string; // 'mapbox_map', 'route_planner', etc.
    public function name(): string; // Human-readable
    public function category(): string; // 'location', 'scheduling', 'documents'
    public function configSchema(): array; // JSON Schema for tool config
    public function render(WorkInstance $instance, ToolConfig $config): ToolView;
    public function validate(WorkInstance $instance, ToolConfig $config): ValidationResult;
}
```

**Key design:**
- `configSchema()` declares what the tool needs (API key? default zoom? origin address field?).
- `render()` returns a `ToolView` — a data object that the frontend turns into a React component. The backend never renders HTML.
- `validate()` checks that the Work Instance has the data the tool needs (e.g., a map tool requires a `location` attribute on the Offer).

---

## 4. Mapbox Map Connector

### Purpose
Display a map on the Offer page, the Work Instance tracking view, and the Order confirmation. For transport/delivery, show route and real-time position.

### Config Schema
```json
{
  "type": "object",
  "properties": {
    "zoom": { "type": "integer", "default": 15 },
    "showRoute": { "type": "boolean", "default": false },
    "originField": { "type": "string", "description": "Which Offer attribute holds the origin address" },
    "destinationField": { "type": "string" },
    "realtimeTracking": { "type": "boolean", "default": false }
  },
  "required": ["originField"]
}
```

### Render Output
```php
new ToolView(
    component: 'GeoMap',
    props: [
        'center' => $instance->resolveLocation($config->originField),
        'zoom' => $config->zoom,
        'markers' => $this->buildMarkers($instance, $config),
        'route' => $config->showRoute ? $this->buildRoute($instance, $config) : null,
        'realtimeChannel' => $config->realtimeTracking ? "work.{$instance->id}.location" : null,
    ]
);
```

### Frontend Component
`GeoMap` is a Serbizyu custom component (not shadcn) that wraps Mapbox GL JS. It subscribes to the Reverb channel if `realtimeChannel` is present.

### Tricycle Example
A tricycle Offer with `originField: "pickup_address"`, `showRoute: true`, `realtimeTracking: true`:
- Buyer sees pickup location on map before booking
- During Work Instance, buyer sees driver's real-time position
- Driver sees optimized route to destination

---

## 5. Route Planner Connector

### Purpose
For multi-stop or optimized routing. Not just "show a map" — "compute the best order for 5 deliveries."

### Config Schema
```json
{
  "type": "object",
  "properties": {
    "stopsField": { "type": "string", "description": "JSONB attribute holding array of stops" },
    "optimization": { "enum": ["distance", "duration", "none"], "default": "distance" },
    "vehicleProfile": { "enum": ["driving", "cycling", "walking"], "default": "driving" }
  }
}
```

### Implementation
Uses Mapbox Optimization API (v2). The connector fetches the stop list from the Work Instance's JSONB structure, calls the API, and stores the optimized route back into the instance.

### When to Build
Phase 3, when a real delivery or transport category has >10 active servicers. Don't build the connector for hypothetical use cases.

---

## 6. Calendar Connector

### Purpose
Appointment-based services (tutoring, consulting, home services) need scheduling, not milestones.

### Config Schema
```json
{
  "type": "object",
  "properties": {
    "durationMinutes": { "type": "integer", "default": 60 },
    "bufferMinutes": { "type": "integer", "default": 15 },
    "advanceBookingDays": { "type": "integer", "default": 7 },
    "timezone": { "type": "string", "default": "Asia/Manila" }
  }
}
```

### Integration
The Calendar Connector doesn't replace the Work engine — it *feeds* it. A tutoring Work Template might have:
1. Step 1: "Book session" (CalendarConnector shows available slots)
2. Step 2: "Conduct session" (Work status moves to `in_progress`)
3. Step 3: "Session notes" (DocumentConnector generates summary)

### Sync
Phase 2: Internal calendar only (Serbizyu owns the schedule). Phase 3: Two-way sync with Google Calendar (servicer's existing calendar blocks availability).

---

## 7. Document Generator Connector

### Purpose
Generate PDFs, certificates, receipts, contracts from Work Instance data.

### Config Schema
```json
{
  "type": "object",
  "properties": {
    "template": { "type": "string", "description": "Blade template name" },
    "outputField": { "type": "string", "description": "Where to store the generated file" },
    "signatures": { "type": "array", "items": { "type": "string" } }
  }
}
```

### Use Cases
- Printing service: generate print-ready file from customer upload
- Tutorial service: generate certificate of completion
- Legal service: generate filled contract from intake form
- Government liaison: generate accomplished application form

---

## 8. Tool Registration in Work Templates

A Work Template's JSONB structure declares which tools it uses:

```json
{
  "steps": [
    {
      "id": "pickup",
      "label": "Pickup Passenger",
      "tools": [
        {
          "tool": "mapbox_map",
          "config": {
            "originField": "pickup_address",
            "showRoute": true,
            "realtimeTracking": true
          }
        }
      ]
    },
    {
      "id": "dropoff",
      "label": "Dropoff Passenger",
      "tools": [
        {
          "tool": "mapbox_map",
          "config": {
            "originField": "destination_address",
            "showRoute": false
          }
        }
      ]
    }
  ]
}
```

The WorkflowBuilder UI shows available tools in a palette. Dragging a tool into a step opens a config form generated from `configSchema()`.

---

## 9. Tool Availability Rules

Not all tools are available to all categories. The registry is filtered:

| Category | Available Tools |
|---|---|
| Transport (tricycle, delivery) | mapbox_map, route_planner, weather |
| Tutoring / Education | calendar, document_generator |
| Home Services (plumbing, electrical) | mapbox_map, calendar, document_generator |
| Food / Catering | calendar, document_generator, inventory_check |
| Professional Services | calendar, document_generator |
| Retail / Product | inventory_check, document_generator |

**Enforcement:** The WorkflowBuilder only shows tools valid for the Offer's category. The API validates tool-category compatibility on template save.

---

## 10. Third-Party Tool Providers

The connector ecosystem is designed for future third-party providers:

| Provider | Tool | Status |
|---|---|---|
| Mapbox | Maps, routing, geocoding | Phase 2 |
| Google | Calendar sync, Maps (fallback) | Phase 3 |
| Twilio | SMS (Semaphore fallback) | Phase 3 |
| PayMongo | Alternative payment rail | Phase 3+ |
| Grab | Ride-hailing API (if they open it) | Phase 4+ |
| Waze | Traffic data | Phase 4+ |

**Design for swap:** The `GeocodingService` interface (used by Mapbox Map Connector) can be backed by Google Maps Geocoding if Mapbox quality is insufficient. The Work Template doesn't change; only the connector config does.

---

## 11. The "Best Platform" Test

A marketplace becomes a platform when third parties can build on it. The connector ecosystem is Serbizyu's platform bet:

1. **Servicers** can customize their workflow with tools, not just steps.
2. **Developers** can build new tool connectors (Phase 4: public API for tool registration).
3. **Partners** (Grab, Lalamove, local cooperatives) can integrate their services as Work fulfillment options.

The tricycle driver isn't just "a service provider on Serbizyu." They're a mobile node with a map, a route, a payment method, and a customer communication channel — all orchestrated by the Work engine. That's the platform.

---

## 12. Build Sequence

| Phase | Tools to Build | Rationale |
|---|---|---|
| 2 | Mapbox Map, Calendar | Needed for tricycle pilot + tutoring categories |
| 3 | Route Planner, Document Generator | Needed for delivery + professional services |
| 3+ | Inventory Check, Payment Split | Product sellers + multi-vendor orders |
| 4+ | Weather, IoT/Sensor | Outdoor services, equipment rental, agriculture |

**Rule:** A tool is built when a real category with >5 active servicers requests it. No speculative connectors.

---

*End of Connector Ecosystem. The Work engine provides structure; tools provide capability. Together they make Serbizyu a platform, not just a marketplace.*
