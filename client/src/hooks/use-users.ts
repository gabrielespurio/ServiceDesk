import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useResolvers() {
  return useQuery({
    queryKey: [api.users.listResolvers.path],
    queryFn: async () => {
      const res = await fetch(api.users.listResolvers.path);
      if (!res.ok) throw new Error("Failed to fetch resolvers");
      return api.users.listResolvers.responses[200].parse(await res.json());
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: [api.users.stats.path],
    queryFn: async () => {
      const res = await fetch(api.users.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.users.stats.responses[200].parse(await res.json());
    },
  });
}
