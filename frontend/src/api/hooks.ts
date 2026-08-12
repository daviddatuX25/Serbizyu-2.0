import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/mock";
import type { RequestDraft } from "@/types/domain";
export const keys = { home: ["home"] as const, viewer: ["viewer"] as const, services: ["services"] as const, requests: ["requests"] as const, listing: (id: string) => ["listing", id] as const, order: (id: string) => ["order", id] as const, quickDeal: (id: string) => ["quick-deal", id] as const, plan: (id: string) => ["work-plan", id] as const };
const defaultOrderId = "ORD-260801-08";
const defaultQuickDealId = "QD-DEMO-01";
const defaultPlanId = "PLAN-12";
export function useHome() { return useQuery({ queryKey: keys.home, queryFn: api.getHome }); }
export function useViewer() { return useQuery({ queryKey: keys.viewer, queryFn: api.getViewer }); }
export function useUpdateProfile() { const client = useQueryClient(); return useMutation({ mutationFn: api.updateProfile, onSuccess: (data) => { client.setQueryData(keys.viewer, data); void client.invalidateQueries({ queryKey: keys.home }); } }); }
export function useServices() { return useQuery({ queryKey: keys.services, queryFn: api.listServices }); }
export function useListing(id: string) { return useQuery({ queryKey: keys.listing(id), queryFn: () => api.getListing(id), retry: false }); }
export function useRequests() { return useQuery({ queryKey: keys.requests, queryFn: api.listRequests }); }
export function useOrder(id = defaultOrderId) { return useQuery({ queryKey: keys.order(id), queryFn: () => api.getOrder(id), retry: false }); }
export function useQuickDeal(id = defaultQuickDealId) { return useQuery({ queryKey: keys.quickDeal(id), queryFn: () => api.getQuickDeal(id), retry: false }); }
export function useWorkPlan(id = defaultPlanId) { return useQuery({ queryKey: keys.plan(id), queryFn: api.getWorkPlan }); }
function mutation<TInput, TOutput>(fn: (input: TInput) => Promise<TOutput>, key: readonly unknown[]) { const client = useQueryClient(); return useMutation({ mutationFn: fn, onSuccess: (data) => client.setQueryData(key, data) }); }
export function useCreateRequest() { const client = useQueryClient(); return useMutation({ mutationFn: (draft: RequestDraft) => api.createRequest(draft), onSuccess: () => { void client.invalidateQueries({ queryKey: keys.requests }); void client.invalidateQueries({ queryKey: keys.home }); } }); }
export function useQuickDealCamera() { return mutation<void, Awaited<ReturnType<typeof api.quickDealStartCamera>>>(() => api.quickDealStartCamera(), keys.quickDeal(defaultQuickDealId)); }
export function useQuickDealAdjust() { return mutation<number, Awaited<ReturnType<typeof api.quickDealAdjust>>>(api.quickDealAdjust, keys.quickDeal(defaultQuickDealId)); }
export function useQuickDealCounter() { return mutation<void, Awaited<ReturnType<typeof api.quickDealSendCounter>>>(() => api.quickDealSendCounter(), keys.quickDeal(defaultQuickDealId)); }
export function useQuickDealAccept() { return mutation<void, Awaited<ReturnType<typeof api.quickDealAccept>>>(() => api.quickDealAccept(), keys.quickDeal(defaultQuickDealId)); }
export function useQuickDealConfirm() { return mutation<void, Awaited<ReturnType<typeof api.quickDealConfirm>>>(() => api.quickDealConfirm(), keys.quickDeal(defaultQuickDealId)); }
export function useQuickDealSync() { return mutation<void, Awaited<ReturnType<typeof api.quickDealSync>>>(() => api.quickDealSync(), keys.quickDeal(defaultQuickDealId)); }
export function useAddPlanItem() { return mutation<{ title: string; amount: number }, Awaited<ReturnType<typeof api.addPlanItem>>>(({ title, amount }) => api.addPlanItem(title, amount), keys.plan(defaultPlanId)); }
export function useAdvanceWork() { return mutation<void, Awaited<ReturnType<typeof api.advanceWork>>>(() => api.advanceWork(), keys.order(defaultOrderId)); }
export function useApproveWork() { return mutation<void, Awaited<ReturnType<typeof api.approveWork>>>(() => api.approveWork(), keys.order(defaultOrderId)); }
export function useOpenWorkConcern() { return mutation<void, Awaited<ReturnType<typeof api.openWorkConcern>>>(() => api.openWorkConcern(), keys.order(defaultOrderId)); }
export function useReportExternalCash() { return mutation<void, Awaited<ReturnType<typeof api.reportExternalCash>>>(() => api.reportExternalCash(), keys.order(defaultOrderId)); }
