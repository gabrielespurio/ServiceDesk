import { type Ticket, type User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TicketCardProps {
  ticket: Ticket & { creator: User; assignee: User | null };
}

export function TicketCard({ ticket }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: ticket.id.toString(),
    data: {
      ticket,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "touch-none select-none",
        isDragging && "opacity-0" // Hide original card while dragging for smoother effect
      )}
    >
      <Card className="hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing border-border/40 group overflow-hidden">
        <div className="h-1 w-full bg-muted group-hover:bg-primary/30 transition-colors" />
        <CardContent className="p-3 space-y-3">
          <div className="flex justify-between items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
              #{ticket.id}
            </span>
            <PriorityBadge priority={ticket.priority} />
          </div>
          
          <div className="space-y-1">
            <Link href={`/portal/ticket/${ticket.id}`}>
              <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                {ticket.title}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
            </Link>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <p className="text-[10px] font-medium text-muted-foreground">
                {ticket.category}
              </p>
            </div>
            
            {(ticket as any).sla && (
              <div className="pt-1">
                {(ticket as any).sla.isOverdue ? (
                  <Badge variant="destructive" className="h-5 text-[9px] font-bold px-1.5 py-0">Vencido</Badge>
                ) : (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Clock className="w-3 h-3" />
                    <span className="text-[9px] font-bold">
                      {formatDistanceToNow(new Date((ticket as any).sla.deadline), { locale: ptBR })} restante
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] flex items-center justify-center font-black border border-primary/10">
                {ticket.creator.fullName[0]}
              </div>
              <span className="text-[10px] font-medium text-foreground/80">
                {ticket.creator.fullName.split(' ')[0]}
              </span>
            </div>
            <span className="text-[9px] font-medium text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {formatDistanceToNow(new Date(ticket.createdAt!), { locale: ptBR })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
