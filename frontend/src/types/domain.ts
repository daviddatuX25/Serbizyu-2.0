export type Role = "buyer" | "provider" | "admin";
export type PaymentLane =
  | "external_cash"
  | "external_digital_proof"
  | "direct_digital_sandbox"
  | "tiwala_sandbox";
export type WorkStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_buyer_review"
  | "completed"
  | "concern_open";
export type CashReportStatus =
  | "not_reported"
  | "buyer_reported"
  | "provider_reported"
  | "mutually_acknowledged"
  | "mismatch";

export interface Actor {
  id: string;
  name: string;
  shortName: string;
  role: Role;
  area: string;
  avatar: string;
}

export interface ServiceListing {
  id: string;
  title: string;
  category: string;
  provider: string;
  providerInitials: string;
  area: string;
  price: number;
  priceLabel: string;
  workShape: "A1" | "A3" | "A4" | "A9";
  workShapeLabel: string;
  lane: PaymentLane;
  availability: string;
  description: string;
  tone: "forest" | "mango" | "coral" | "blue";
  featured?: boolean;
}

export interface OpenRequest {
  id: string;
  title: string;
  buyer: string;
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
  owner: "buyer" | "provider";
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
  nextActor: Role;
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
  workShape: "A1" | "A3" | "A4" | "A9";
  lane: PaymentLane;
}

export const LOCKED_DECISIONS = {
  pilotArea: "Tagudin",
  externalCashCommissionPercent: 0,
  externalDigitalProofCommissionPercent: 0,
  externalCashCustody: "none",
  externalCashConfirmation: "two_independent_attestations",
  paymentAndWorkAreIndependent: true,
  directDigitalAvailability: "sandbox_only",
  tiwalaAvailability: "sandbox_only",
  evidenceSubmissionIsVerification: false,
  realIdentityEvidenceAllowed: false,
  fixturesArePilotEvidence: false,
} as const;

export const laneLabels: Record<PaymentLane, string> = {
  external_cash: "External Cash",
  external_digital_proof: "External Digital Proof",
  direct_digital_sandbox: "Direct Digital",
  tiwala_sandbox: "Tiwala Protected Digital",
};
