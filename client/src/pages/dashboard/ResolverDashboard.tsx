import { useTickets, useUpdateTicket } from "@/hooks/use-tickets";
import { useResolvers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatDistanceToNow } from "date-fns";
import { Search, UserCheck } from "lucide-react";

export default function ResolverDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my-queue");
  
  // Fetch tickets based on active tab
  const filters = {
    assignedToMe: activeTab === "my-queue" ? "true" : undefined,
    status: activeTab === "all-open" ? "open" : undefined,
  };
  
  const { data: tickets, isLoading } = useTickets(filters);
  const updateTicket = useUpdateTicket();

  const handleAssignToMe = (ticketId: number) => {
    if (!user) return;
    updateTicket.mutate({ id: ticketId, assignedToId: user.id, status: 'in_progress' });
  };

  const filteredTickets = tickets || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Agent Dashboard</h1>
        <div className="flex gap-2">
           <Input className="w-[300px]" placeholder="Search tickets..." prefix={<Search className="w-4 h-4 text-muted-foreground" />} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-queue">My Queue</TabsTrigger>
          <TabsTrigger value="all-open">Unassigned / Open</TabsTrigger>
          <TabsTrigger value="all">All Tickets</TabsTrigger>
        </TabsList>

        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[150px]">Requester</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[150px]">Created</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No tickets found.</TableCell>
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
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(ticket.createdAt!), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {!ticket.assignedToId && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0" 
                          title="Assign to me"
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
      </Tabs>
    </div>
  );
}
