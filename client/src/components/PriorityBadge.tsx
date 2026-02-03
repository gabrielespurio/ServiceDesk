import { 
  ArrowDown, 
  ArrowRight, 
  ArrowUp, 
  AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig: Record<string, { label: string; icon: any; className: string }> = {
  baixa: { 
    label: "Baixa", 
    icon: ArrowDown, 
    className: "text-slate-500" 
  },
  media: { 
    label: "Média", 
    icon: ArrowRight, 
    className: "text-blue-500" 
  },
  alta: { 
    label: "Alta", 
    icon: ArrowUp, 
    className: "text-orange-500" 
  },
  critica: { 
    label: "Crítica", 
    icon: AlertTriangle, 
    className: "text-red-600 font-bold" 
  },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] || priorityConfig.media;
  const Icon = config.icon;
  
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.className)}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </div>
  );
}
