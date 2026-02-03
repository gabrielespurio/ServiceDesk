import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Zap, 
  ListOrdered, 
  Users, 
  Calendar, 
  Clock, 
  GitBranch, 
  UserCog, 
  MessageSquare,
  ChevronRight
} from "lucide-react";

const SETTINGS_SECTIONS = [
  { id: "forms", label: "Formulários", icon: FileText },
  { id: "automations", label: "Gatilhos ou Automações", icon: Zap },
  { id: "queues", label: "Filas de atendimento", icon: ListOrdered },
  { id: "teams", label: "Equipes", icon: Users },
  { id: "roster", label: "Escala", icon: Calendar },
  { id: "sla", label: "SLA", icon: Clock },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "users", label: "Gerenciamento de usuários", icon: UserCog },
  { id: "templates", label: "Templates de respostas", icon: MessageSquare },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("forms");

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações globais do sistema.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <section.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{section.label}</span>
                {activeSection === section.id && <ChevronRight className="h-4 w-4" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Settings Content */}
        <main className="flex-1">
          <Card className="border-none shadow-none bg-muted/30 min-h-[500px]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.icon && (
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {(() => {
                      const Icon = SETTINGS_SECTIONS.find(s => s.id === activeSection)?.icon;
                      return Icon ? <Icon className="h-5 w-5" /> : null;
                    })()}
                  </div>
                )}
                <h2 className="text-xl font-semibold">
                  {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}
                </h2>
              </div>
              
              <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2 opacity-60">
                <p className="text-lg font-medium">Módulo em desenvolvimento</p>
                <p className="text-sm text-muted-foreground">
                  A configuração de {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label.toLowerCase()} estará disponível em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
