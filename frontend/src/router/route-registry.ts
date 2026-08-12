import type { ListingId, OrderId } from "@/domain/ids";
export type AppRoute =
  | { kind: "home"; path: "/" }
  | { kind: "explore"; path: "/explore" }
  | { kind: "listing"; path: `/listings/${string}`; listingId: ListingId }
  | { kind: "order"; path: `/orders/${string}`; orderId: OrderId }
  | { kind: "quick-deal"; path: `/quick-deal/${string}`; listingId: ListingId }
  | { kind: "activity"; path: "/activity" }
  | { kind: "agent"; path: "/agent/today" }
  | { kind: "me"; path: "/me" }
  | { kind: "profile"; path: "/me/profile" }
  | { kind: "review"; path: "/review/scenarios" }
  | { kind: "not-found"; path: string };
export function parseAppRoute(path: string): AppRoute { const normalized = path.split("?")[0].replace(/\/$/, "") || "/"; if (normalized === "/") return { kind: "home", path: "/" }; if (normalized === "/explore") return { kind: "explore", path: normalized }; if (normalized === "/activity") return { kind: "activity", path: normalized }; if (normalized === "/agent/today") return { kind: "agent", path: normalized }; if (normalized === "/me") return { kind: "me", path: normalized }; if (normalized === "/me/profile") return { kind: "profile", path: normalized }; if (normalized === "/review/scenarios") return { kind: "review", path: normalized }; const listing = normalized.match(/^\/listings\/([^/]+)$/); if (listing) return { kind: "listing", path: normalized as `/listings/${string}`, listingId: listing[1] as ListingId }; const order = normalized.match(/^\/orders\/([^/]+)$/); if (order) return { kind: "order", path: normalized as `/orders/${string}`, orderId: order[1] as OrderId }; const quickDeal = normalized.match(/^\/quick-deal\/([^/]+)$/); if (quickDeal) return { kind: "quick-deal", path: normalized as `/quick-deal/${string}`, listingId: quickDeal[1] as ListingId }; return { kind: "not-found", path: normalized }; }
