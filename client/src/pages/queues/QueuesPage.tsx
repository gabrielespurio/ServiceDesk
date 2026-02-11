import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTickets } from "@/hooks/use-tickets";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ListOrdered,
  Users,
  Ticket,
  ChevronRight,
  Inbox,
  UserCheck,
  Loader2,
  Shield
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedQueue = queues?.find(q => q.id === selectedQueueId);

  return (
    <div className="space-y-6" data-testid="queues-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Filas de Atendimento
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e visualize suas filas de atendimento
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !queues || queues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhuma fila encontrada</h3>
            <p className="text-muted-foreground text-sm">
              Você não está atribuído a nenhuma fila de atendimento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map((queue) => (
            <Card
              key={queue.id}
              className={`cursor-pointer transition-all hover-elevate ${
                selectedQueueId === queue.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() =>
                setSelectedQueueId(
                  selectedQueueId === queue.id ? null : queue.id
                )
              }
              data-testid={`card-queue-${queue.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold truncate" data-testid={`text-queue-name-${queue.id}`}>
                    {queue.name}
                  </CardTitle>
                  {queue.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {queue.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={queue.active ? "default" : "secondary"}
                  className="shrink-0"
                  data-testid={`badge-queue-status-${queue.id}`}
                >
                  {queue.active ? "Ativa" : "Inativa"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ticket className="w-4 h-4" />
                    <span data-testid={`text-ticket-count-${queue.id}`}>
                      {queue.ticketCount} chamado{queue.ticketCount !== 1 ? "s" : ""} aberto{queue.ticketCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selectedQueueId === queue.id ? "rotate-90" : ""}`} />
                </div>

                <div className="space-y-2">
                  {queue.teams.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex gap-1 flex-wrap">
                        {queue.teams.map((team) => (
                          <Badge key={team.id} variant="outline" className="text-xs" data-testid={`badge-team-${team.id}`}>
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {queue.users.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex -space-x-2">
                        {queue.users.slice(0, 5).map((u) => (
                          <Avatar key={u.id} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                              {u.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {queue.users.length > 5 && (
                          <Avatar className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                              +{queue.users.length - 5}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedQueueId && selectedQueue && (
        <div className="space-y-4" data-testid="queue-tickets-section">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ListOrdered className="w-5 h-5" />
              Chamados - {selectedQueue.name}
            </h2>
            <Badge variant="secondary">
              {queueTickets.length} chamado{queueTickets.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
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
                      <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell className="font-mono text-xs">#{ticket.id}</TableCell>
                        <TableCell>
                          <Link href={`/portal/ticket/${ticket.id}`}>
                            <span className="font-medium hover:underline cursor-pointer" data-testid={`link-ticket-${ticket.id}`}>
                              {ticket.title}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.creator?.fullName || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.createdAt
                            ? formatDistanceToNow(new Date(ticket.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/portal/ticket/${ticket.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-ticket-${ticket.id}`}>
                              Ver
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
