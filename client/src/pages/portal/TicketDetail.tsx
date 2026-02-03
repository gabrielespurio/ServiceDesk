import { useTicket, useUpdateTicket } from "@/hooks/use-tickets";
import { useMessages, useCreateMessage } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useRoute, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Separator } from "@/components/ui/separator";
import { Send, ArrowLeft, Lock, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function TicketDetail() {
  const [, params] = useRoute("/portal/ticket/:id");
  const [, setLocation] = useLocation();
  const ticketId = parseInt(params?.id || "0");
  const { user } = useAuth();
  
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId);
  const { data: messages, isLoading: messagesLoading } = useMessages(ticketId);
  
  const createMessage = useCreateMessage();
  const updateTicket = useUpdateTicket();
  
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isResolver = user?.role === 'resolver' || user?.role === 'admin';

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    createMessage.mutate(
      { ticketId, content: newMessage, isInternal },
      { onSuccess: () => setNewMessage("") }
    );
  };

  const handleStatusChange = (newStatus: string) => {
    updateTicket.mutate({ id: ticketId, status: newStatus as any });
  };

  if (ticketLoading || messagesLoading) return <div className="p-8 text-center">Loading ticket details...</div>;
  if (!ticket) return <div className="p-8 text-center">Ticket not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <Button variant="ghost" className="pl-0" onClick={() => setLocation(isResolver ? "/dashboard" : "/portal")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {isResolver && (
          <div className="flex items-center gap-2">
            <SelectStatus currentStatus={ticket.status} onChange={handleStatusChange} />
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden h-full min-h-0">
          <div className="p-6 border-b shrink-0 bg-background/50">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">{ticket.title}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-mono">#{ticket.id}</span>
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <span>•</span>
                  <span>{format(new Date(ticket.createdAt!), 'PPP')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
             {/* Original Problem Description as first message */}
             <div className="flex gap-4">
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {ticket.creator.fullName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">{ticket.creator.fullName}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(ticket.createdAt!), 'p')}</span>
                  </div>
                  <div className="bg-white p-4 rounded-r-2xl rounded-bl-2xl shadow-sm border text-sm leading-relaxed">
                    {ticket.description}
                  </div>
                </div>
             </div>
             
             <Separator className="my-4" label="Conversation Started" />

             {messages?.map((msg) => {
               const isMe = msg.userId === user?.id;
               // Hide internal messages from regular users
               if (msg.isInternal && !isResolver) return null;

               return (
                 <div key={msg.id} className={cn("flex gap-4", isMe && "flex-row-reverse")}>
                    <Avatar className={cn("w-10 h-10 border border-border", msg.isInternal && "ring-2 ring-yellow-400")}>
                      <AvatarFallback className={cn(isMe ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                        {msg.user.fullName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("space-y-1 max-w-[80%]", isMe && "items-end flex flex-col")}>
                      <div className="flex items-baseline gap-2">
                        {msg.isInternal && <Lock className="w-3 h-3 text-yellow-600" />}
                        <span className="font-semibold text-sm">{msg.user.fullName}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(msg.createdAt!), 'p')}</span>
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl shadow-sm border text-sm leading-relaxed",
                        isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white rounded-tl-none",
                        msg.isInternal && "bg-yellow-50 border-yellow-200 text-yellow-900"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                 </div>
               );
             })}
             <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-background border-t shrink-0">
             <form onSubmit={handleSendMessage} className="space-y-4">
               {isResolver && (
                 <div className="flex items-center gap-2 mb-2">
                   <Switch id="internal-mode" checked={isInternal} onCheckedChange={setIsInternal} />
                   <Label htmlFor="internal-mode" className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                     <Lock className="w-3 h-3" />
                     Internal Note
                   </Label>
                 </div>
               )}
               <div className="flex gap-4">
                 <Textarea 
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   placeholder={isInternal ? "Add an internal note (visible only to team)..." : "Type a reply..."}
                   className={cn("min-h-[80px] resize-none shadow-sm", isInternal && "bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-400")}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSendMessage(e);
                     }
                   }}
                 />
                 <Button 
                   type="submit" 
                   size="icon" 
                   className={cn("h-auto w-14 shrink-0 rounded-xl", isInternal ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "")}
                   disabled={!newMessage.trim() || createMessage.isPending}
                 >
                   <Send className="w-5 h-5" />
                 </Button>
               </div>
             </form>
          </div>
        </div>

        {/* Sidebar Info - Desktop Only */}
        <div className="hidden lg:block w-80 space-y-6">
           <Card className="border-border/50 shadow-sm">
             <CardHeader>
               <CardTitle className="text-sm font-medium">Ticket Details</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex flex-col gap-1">
                 <span className="text-xs text-muted-foreground">Requester</span>
                 <div className="flex items-center gap-2 text-sm font-medium">
                   <Avatar className="w-6 h-6">
                     <AvatarFallback>{ticket.creator.fullName[0]}</AvatarFallback>
                   </Avatar>
                   {ticket.creator.fullName}
                 </div>
                 <span className="text-xs text-muted-foreground">{ticket.creator.email}</span>
               </div>
               <Separator />
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-1">
                   <span className="text-xs text-muted-foreground">Category</span>
                   <span className="text-sm font-medium capitalize">{ticket.category}</span>
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="text-xs text-muted-foreground">Priority</span>
                   <PriorityBadge priority={ticket.priority} />
                 </div>
               </div>
               <Separator />
               <div className="flex flex-col gap-1">
                 <span className="text-xs text-muted-foreground">Assigned To</span>
                 <div className="flex items-center gap-2 text-sm font-medium">
                   {ticket.assignee ? (
                     <>
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-blue-100 text-blue-700">{ticket.assignee.fullName[0]}</AvatarFallback>
                        </Avatar>
                        {ticket.assignee.fullName}
                     </>
                   ) : (
                     <span className="text-muted-foreground italic">Unassigned</span>
                   )}
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function SelectStatus({ currentStatus, onChange }: { currentStatus: string, onChange: (s: string) => void }) {
  const statuses = ["open", "in_progress", "waiting_user", "resolved", "closed"];
  return (
    <select 
      className="h-9 px-3 py-1 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      value={currentStatus}
      onChange={(e) => onChange(e.target.value)}
    >
      {statuses.map(s => (
        <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
      ))}
    </select>
  );
}
