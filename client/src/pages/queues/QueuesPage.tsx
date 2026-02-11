import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTickets, useUpdateTicket } from "@/hooks/use-tickets";
import { useState } from "react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Inbox,
  UserCheck,
  Loader2,
  ChevronLeft,
  ListOrdered
} from "lucide-react";

type QueueWithStats = {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  teams: { id: number; name: string }[];
  users: { id: number; username: string; fullName: string; role: string }[];
  ticketCount: number;
};

export default function QueuesPage() {
  const { user } = useAuth();
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: queues, isLoading } = useQuery<QueueWithStats[]>({
    queryKey: ["/api/queues/my-queues"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/queues/my-queues");
      return res.json();
    },
  });

  const { data: tickets, isLoading: isLoadingTickets } = useTickets(
    selectedQueueId ? { queueId: selectedQueueId } : { queueId: -1 }
  );
  const queueTickets = selectedQueueId ? (tickets || []) : [];

  const updateTicket = useUpdateTicket();

  const handleAssignToMe = (ticketId: number) => {
    if (!user) return;
    updateTicket.mutate({ id: ticketId, assignedToId: user.id, status: "em_andamento" });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedQueue = queues?.find((q) => q.id === selectedQueueId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] -m-4 md:-m-8" data-testid="queues-page">
      <div
        className={`border-r bg-card flex flex-col shrink-0 transition-all duration-200 ${
          sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <h2 className="text-sm font-semibold text-foreground truncate">Filas</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarCollapsed(true)}
            data-testid="button-collapse-sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-1">
            {!queues || queues.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Nenhuma fila disponível.
              </div>
            ) : (
              queues.map((queue) => (
                <button
                  key={queue.id}
                  onClick={() => setSelectedQueueId(queue.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 text-sm transition-colors ${
                    selectedQueueId === queue.id
                      ? "bg-primary text-white font-medium"
                      : "text-foreground hover-elevate"
                  }`}
                  data-testid={`button-queue-${queue.id}`}
                >
                  <span className="truncate">{queue.name}</span>
                  <span
                    className={`text-xs font-semibold tabular-nums shrink-0 ${
                      selectedQueueId === queue.id
                        ? "text-white"
                        : "text-muted-foreground"
                    }`}
                    data-testid={`text-ticket-count-${queue.id}`}
                  >
                    {queue.ticketCount}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            {sidebarCollapsed && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarCollapsed(false)}
                data-testid="button-expand-sidebar"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
            )}
            <h1 className="text-lg font-semibold truncate" data-testid="text-page-title">
              {selectedQueue ? selectedQueue.name : "Filas de Atendimento"}
            </h1>
          </div>
          {selectedQueue && (
            <span className="text-sm text-muted-foreground shrink-0" data-testid="text-total-tickets">
              {queueTickets.length} ticket{queueTickets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {!selectedQueue ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-state">
                Selecione uma fila
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Escolha uma fila de atendimento no painel à esquerda para visualizar os chamados.
              </p>
            </div>
          ) : (
            <div className="border-t-0">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead className="w-[150px]">Solicitante</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[100px]">Prioridade</TableHead>
                    <TableHead className="w-[150px]">Criado em</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTickets ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : queueTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhum chamado nesta fila.
                      </TableCell>
                    </TableRow>
                  ) : (
                    queueTickets.map((ticket: any) => (
                      <TableRow key={ticket.id} className="group hover:bg-muted/30" data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                          #{ticket.id}
                        </TableCell>
                        <TableCell>
                          <Link href={`/portal/ticket/${ticket.id}`} className="font-medium hover:text-primary transition-colors block">
                            {ticket.title}
                          </Link>
                          <span className="text-xs text-muted-foreground truncate max-w-[300px] block mt-0.5">
                            {ticket.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                              {ticket.creator?.fullName?.[0] || "?"}
                            </div>
                            <span className="text-sm">{ticket.creator?.fullName || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {ticket.createdAt
                            ? formatDistanceToNow(new Date(ticket.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {!ticket.assignedToId ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Atribuir a mim"
                              onClick={() => handleAssignToMe(ticket.id)}
                              data-testid={`button-assign-ticket-${ticket.id}`}
                            >
                              <UserCheck className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            </Button>
                          ) : (
                            <Link href={`/portal/ticket/${ticket.id}`}>
                              <Button variant="ghost" size="sm" data-testid={`button-view-ticket-${ticket.id}`}>
                                Ver
                              </Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
