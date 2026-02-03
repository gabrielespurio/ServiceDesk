import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  aberto: { 
    label: "Aberto", 
    className: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200" 
  },
  em_andamento: { 
    label: "Em Andamento", 
    className: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200" 
  },
  aguardando_usuario: { 
    label: "Aguardando Usuário", 
    className: "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200" 
  },
  resolvido: { 
    label: "Resolvido", 
    className: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" 
  },
  fechado: { 
    label: "Fechado", 
    className: "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200" 
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.aberto;
  
  return (
    <Badge variant="outline" className={cn("font-medium px-2 py-0.5 rounded-md", config.className)}>
      {config.label}
    </Badge>
  );
}
