import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/mock";
import type { RequestDraft, Role } from "@/types/domain";

export const keys = {
  dashboard: (role: Role) => ["dashboard", role] as const,
  order: ["order"] as const,
  services: ["services"] as const,
  requests: ["requests"] as const,
};

export function useDashboard(role: Role) {
  return useQuery({ queryKey: keys.dashboard(role), queryFn: () => api.getDashboard(role) });
}

export function useOrder() {
  return useQuery({ queryKey: keys.order, queryFn: api.getOrder });
}

export function useServices() {
  return useQuery({ queryKey: keys.services, queryFn: api.listServices });
}

export function useRequests() {
  return useQuery({ queryKey: keys.requests, queryFn: api.listRequests });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: RequestDraft) => api.createRequest(draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.requests });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReportCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actor: "buyer" | "provider") => api.reportExternalCash(actor),
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order, order);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReportCashMismatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.reportCashMismatch,
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order, order);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAdvanceWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.advanceWork,
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order, order);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
