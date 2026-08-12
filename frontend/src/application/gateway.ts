import type { AgentGrant, AgentTask, QuickDealOffer } from "@/types/domain";
import type { OpenRequest, Order, ServiceListing, ViewerAccount, WorkPlan } from "@/types/domain";
import type { ListingId, OrderId } from "@/domain/ids";
export type FixtureClass = "fictional_demo" | "conditional" | "sandbox" | "deferred";
export interface ScenarioEvent { id: string; type: string; aggregateType: string; aggregateId: string; actorId: string; actingForOwnerId?: string; at: string; note: string; }
export interface ScenarioSnapshot { schemaVersion: 1; scenarioId: string; fixtureClass: FixtureClass; reviewerActorId: string; viewer: ViewerAccount; agentGrants: AgentGrant[]; agentTasks: AgentTask[]; services: ServiceListing[]; requests: OpenRequest[]; order: Order; plan: WorkPlan; quickDeal: QuickDealOffer; events: ScenarioEvent[]; versions: Record<string, number>; }
export interface ListingView { listing: ServiceListing; fixtureClass: FixtureClass; }
export interface CreateRequestCommand { title: string; category: string; details: string; budget: number; area: string; actorId: string; }
export interface ActivityQuery { viewerId: string; filter?: "needs_action" | "waiting" | "history" | "all"; }
export interface MarketplaceGateway { getViewer(): Promise<ViewerAccount>; listServices(): Promise<ServiceListing[]>; getListing(id: ListingId): Promise<ListingView>; listRequests(): Promise<OpenRequest[]>; getOrder(id?: OrderId): Promise<Order>; getWorkPlan(): Promise<WorkPlan>; getQuickDeal(): Promise<QuickDealOffer>; getActivity(input: ActivityQuery): Promise<ScenarioEvent[]>; createRequest(input: CreateRequestCommand): Promise<OpenRequest>; }
