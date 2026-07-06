import { useTickets, useUpdateTicket } from "@/hooks/use-tickets";
import { useResolvers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { KanbanBoard } from "@/components/KanbanBoard";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, UserCheck, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ResolverDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my-queue");
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    return (localStorage.getItem("dashboardViewMode") as "list" | "kanban") || "list";
  });

  useEffect(() => {
    localStorage.setItem("dashboardViewMode", viewMode);
  }, [viewMode]);
  
  // Fetch tickets based on active tab
  const filters = {
    assignedToMe: activeTab === "my-queue" ? "true" : undefined,
    unassigned: activeTab === "all-open" ? "true" : undefined,
    status: activeTab === "all-open" ? "aberto" : undefined,
  };
  
  const { data: tickets, isLoading } = useTickets(filters);
  const updateTicket = useUpdateTicket();

  const handleAssignToMe = (ticketId: number) => {
    if (!user) return;
    updateTicket.mutate({ id: ticketId, assignedToId: user.id, status: 'em_andamento' });
  };

  const handleStatusChange = (ticketId: number, newStatus: string) => {
    updateTicket.mutate({ id: ticketId, status: newStatus as any });
  };

  const filteredTickets = tickets || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Painel de Atendimento</h1>
        <div className="flex items-center gap-2">
           <div className="flex bg-muted p-1 rounded-lg mr-2">
             <Button 
               variant={viewMode === "list" ? "secondary" : "ghost"} 
               size="sm" 
               className="h-8 w-8 p-0"
               onClick={() => setViewMode("list")}
               title="Visualização em Lista"
             >
               <List className="h-4 w-4" />
             </Button>
             <Button 
               variant={viewMode === "kanban" ? "secondary" : "ghost"} 
               size="sm" 
               className="h-8 w-8 p-0"
               onClick={() => setViewMode("kanban")}
               title="Visualização em Kanban"
             >
               <LayoutGrid className="h-4 w-4" />
             </Button>
           </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="w-[200px] lg:w-[300px] pl-9" placeholder="Buscar chamados..." />
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-queue">Minha Fila</TabsTrigger>
          <TabsTrigger value="all-open">Não Atribuídos / Abertos</TabsTrigger>
          <TabsTrigger value="all">Todos os Chamados</TabsTrigger>
        </TabsList>

        {viewMode === "list" ? (
          <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead className="w-[150px]">Solicitante</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Prioridade</TableHead>
                  <TableHead className="w-[120px]">SLA</TableHead>
                  <TableHead className="w-[150px]">Criado em</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">Carregando...</TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum chamado encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="group hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-medium text-muted-foreground">#{ticket.id}</TableCell>
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
                           <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                             {ticket.creator.fullName[0]}
                           </div>
                           <span className="text-sm">{ticket.creator.fullName}</span>
                         </div>
                      </TableCell>
                      <TableCell><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell>
                         {(ticket as any).sla ? (
                           (ticket as any).sla.isResolved ? (
                             (ticket as any).sla.wasMet ? (
                               <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-bold">No Prazo</Badge>
                             ) : (
                               <Badge variant="destructive" className="font-bold">Atrasado</Badge>
                             )
                           ) : (
                             (ticket as any).sla.isOverdue ? (
                               <Badge variant="destructive" className="font-bold">Vencido</Badge>
                             ) : (
                               <div className="flex flex-col">
                                 <span className="text-xs font-medium text-orange-600">
                                   {formatDistanceToNow(new Date((ticket as any).sla.deadline), { locale: ptBR })}
                                 </span>
                                 <span className="text-[10px] text-muted-foreground">restante</span>
                               </div>
                             )
                           )
                         ) : (
                           <span className="text-muted-foreground text-xs">—</span>
                         )}
                       </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(ticket.createdAt!), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        {!ticket.assignedToId && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            title="Atribuir a mim"
                            onClick={() => handleAssignToMe(ticket.id)}
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
        ) : (
          <div className="pt-2">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-[400px] bg-muted/20 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <KanbanBoard 
                tickets={filteredTickets} 
                onStatusChange={handleStatusChange} 
              />
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
