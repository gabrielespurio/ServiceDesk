import { 
  ArrowDown, 
  ArrowRight, 
  ArrowUp, 
  AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig: Record<string, { label: string; icon: any; className: string }> = {
  low: { 
    label: "Low", 
    icon: ArrowDown, 
    className: "text-slate-500" 
  },
  medium: { 
    label: "Medium", 
    icon: ArrowRight, 
    className: "text-blue-500" 
  },
  high: { 
    label: "High", 
    icon: ArrowUp, 
    className: "text-orange-500" 
  },
  critical: { 
    label: "Critical", 
    icon: AlertTriangle, 
    className: "text-red-600 font-bold" 
  },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  const Icon = config.icon;
  
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.className)}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </div>
  );
}
