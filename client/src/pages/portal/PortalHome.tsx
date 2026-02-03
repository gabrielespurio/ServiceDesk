import { useTickets } from "@/hooks/use-tickets";
import { Link } from "wouter";
import { Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function PortalHome() {
  const { data: tickets, isLoading } = useTickets();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted/20 animate-pulse rounded-xl" />
        <div className="h-64 bg-muted/20 animate-pulse rounded-xl" />
      </div>
    );
  }

  const myTickets = tickets || [];
  const openCount = myTickets.filter(t => t.status !== 'resolvido' && t.status !== 'fechado').length;
  const resolvedCount = myTickets.filter(t => t.status === 'resolvido').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {user?.fullName.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Aqui está uma visão geral das suas solicitações de suporte.</p>
        </div>
        <Link href="/portal/new">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Novo Chamado
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chamados Abertos</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando resolução</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolvidos</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Concluídos com sucesso</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <CardTitle>Chamados Recentes</CardTitle>
          <CardDescription>Visualize e gerencie suas solicitações de suporte atuais.</CardDescription>
        </CardHeader>
        <CardContent>
          {myTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum chamado encontrado. Precisa de ajuda? Crie um novo chamado.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {myTickets.map((ticket) => (
                <Link key={ticket.id} href={`/portal/ticket/${ticket.id}`} className="block">
                  <div className="group flex items-center justify-between p-4 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border transition-all cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {ticket.title}
                        </span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">#{ticket.id}</span>
                        <span>•</span>
                        <span>{ticket.category}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.createdAt!), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <PriorityBadge priority={ticket.priority} />
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-lg">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
