import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMessage } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMessages(ticketId: number) {
  return useQuery({
    queryKey: [api.messages.list.path, ticketId],
    queryFn: async () => {
      const url = buildUrl(api.messages.list.path, { ticketId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
    refetchInterval: 3000, // Poll for chat messages
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, ...data }: { ticketId: number } & Omit<InsertMessage, "ticketId" | "userId">) => {
      const url = buildUrl(api.messages.create.path, { ticketId });
      const res = await fetch(url, {
        method: api.messages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to send message");
      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, variables.ticketId] });
      // Don't toast for every chat message, it's annoying
    },
    onError: (error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });
}
