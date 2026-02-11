import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTickets, useUpdateTicket } from "@/hooks/use-tickets";
import { useState } from "react";
import { Link } from "wouter";
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
  Loader2,
  ChevronRight,
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  return (
    <div className="flex flex-col space-y-2" data-testid="queues-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Filas de Atendimento
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
        <aside className={`${isSidebarCollapsed ? "w-16" : "w-full md:w-64"} shrink-0 transition-all duration-300 ease-in-out`}>
          <div className="flex flex-col h-full bg-white dark:bg-card rounded-xl shadow-sm border overflow-hidden p-2">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="flex items-center justify-center p-2 mb-4 hover:bg-muted rounded-md transition-colors text-muted-foreground"
              title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              data-testid="button-toggle-sidebar"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>

            <nav className="flex flex-col space-y-1 overflow-y-auto overflow-x-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !queues || queues.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  {isSidebarCollapsed ? "—" : "Nenhuma fila disponível."}
                </div>
              ) : (
                queues.map((queue) => (
                  <button
                    key={queue.id}
                    onClick={() => setSelectedQueueId(queue.id)}
                    title={isSidebarCollapsed ? queue.name : ""}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all ${
                      selectedQueueId === queue.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                    data-testid={`button-queue-${queue.id}`}
                  >
                    <ListOrdered className={`shrink-0 ${isSidebarCollapsed ? "h-5 w-5" : "h-4 w-4"}`} />
                    {!isSidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{queue.name}</span>
                        <span
                          className={`text-xs tabular-nums shrink-0 ${
                            selectedQueueId === queue.id ? "text-primary-foreground/80" : "text-muted-foreground"
                          }`}
                          data-testid={`text-ticket-count-${queue.id}`}
                        >
                          {queue.ticketCount}
                        </span>
                        {selectedQueueId === queue.id && <ChevronRight className="h-4 w-4" />}
                      </>
                    )}
                  </button>
                ))
              )}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-h-0">
          <Card className="border-none shadow-none bg-muted/30 h-full overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col min-h-0">
              {!selectedQueue ? (
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
                      {selectedQueue.name}
                    </h2>
                    <span className="text-sm text-muted-foreground" data-testid="text-total-tickets">
                      {queueTickets.length} ticket{queueTickets.length !== 1 ? "s" : ""}
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
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
