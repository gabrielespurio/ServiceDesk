import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { type Ticket, type User } from "@shared/schema";
import { TicketCard } from "./TicketCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "aberto", label: "Aberto", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { id: "em_andamento", label: "Em Atendimento", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { id: "aguardando_usuario", label: "Aguardando Usuário", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { id: "resolvido", label: "Resolvido", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { id: "fechado", label: "Fechado", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
];

interface KanbanBoardProps {
  tickets: (Ticket & { creator: User; assignee: User | null })[];
  onStatusChange: (ticketId: number, newStatus: string) => void;
}

export function KanbanBoard({ tickets, onStatusChange }: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const ticketId = parseInt(active.id.toString(), 10);
      const newStatus = over.id as string;
      onStatusChange(ticketId, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 min-h-[600px] overflow-x-auto pb-6 -mx-4 px-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            color={column.color}
            tickets={tickets.filter((t) => t.status === column.id)}
          />
        ))}
      </div>
    </DndContext>
  );
}

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  tickets: (Ticket & { creator: User; assignee: User | null })[];
}

function KanbanColumn({ id, label, color, tickets }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full w-[320px] min-w-[320px] rounded-xl border bg-muted/20 transition-all duration-200",
        isOver && "bg-muted/40 ring-2 ring-primary/20 border-primary/30"
      )}
    >
      <div className="p-3 border-b border-border/50 bg-background/40 backdrop-blur-sm sticky top-0 rounded-t-xl z-10">
        <div className={cn(
          "px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-between",
          color
        )}>
          <span>{label}</span>
          <span className="bg-background/80 px-2 py-0.5 rounded-full text-[10px] shadow-sm">
            {tickets.length}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3 h-[calc(100vh-320px)]">
        <div className="space-y-3 px-1">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          {tickets.length === 0 && (
            <div className="border-2 border-dashed border-muted-foreground/10 rounded-xl h-24 flex items-center justify-center text-muted-foreground/40 text-xs italic">
              Nenhum ticket
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
