import { openRequests, primaryOrder, serviceListings } from "@/data/fixtures";
import type { CashReportStatus, OpenRequest, Order, RequestDraft, Role, ServiceListing } from "@/types/domain";

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));
let orderState: Order = structuredClone(primaryOrder);
let requestState: OpenRequest[] = structuredClone(openRequests);

export interface DashboardPayload {
  role: Role;
  services: ServiceListing[];
  requests: OpenRequest[];
  order: Order;
}

// GET /api/dashboard?role=:role
export async function getDashboard(role: Role): Promise<DashboardPayload> {
  await wait();
  return { role, services: serviceListings, requests: requestState, order: orderState };
}

// GET /api/services
export async function listServices(): Promise<ServiceListing[]> {
  await wait(120);
  return serviceListings;
}

// GET /api/requests
export async function listRequests(): Promise<OpenRequest[]> {
  await wait(120);
  return requestState;
}

// GET /api/orders/:id
export async function getOrder(): Promise<Order> {
  await wait(100);
  return orderState;
}

// POST /api/requests
export async function createRequest(input: RequestDraft): Promise<OpenRequest> {
  await wait(420);
  const created: OpenRequest = {
    id: `REQ-DEMO-${requestState.length + 1}`,
    title: input.title,
    buyer: "You",
    area: input.area,
    budget: input.budget,
    category: input.category,
    proposals: 0,
    postedLabel: "just now",
    description: input.details,
    status: "open",
  };
  requestState = [created, ...requestState];
  return created;
}

// POST /api/orders/:id/payment/external-cash/report
export async function reportExternalCash(actor: "buyer" | "provider"): Promise<Order> {
  await wait(300);
  orderState = {
    ...orderState,
    buyerCashReported: actor === "buyer" ? true : orderState.buyerCashReported,
    providerCashReported: actor === "provider" ? true : orderState.providerCashReported,
  };
  let cashStatus: CashReportStatus = "not_reported";
  if (orderState.buyerCashReported && orderState.providerCashReported) cashStatus = "mutually_acknowledged";
  else if (orderState.buyerCashReported) cashStatus = "buyer_reported";
  else if (orderState.providerCashReported) cashStatus = "provider_reported";
  orderState = {
    ...orderState,
    cashStatus,
    timeline: [
      ...orderState.timeline,
      {
        id: `E${orderState.timeline.length + 1}`,
        title: actor === "buyer" ? "Buyer reported cash paid" : "Provider reported cash received",
        actor: actor === "buyer" ? orderState.buyer.shortName : orderState.provider.shortName,
        at: "just now",
        note: cashStatus === "mutually_acknowledged" ? "Reports match · Work unchanged" : "Other report still missing · Work unchanged",
        tone: cashStatus === "mutually_acknowledged" ? "good" : "warn",
      },
    ],
  };
  return orderState;
}

// POST /api/orders/:id/payment/external-cash/mismatch
export async function reportCashMismatch(): Promise<Order> {
  await wait(320);
  orderState = {
    ...orderState,
    cashStatus: "mismatch",
    timeline: [
      ...orderState.timeline,
      { id: `E${orderState.timeline.length + 1}`, title: "Cash report mismatch opened", actor: "Current actor", at: "just now", note: "Support review requested · Work unchanged", tone: "danger" },
    ],
  };
  return orderState;
}

// PATCH /api/orders/:id/work/steps/:stepId
export async function advanceWork(): Promise<Order> {
  await wait(360);
  const steps = orderState.steps.map((step, index) => {
    if (index === 1) return { ...step, state: "done" as const, evidence: "draft-v1.png", note: "First draft uploaded" };
    if (index === 2) return { ...step, state: "active" as const, note: "Rosa can review and request the included revision" };
    return step;
  });
  orderState = { ...orderState, workStatus: "awaiting_buyer_review", steps, nextActor: "buyer", nextAction: "Review the first draft" };
  return orderState;
}

export function resetMockState(): void {
  orderState = structuredClone(primaryOrder);
  requestState = structuredClone(openRequests);
}
