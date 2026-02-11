import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertTicket } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type TicketFilters = {
  status?: string;
  priority?: string;
  assignedToMe?: string;
  queueId?: number;
};

export function useTickets(filters?: TicketFilters) {
  // Convert undefined to string if needed, or rely on URLSearchParams handling
  const queryParams = new URLSearchParams();
  if (filters?.status && filters.status !== "all") queryParams.append("status", filters.status);
  if (filters?.priority && filters.priority !== "all") queryParams.append("priority", filters.priority);
  if (filters?.assignedToMe) queryParams.append("assignedToMe", filters.assignedToMe);
  if (filters?.queueId) queryParams.append("queueId", String(filters.queueId));

  const queryString = queryParams.toString();
  const url = `${api.tickets.list.path}${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: [api.tickets.list.path, filters],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return api.tickets.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Real-time-ish updates
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: [api.tickets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.tickets.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return api.tickets.get.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertTicket, "creatorId" | "assignedToId">) => {
      const res = await fetch(api.tickets.create.path, {
        method: api.tickets.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create ticket");
      return api.tickets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      toast({ title: "Ticket Created", description: "Support team has been notified." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertTicket>) => {
      const url = buildUrl(api.tickets.update.path, { id });
      const res = await fetch(url, {
        method: api.tickets.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update ticket");
      return api.tickets.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.tickets.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.tickets.get.path, data.id] });
      toast({ title: "Ticket Updated" });
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}
