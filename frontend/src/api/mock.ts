import { currentUser, openRequests, primaryOrder, serviceListings, workPlan } from "@/data/fixtures";
import type { OpenRequest, Order, QuickDealOffer, RequestDraft, ServiceListing, ViewerAccount, WorkPlan } from "@/types/domain";

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));
let orderState: Order = structuredClone(primaryOrder);
let requestState: OpenRequest[] = structuredClone(openRequests);
let planState: WorkPlan = structuredClone(workPlan);
let quickDealState: QuickDealOffer = { id: "QD-DEMO-01", listingId: "SRV-102", listingTitle: "Pick up medicine or small items", seller: serviceListings[1].provider, buyer: currentUser, listedAmount: 70, amount: 70, status: "ready", round: 0, frame: 1 };

export async function getViewer(): Promise<ViewerAccount> { await wait(80); return currentUser; }
export async function getHome() { await wait(); return { viewer: currentUser, services: serviceListings, requests: requestState, order: orderState, plan: planState }; }
export async function listServices(): Promise<ServiceListing[]> { await wait(120); return serviceListings; }
export async function listRequests(): Promise<OpenRequest[]> { await wait(120); return requestState; }
export async function getOrder(): Promise<Order> { await wait(100); return orderState; }
export async function getWorkPlan(): Promise<WorkPlan> { await wait(100); return planState; }
export async function getQuickDeal(): Promise<QuickDealOffer> { await wait(80); return quickDealState; }

export async function createRequest(input: RequestDraft): Promise<OpenRequest> {
  await wait(300);
  const created: OpenRequest = { id: `REQ-DEMO-${requestState.length + 1}`, title: input.title, buyer: currentUser, area: input.area, budget: input.budget, category: input.category, proposals: 0, postedLabel: "just now", description: input.details, status: "open" };
  requestState = [created, ...requestState]; return created;
}

export async function quickDealStartCamera(): Promise<QuickDealOffer> { await wait(260); quickDealState = { ...quickDealState, status: "scanning" }; return quickDealState; }
export async function quickDealAdjust(delta: number): Promise<QuickDealOffer> { await wait(70); quickDealState = { ...quickDealState, amount: Math.max(10, quickDealState.amount + delta), status: "offer_received" }; return quickDealState; }
export async function quickDealSendCounter(): Promise<QuickDealOffer> { await wait(240); quickDealState = { ...quickDealState, status: "counter_streaming", round: quickDealState.round + 1 }; return quickDealState; }
export async function quickDealAccept(): Promise<QuickDealOffer> { await wait(280); quickDealState = { ...quickDealState, status: "dual_confirm" }; return quickDealState; }
export async function quickDealConfirm(): Promise<QuickDealOffer> { await wait(260); quickDealState = { ...quickDealState, status: "waiting_sync", receiptId: "QD-260801-019" }; return quickDealState; }
export async function quickDealSync(): Promise<QuickDealOffer> { await wait(400); quickDealState = { ...quickDealState, status: "synced" }; return quickDealState; }
export async function quickDealTickFrame(): Promise<QuickDealOffer> { quickDealState = { ...quickDealState, frame: quickDealState.frame === 6 ? 1 : quickDealState.frame + 1 }; return quickDealState; }

export async function addPlanItem(title: string, amount: number): Promise<WorkPlan> { await wait(260); planState = { ...planState, items: [...planState.items, { id: `P${planState.items.length + 1}`, title, amount, state: "needs_provider", paymentNote: "No provider chosen yet" }] }; return planState; }
export async function advanceWork(): Promise<Order> { await wait(260); orderState = { ...orderState, workStatus: "awaiting_buyer_review", nextActor: "buyer", nextAction: "Review Maya's first drawing", steps: orderState.steps.map((step, index) => index === 1 ? { ...step, state: "done", evidence: "first-drawing.jpg", note: "First drawing sent" } : index === 2 ? { ...step, state: "active" } : step) }; return orderState; }
