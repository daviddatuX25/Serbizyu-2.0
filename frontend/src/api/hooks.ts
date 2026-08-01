import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/mock";
import type { RequestDraft } from "@/types/domain";

export const keys = { home: ["home"] as const, viewer: ["viewer"] as const, services: ["services"] as const, requests: ["requests"] as const, order: ["order"] as const, quickDeal: ["quick-deal"] as const, plan: ["work-plan"] as const };
export function useHome() { return useQuery({ queryKey: keys.home, queryFn: api.getHome }); }
export function useViewer() { return useQuery({ queryKey: keys.viewer, queryFn: api.getViewer }); }
export function useServices() { return useQuery({ queryKey: keys.services, queryFn: api.listServices }); }
export function useRequests() { return useQuery({ queryKey: keys.requests, queryFn: api.listRequests }); }
export function useOrder() { return useQuery({ queryKey: keys.order, queryFn: api.getOrder }); }
export function useQuickDeal() { return useQuery({ queryKey: keys.quickDeal, queryFn: api.getQuickDeal }); }
export function useWorkPlan() { return useQuery({ queryKey: keys.plan, queryFn: api.getWorkPlan }); }
function mutation<TInput, TOutput>(fn: (input: TInput) => Promise<TOutput>, key: readonly unknown[]) { const client = useQueryClient(); return useMutation({ mutationFn: fn, onSuccess: (data) => client.setQueryData(key, data) }); }
export function useCreateRequest() { const client = useQueryClient(); return useMutation({ mutationFn: (draft: RequestDraft) => api.createRequest(draft), onSuccess: () => { void client.invalidateQueries({ queryKey: keys.requests }); void client.invalidateQueries({ queryKey: keys.home }); } }); }
export function useQuickDealCamera() { return mutation<void, Awaited<ReturnType<typeof api.quickDealStartCamera>>>(() => api.quickDealStartCamera(), keys.quickDeal); }
export function useQuickDealAdjust() { return mutation<number, Awaited<ReturnType<typeof api.quickDealAdjust>>>(api.quickDealAdjust, keys.quickDeal); }
export function useQuickDealCounter() { return mutation<void, Awaited<ReturnType<typeof api.quickDealSendCounter>>>(() => api.quickDealSendCounter(), keys.quickDeal); }
export function useQuickDealAccept() { return mutation<void, Awaited<ReturnType<typeof api.quickDealAccept>>>(() => api.quickDealAccept(), keys.quickDeal); }
export function useQuickDealConfirm() { return mutation<void, Awaited<ReturnType<typeof api.quickDealConfirm>>>(() => api.quickDealConfirm(), keys.quickDeal); }
export function useQuickDealSync() { return mutation<void, Awaited<ReturnType<typeof api.quickDealSync>>>(() => api.quickDealSync(), keys.quickDeal); }
export function useAddPlanItem() { return mutation<{ title: string; amount: number }, Awaited<ReturnType<typeof api.addPlanItem>>>(({ title, amount }) => api.addPlanItem(title, amount), keys.plan); }
export function useAdvanceWork() { return mutation<void, Awaited<ReturnType<typeof api.advanceWork>>>(() => api.advanceWork(), keys.order); }
