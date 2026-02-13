import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTickets, useUpdateTicket } from "@/hooks/use-tickets";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Inbox,
  UserCheck,
  Loader2
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

type SelectedView = { type: "my-queue" } | { type: "queue"; id: number } | null;

export default function QueuesPage() {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<SelectedView>(null);

  const { data: queues, isLoading } = useQuery<QueueWithStats[]>({
    queryKey: ["/api/queues/my-queues"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/queues/my-queues");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const isMyQueue = selectedView?.type === "my-queue";
  const selectedQueueId = selectedView?.type === "queue" ? selectedView.id : null;

  const { data: myTickets, isLoading: isLoadingMyTickets } = useTickets({ assignedToMe: "true" });
  const myTicketCount = myTickets?.length ?? 0;

  const queueTicketsFilters = selectedQueueId ? { queueId: selectedQueueId } : { queueId: -1 };
  const { data: tickets, isLoading: isLoadingTickets } = useTickets(queueTicketsFilters);

  const displayTickets = isMyQueue ? (myTickets || []) : selectedQueueId ? (tickets || []) : [];
  const ticketsLoading = isMyQueue ? isLoadingMyTickets : isLoadingTickets;

  const [, navigate] = useLocation();
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

  const selectedQueue = selectedQueueId ? queues?.find((q) => q.id === selectedQueueId) : null;
  const hasSelection = isMyQueue || !!selectedQueue;
  const viewTitle = isMyQueue ? "Minha Fila" : selectedQueue?.name || "";

  return (
    <div className="flex flex-col space-y-2" data-testid="queues-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Filas de Atendimento
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
        <aside className="w-full md:w-72 shrink-0 transition-all duration-300 ease-in-out">
          <div className="flex flex-col h-full bg-white dark:bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-foreground">Filas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Selecione para ver os chamados</p>
            </div>

            <nav className="flex flex-col py-2 px-2 overflow-y-auto overflow-x-hidden flex-1">
              <button
                onClick={() => setSelectedView({ type: "my-queue" })}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-150 mb-1 ${isMyQueue
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground hover:bg-muted/80"
                  }`}
                data-testid="button-my-queue"
              >
                <span className={`flex-1 text-left truncate text-[15px] ${isMyQueue ? "font-semibold" : "font-medium"}`}>
                  Minha Fila
                </span>
                <span
                  className={`text-xs font-semibold tabular-nums shrink-0 min-w-[24px] h-6 flex items-center justify-center rounded-full px-2 ${isMyQueue
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                    }`}
                  data-testid="text-my-queue-count"
                >
                  {myTicketCount}
                </span>
              </button>

              <div className="h-px bg-border mx-2 my-2" />

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !queues || queues.length === 0 ? (
                <div className="px-3 py-8 text-sm text-muted-foreground text-center">
                  Nenhuma fila disponível.
                </div>
              ) : (
                queues.map((queue) => {
                  const isActive = selectedQueueId === queue.id;
                  return (
                    <button
                      key={queue.id}
                      onClick={() => setSelectedView({ type: "queue", id: queue.id })}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-150 mb-0.5 ${isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-foreground hover:bg-muted/80"
                        }`}
                      data-testid={`button-queue-${queue.id}`}
                    >
                      <span className={`flex-1 text-left truncate text-[15px] ${isActive ? "font-semibold" : "font-medium"}`}>
                        {queue.name}
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums shrink-0 min-w-[24px] h-6 flex items-center justify-center rounded-full px-2 ${isActive
                            ? "bg-white/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                          }`}
                        data-testid={`text-ticket-count-${queue.id}`}
                      >
                        {queue.ticketCount}
                      </span>
                    </button>
                  );
                })
              )}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-h-0">
          <Card className="border-none shadow-none bg-muted/30 h-full overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col min-h-0">
              {!hasSelection ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-state">
                    Selecione uma fila
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Escolha uma fila de atendimento no painel à esquerda para visualizar os chamados.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex items-center justify-between gap-2 px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold" data-testid="text-queue-title">
                      {viewTitle}
                    </h2>
                    <span className="text-sm text-muted-foreground" data-testid="text-total-tickets">
                      {displayTickets.length} ticket{displayTickets.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto">
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
                        {ticketsLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ) : displayTickets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              {isMyQueue ? "Nenhum chamado atribuído a você." : "Nenhum chamado nesta fila."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayTickets.map((ticket: any) => (
                            <TableRow
                              key={ticket.id}
                              className="group hover:bg-muted/30 cursor-pointer"
                              onClick={() => navigate(`/portal/ticket/${ticket.id}`)}
                              data-testid={`row-ticket-${ticket.id}`}
                            >
                              <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                #{ticket.id}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-foreground group-hover:text-primary transition-colors block">
                                  {ticket.title}
                                </span>
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
                                {!ticket.assignedToId && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Atribuir a mim"
                                    onClick={(e) => { e.stopPropagation(); handleAssignToMe(ticket.id); }}
                                    data-testid={`button-assign-ticket-${ticket.id}`}
                                  >
                                    <UserCheck className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
