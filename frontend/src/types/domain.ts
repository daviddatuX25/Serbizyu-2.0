export type Capability = "request" | "provide" | "agent";
export type ParticipantRole = "buyer" | "provider";
export type PaymentLane = "external_cash" | "external_digital_proof" | "direct_digital_sandbox" | "tiwala_sandbox";
export type WorkStatus = "not_started" | "in_progress" | "awaiting_buyer_review" | "completed" | "concern_open";
export type CashReportStatus = "not_reported" | "buyer_reported" | "provider_reported" | "mutually_acknowledged" | "mismatch";

export interface ViewerAccount {
  id: string;
  name: string;
  shortName: string;
  avatar: string;
  area: string;
  capabilities: Capability[];
  agentFor: string[];
}

export interface Actor {
  id: string;
  name: string;
  shortName: string;
  area: string;
  avatar: string;
}

export interface ListingMedia {
  id: string;
  url: string;
  alt: string;
  kind?: "photo" | "preview";
}

export interface ServiceListing {
  id: string;
  title: string;
  category: string;
  provider: Actor;
  area: string;
  price: number;
  priceLabel: string;
  availability: string;
  description: string;
  media: ListingMedia[];
  quickDealAvailable?: boolean;
  featured?: boolean;
}

export interface OpenRequest {
  id: string;
  title: string;
  buyer: Actor;
  area: string;
  budget: number;
  category: string;
  proposals: number;
  postedLabel: string;
  description: string;
  status: "open" | "matched" | "draft";
}

export interface WorkStep {
  id: string;
  title: string;
  owner: ParticipantRole;
  state: "done" | "active" | "upcoming" | "needs_attention";
  note: string;
  evidence?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  actor: string;
  at: string;
  note: string;
  tone?: "default" | "good" | "warn" | "danger";
}

export interface Order {
  id: string;
  title: string;
  buyer: Actor;
  provider: Actor;
  amount: number;
  area: string;
  orderStatus: "accepted" | "active" | "review" | "closed";
  workStatus: WorkStatus;
  paymentLane: PaymentLane;
  cashStatus: CashReportStatus;
  buyerCashReported: boolean;
  providerCashReported: boolean;
  nextActor: ParticipantRole;
  nextAction: string;
  steps: WorkStep[];
  timeline: TimelineEvent[];
}

export interface RequestDraft {
  title: string;
  category: string;
  details: string;
  budget: number;
  area: string;
}

export interface QuickDealOffer {
  id: string;
  listingId: string;
  listingTitle: string;
  seller: Actor;
  buyer: Actor;
  listedAmount: number;
  amount: number;
  status: "ready" | "scanning" | "offer_received" | "counter_streaming" | "awaiting_acceptance" | "dual_confirm" | "sealed" | "waiting_sync" | "synced";
  round: number;
  frame: number;
  receiptId?: string;
}

export interface PlanItem {
  id: string;
  title: string;
  amount: number;
  provider?: Actor;
  state: "needs_provider" | "invited" | "accepted" | "in_progress" | "completed";
  dependency?: string;
  paymentNote: string;
}

export interface WorkPlan {
  id: string;
  title: string;
  area: string;
  items: PlanItem[];
}

export const LOCKED_DECISIONS = {
  pilotArea: "Tagudin",
  accountModel: "one_account_multiple_capabilities",
  quickDeal: "connected_mock_with_no_money_authority",
  offlineQuickDealPayment: "external_cash_only",
  relatedWork: "frontend_concept_deferred_for_pilot",
  listingMedia: "photo_led",
  externalCashCustody: "none",
  paymentAndWorkAreIndependent: true,
  realIdentityEvidenceAllowed: false,
} as const;

export const laneLabels: Record<PaymentLane, string> = {
  external_cash: "Cash",
  external_digital_proof: "Digital proof",
  direct_digital_sandbox: "Direct digital",
  tiwala_sandbox: "Tiwala",
};
