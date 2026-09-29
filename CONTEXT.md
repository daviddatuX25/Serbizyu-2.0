# Serbizyu Work Authoring

This context distinguishes the finite fulfillment contracts used by Work from reusable catalog sets and source-owned Work specifications authored before agreement.

## Language

**Work Shape**:
A code-owned fulfillment contract defining the behavior of a Work specification: A1 Linear Project, A3 Appointment, A4 Handoff, or A9 Digital Delivery. A shape is distinct from a listing category and from a reusable work set.
_Avoid_: Work archetype as a user choice or catalog set

**Work Catalog Set**:
An immutable, versioned starting definition for a Work specification. It is eligible by category, listing type, and activated capability; it carries one compatible Work Shape and is copied with provenance into a source-owned draft.
_Avoid_: Official archetype, archetype card

**Target Duration**:
An optional provider-estimated time for a Work step. It is not a guaranteed service-level agreement unless a separate governed promise says so.
_Avoid_: SLA, guaranteed duration (unless explicitly governed)

**Work Specification**:
A bounded, versioned Work definition owned by a Listing, Request, Quote, or award source. Editing a copied set creates a custom specification for that source; reusability requires an explicit, separately authorized and versioned Save as template promotion.
_Avoid_: Shared catalog variation for ordinary listing edits, mutable template

**Listing Media & Browse Thumbnail**:
Version-pinned visual attachments (`terms.media`) authored on a Listing draft, supporting a primary cover photo, optional gallery photos, and an optional short video. List projections (`/browse`, `/my-listings`, and Deal Chain partner pickers) expose only the compressed `cover_thumbnail_url` and `has_video` flag for fast, cacheable reads; full media items load only on detail and owner-preview views.
_Avoid_: Category stock photo masquerading as an uploaded listing photo; shipping full media galleries in list queries

**Deal Chain Catalog Set**:
An immutable, versioned multi-party fulfillment recipe (`deal_chain_catalog_versions`) eligible by category, listing type, and Work Shape. It defines a sequence of Deal Chain Nodes around the primary listing without creating child Orders or mutating shared catalog rows when customized.
_Avoid_: Static hardcoded combo arrays in builders

**Deal Chain Node (Partner Slot)**:
A step in a Deal Chain representing either the primary listing anchor or a partner role (`store`, `delivery`, `labor`, `audit`) bound to a real active Marketplace Listing (with its own thumbnail, owner, and fee) or left as an open role slot for checkout selection.
_Avoid_: Hardcoded TypeScript partner arrays disconnected from active listings

**Deal Chain Specification**:
A listing-owned, versioned Deal Chain configuration (`terms.deal_chain_specification` / `terms.deal_chain_combinations`) copied from a Deal Chain Catalog Set or built in the Deal Chain Studio. Adding, removing, reordering, or rebinding any Deal Chain Node marks the specification custom for that listing while preserving `based_on_recipe_code` and `based_on_catalog_version` provenance.
_Avoid_: Dropping partner combinations on draft save or mutating `deal_chain_catalog_versions`

**Product Fulfillment Protocol (A4 Handoff)**:
A code-owned, governed physical goods fulfillment contract (`tagudin-product-handoff-a4`) binding inventory commitment, counter/courier custody handoff, and receipt evidence. Product merchants author preparation lead time and counter pickup terms rather than labor work milestones; child orders track physical custody transfer rather than service task execution.
_Avoid_: Forcing product sellers to author service work pipelines; exposing "Work Execution Pipeline" jargon to physical goods shoppers.
