import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function QueuesPage() {
    const { user } = useAuth();
    const { data, isLoading, error } = useQuery<any[]>({
        queryKey: ["/api/queues/my-queues"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/queues/my-queues");
            return res.json();
        }
    });

    console.log("QueuesPage Rendered", { user, data, isLoading, error });

    if (!user) {
        return <div style={{ padding: "20px", color: "orange" }}>Aguardando usuário...</div>;
    }

    return (
        <div style={{ padding: "20px", border: "5px solid red", backgroundColor: "white" }}>
            <h1>DIAGNOSTIC QUEUES PAGE</h1>
            <p>User: {user.username} (ID: {user.id}, Role: {user.role})</p>
            <p>Status: {isLoading ? "Carregando..." : "Carregado"}</p>
            {error && <p style={{ color: "red" }}>Erro: {(error as any).message}</p>}
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
