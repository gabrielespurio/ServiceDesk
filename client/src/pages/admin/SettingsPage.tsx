import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ChevronRight,
  Plus,
  Trash2,
  Settings
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Form } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import FormBuilder from "@/components/FormBuilder";

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

function FormsSettings() {
  const { toast } = useToast();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);

  const { data: forms, isLoading } = useQuery<Form[]>({
    queryKey: [api.forms.list.path],
  });

  const createFormMutation = useMutation({
    mutationFn: async (form: any) => {
      const res = await apiRequest("POST", api.forms.create.path, {
        ...form,
        active: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.forms.list.path] });
      setIsBuilderOpen(false);
      setEditingForm(null);
      toast({ title: "Sucesso", description: "Formulário salvo com sucesso" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao salvar", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.forms.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.forms.list.path] });
      toast({ title: "Sucesso", description: "Formulário excluído com sucesso" });
    },
  });

  if (isLoading) return <div>Carregando...</div>;

  if (isBuilderOpen) {
    return (
      <FormBuilder
        initialData={editingForm || undefined}
        onSave={(data) => createFormMutation.mutate(data)}
        onCancel={() => {
          setIsBuilderOpen(false);
          setEditingForm(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Lista de Formulários</h3>
          <p className="text-sm text-muted-foreground">Gerencie os formulários disponíveis para seus clientes.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsBuilderOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      <div className="grid gap-4">
        {forms?.map((form) => (
          <Card key={form.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
              <div className="space-y-1">
                <CardTitle className="text-base">{form.name}</CardTitle>
                <CardDescription>{form.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setEditingForm(form);
                    setIsBuilderOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive"
                  onClick={() => deleteFormMutation.mutate(form.id)}
                  disabled={deleteFormMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
        {forms?.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
            Nenhum formulário cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("forms");

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações globais do sistema.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-10rem)]">
        {/* Settings Navigation */}
        <aside className="w-full md:w-64 shrink-0 overflow-y-auto">
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
        <main className="flex-1 overflow-hidden">
          <Card className="border-none shadow-none bg-muted/30 h-full">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-6 shrink-0">
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
              
              <div className="flex-1 overflow-hidden">
                {activeSection === "forms" ? (
                  <FormsSettings />
                ) : (
                  <div className="h-full p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2 opacity-60">
                    <p className="text-lg font-medium">Módulo em desenvolvimento</p>
                    <p className="text-sm text-muted-foreground">
                      A configuração de {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label.toLowerCase()} estará disponível em breve.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
