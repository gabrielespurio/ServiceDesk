import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Bot, Sparkles, Target, Users, BookOpen, Share2, CheckCircle2, Link2, FileText, Trash2, Upload, BrainCircuit, Key, Workflow, Ticket, UserPlus, Plus, Globe, Database, BookMarked, Cpu, Facebook, Instagram, Code, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaWhatsapp } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const WIZARD_STEPS = [
  { id: "identity", title: "Identidade", icon: Bot, description: "Nome e avatar do assistente" },
  { id: "model", title: "Modelo de IA", icon: BrainCircuit, description: "Selecione o motor de Inteligência Artificial" },
  { id: "objective", title: "Comportamento", icon: Target, description: "Prompt e diretrizes da IA" },
  { id: "knowledge", title: "Conhecimento", icon: BookOpen, description: "O que ele deve saber" },
  { id: "tools", title: "Ferramentas", icon: Code, description: "Integrações (APIs Externas)" },
  { id: "channels", title: "Canais", icon: Share2, description: "Onde ele vai atender" },
  { id: "actions", title: "Ações", icon: Users, description: "O que ele pode executar" },
  { id: "review", title: "Revisão", icon: CheckCircle2, description: "Pronto para ativar" }
];

function CreateWhatsappConnectionInline({ onCreated, onCancel }: { onCreated: (conn: any) => void; onCancel?: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"evolution" | "meta">("evolution");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Insira um nome para a conexão.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/ai/whatsapp-connections", {
        name,
        provider,
        config: null
      });
      if (!res.ok) throw new Error("Erro ao criar conexão");
      const conn = await res.json();
      toast({ title: "Conexão criada!", description: "Agora você pode configurá-la." });
      onCreated(conn);
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao criar conexão.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <DialogHeader>
        <DialogTitle className="text-lg">Nova Conexão WhatsApp</DialogTitle>
        <DialogDescription className="text-xs">
          Crie um ID de conexão para depois configurá-la via QR Code ou Meta Cloud.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-slate-700 font-semibold text-xs">Nome da Conexão</Label>
          <Input 
            placeholder="Ex: Whats do Suporte, WhatsApp Vendas..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 text-sm bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 font-semibold text-xs">API de Conexão</Label>
          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => setProvider("evolution")}
              className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all ${
                provider === "evolution" 
                  ? "border-green-500 bg-green-50/50 font-bold" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-xs">Evolution API</div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5">QR Code</div>
            </div>
            <div 
              onClick={() => setProvider("meta")}
              className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all ${
                provider === "meta" 
                  ? "border-blue-500 bg-blue-50/50 font-bold" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-xs">Meta Cloud</div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5">Oficial</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar Conexão"}
        </Button>
      </div>
    </form>
  );
}

export default function AiAssistantWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [docUrl, setDocUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiAuthType, setApiAuthType] = useState<"none" | "token" | "basic">("none");
  const [apiToken, setApiToken] = useState("");
  const [apiUser, setApiUser] = useState("");
  const [apiPass, setApiPass] = useState("");
  const [selectedType, setSelectedType] = useState<"file" | "url" | "api" | "portal">("file");
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState("");

  const { data: globalConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/connections"],
  });
  const [toolForm, setToolForm] = useState({
    name: "",
    description: "",
    endpoint: "",
    method: "GET",
    authType: "none",
    token: "",
    user: "",
    pass: "",
    tokenUrl: "",
    parameters: [] as { name: string, type: string, description: string, required: boolean, testValue?: string }[]
  });
  const [selectedWhatsappConnectionId, setSelectedWhatsappConnectionId] = useState<number | null>(null);
  const [isNewConnModalOpen, setIsNewConnModalOpen] = useState(false);

  const { data: whatsappConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/whatsapp-connections"],
  });

  const [formData, setFormData] = useState({
    name: "",
    avatar: "🤖",
    description: "",
    provider: "gemini",
    model: "gemini-2.5-flash",
    apiKey: "",
    objective: "",
    personality: "",
    scope: "external",
    categoryId: "",
    enableLogs: false,
    knowledgeBase: [] as { type: string, content: string, token?: string }[],
    tools: [] as any[],
    channels: [] as string[],
    actions: [] as string[],
    n8nConfig: { webhookUrl: "", authToken: "", outputConnectionId: "" },
    facebookConfig: { pageId: "" },
    instagramConfig: { accountId: "" },
    apiRestConfig: { webhookUrl: "", token: "" }
  });

  const createAssistantMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/assistants", {
        name: formData.name,
        avatar: formData.avatar,
        description: formData.description,
        provider: formData.provider,
        model: formData.model,
        apiKey: formData.apiKey,
        objective: formData.objective,
        personality: formData.personality,
        enableLogs: formData.enableLogs,
        active: true,
        scope: formData.scope,
        categoryId: formData.categoryId,
        channels: formData.channels.map(c => {
          if (c === "whatsapp") {
            return {
              type: "whatsapp",
              config: { connectionId: selectedWhatsappConnectionId }
            };
          }
          if (c === "facebook") {
            return { type: "facebook", config: formData.facebookConfig };
          }
          if (c === "instagram") {
            return { type: "instagram", config: formData.instagramConfig };
          }
          if (c === "api_rest") {
            return { type: "api_rest", config: formData.apiRestConfig };
          }
          return { type: c };
        }),
        actions: [
          ...formData.actions.map(a => {
            if (a === "n8n") {
              return { type: "n8n", config: formData.n8nConfig };
            }
            return { type: a };
          }),
          ...formData.tools.map(t => ({ type: 'api_tool', config: t }))
        ],
        knowledgeBase: formData.knowledgeBase
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/assistants"] });
      toast({
        title: "Sucesso!",
        description: "Assistente digital criado e ativado."
      });
      setLocation("/ai/assistants");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar o assistente.",
        variant: "destructive"
      });
    }
  });

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      createAssistantMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    } else {
      setLocation("/ai/assistants");
    }
  };

  const updateForm = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const { data: categories = [], refetch: refetchCategories } = useQuery<any[]>({
    queryKey: ["/api/ai/categories"],
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/ai/categories", { name });
      return res.json();
    },
    onSuccess: (newCat) => {
      refetchCategories();
      updateForm("categoryId", newCat.id.toString());
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
      toast({ title: "Categoria criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar categoria", variant: "destructive" });
    }
  });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate(newCategoryName);
  };

  const StepIcon = WIZARD_STEPS[currentStep].icon;

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 font-sans h-[calc(100vh-2rem)] flex flex-col">
      <div className="w-full flex-1 flex flex-col min-h-0">
        {/* Main Content Area (Full Width) */}
        <Card className="flex-1 flex flex-col border-none shadow-2xl bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100 min-h-0">
          <CardHeader className="border-b bg-slate-50/50 p-6 sm:p-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-xl shadow-sm border border-primary/20 shrink-0">
                <StepIcon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl text-slate-800">{WIZARD_STEPS[currentStep].title}</CardTitle>
                <CardDescription className="text-sm mt-1">{WIZARD_STEPS[currentStep].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6 sm:p-10 w-full custom-scrollbar">
            
            {/* STEP 0: Identity */}
            {currentStep === 0 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-3">
                      <Bot className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Identidade do Assistente</h2>
                    <p className="text-slate-500 text-sm mt-1">Dê um nome e um rosto para a sua nova Inteligência Artificial.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Nome do Assistente</Label>
                      <Input 
                        placeholder="Ex: Sophia, Assistente Financeiro..." 
                        value={formData.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        className="h-12 text-base rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Descrição Curta</Label>
                      <Textarea 
                        placeholder="Ex: Atende clientes pelo WhatsApp, tira dúvidas sobre produtos e serviços." 
                        value={formData.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        rows={3}
                        className="text-base rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20 resize-none min-h-[90px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">Avatar do Assistente</Label>
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                          {formData.avatar && (formData.avatar.startsWith("data:image/") || formData.avatar.startsWith("http")) ? (
                            <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl">{formData.avatar || "🤖"}</span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              id="avatar-upload-wizard"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    updateForm("avatar", reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 rounded-xl px-4 gap-2 text-slate-700 border-slate-200 hover:bg-slate-50"
                              onClick={() => document.getElementById("avatar-upload-wizard")?.click()}
                            >
                              <Upload className="w-4 h-4 text-slate-400" />
                              Carregar Imagem
                            </Button>
                            
                            {(formData.avatar && (formData.avatar.startsWith("data:image/") || formData.avatar.startsWith("http"))) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-10 rounded-xl px-3 text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => updateForm("avatar", "🤖")}
                              >
                                Remover
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-medium">ou Emoji:</span>
                                <Input 
                                  placeholder="🤖" 
                                  value={formData.avatar && !formData.avatar.startsWith("data:image/") && !formData.avatar.startsWith("http") ? formData.avatar : ""}
                                  onChange={(e) => updateForm("avatar", e.target.value || "🤖")}
                                  className="w-14 text-center text-lg h-10 rounded-xl bg-slate-50 border-slate-200"
                                  maxLength={4}
                                />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">Formatos recomendados: PNG, JPG. Max 5MB.</p>
                        </div>
                      </div>
                    </div>

                    {/* Scope and Category Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="space-y-3">
                        <Label className="text-slate-700 font-bold">Escopo do Assistente</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div 
                            onClick={() => updateForm("scope", "internal")}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${
                              formData.scope === "internal" 
                                ? "border-primary bg-primary/5 text-primary" 
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <Database className="w-5 h-5 mb-1" />
                            <span className="text-xs font-bold">Interno (Nexdesk)</span>
                          </div>
                          <div 
                            onClick={() => updateForm("scope", "external")}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${
                              formData.scope === "external" 
                                ? "border-primary bg-primary/5 text-primary" 
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <Globe className="w-5 h-5 mb-1" />
                            <span className="text-xs font-bold">Externo (Canais)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-700 font-bold">Categoria</Label>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={formData.categoryId} 
                            onValueChange={(val) => updateForm("categoryId", val)}
                          >
                            <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl flex-1">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="h-12 w-12 rounded-xl shrink-0 p-0 border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5">
                                <Plus className="w-5 h-5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Nova Categoria</DialogTitle>
                                <DialogDescription>Crie uma nova categoria para organizar seus assistentes.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>Nome da Categoria</Label>
                                  <Input 
                                    placeholder="Ex: Marketing, Vendas, Suporte..." 
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
                                  <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim() || createCategoryMutation.isPending}>
                                    Criar Categoria
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: AI Model */}
              {currentStep === 1 && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-3">
                      <BrainCircuit className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Motor de IA</h2>
                    <p className="text-slate-500 text-sm mt-1">Escolha o provedor (motor) e o respectivo modelo que vai processar as conversas.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Gemini Card */}
                    <div 
                      onClick={() => {
                        updateForm("provider", "gemini");
                        updateForm("model", "gemini-2.5-flash");
                      }}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.provider === "gemini" 
                          ? "border-blue-500 bg-blue-50/50 shadow-md ring-4 ring-blue-500/10" 
                          : "border-slate-200 hover:border-blue-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-[14px]">Google</h4>
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-500 leading-snug">
                        Excelente custo-benefício, com ótimo raciocínio nativo e integração fluida.
                      </p>
                    </div>

                    {/* GPT Card */}
                    <div 
                      onClick={() => {
                        updateForm("provider", "openai");
                        updateForm("model", "gpt-4o-mini");
                      }}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.provider === "openai" 
                          ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-4 ring-emerald-500/10" 
                          : "border-slate-200 hover:border-emerald-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <BrainCircuit className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-[14px]">OpenAI</h4>
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-500 leading-snug">
                        Modelos avançados e otimizados, referência atual em IA conversacional.
                      </p>
                    </div>

                    {/* Anthropic Card */}
                    <div 
                      onClick={() => {
                        updateForm("provider", "anthropic");
                        updateForm("model", "claude-3-5-sonnet-20240620");
                      }}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.provider === "anthropic" 
                          ? "border-purple-500 bg-purple-50/50 shadow-md ring-4 ring-purple-500/10" 
                          : "border-slate-200 hover:border-purple-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-[14px]">Anthropic</h4>
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-500 leading-snug">
                        Forte aderência a instruções e leitura de código com a família Claude 3.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mt-2 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Modelo Específico</Label>
                      <Select 
                        value={formData.model} 
                        onValueChange={(val) => updateForm("model", val)}
                      >
                        <SelectTrigger className="h-11 text-sm bg-white rounded-xl">
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.provider === "gemini" && (
                            <>
                              <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                              <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                              <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                            </>
                          )}
                          {formData.provider === "openai" && (
                            <>
                              <SelectItem value="gpt-5">GPT-5</SelectItem>
                              <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                              <SelectItem value="gpt-5-turbo">GPT-5 Turbo</SelectItem>
                              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            </>
                          )}
                          {formData.provider === "anthropic" && (
                            <>
                              <SelectItem value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</SelectItem>
                              <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                              <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                        <Key className="w-4 h-4 text-slate-400" />
                        Chave da API (API Key)
                      </Label>
                      <Input 
                        type="password"
                        placeholder={
                          formData.provider === "gemini" ? "Sua API Key do Google AI Studio..." : 
                          formData.provider === "openai" ? "Sua API Key da OpenAI (sk-...)" :
                          "Sua API Key da Anthropic (sk-ant-...)"
                        }
                        value={formData.apiKey}
                        onChange={(e) => updateForm("apiKey", e.target.value)}
                        className="font-mono h-11 rounded-xl bg-white text-sm"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        {formData.provider === "gemini" && "Você pode obter uma chave gratuita no Google AI Studio."}
                        {formData.provider === "openai" && "Gere essa chave no painel de desenvolvedores da OpenAI."}
                        {formData.provider === "anthropic" && "Gere essa chave no console da Anthropic."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Objective & Personality (Unified) */}
              {currentStep === 2 && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-3">
                      <Target className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Comportamento e Diretrizes (Prompt)</h2>
                    <p className="text-slate-500 text-sm mt-1">Defina o papel do assistente, como ele deve agir e seu tom de voz.</p>
                  </div>
                  <Textarea 
                    placeholder="Ex: Você é um assistente de suporte técnico Nível 1. Seja sempre educado, use emojis ocasionalmente. Seu objetivo é tentar resolver problemas comuns de acesso e rede..." 
                    value={formData.objective}
                    onChange={(e) => updateForm("objective", e.target.value)}
                    className="min-h-[400px] resize-y text-base p-6 rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20 leading-relaxed shadow-inner"
                  />
                  <p className="text-xs text-slate-400 text-center">Dica: Quanto mais detalhado e específico você for, melhor a IA irá se comportar.</p>
                </div>
              )}

              {/* STEP 3: Knowledge */}
              {currentStep === 3 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-3">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Base de Conhecimento</h2>
                    <p className="text-slate-500 text-sm mt-1">Adicione documentos ou links para a IA estudar.</p>
                  </div>
                  
                  <div className="flex justify-center mb-6">
                    <Dialog open={isDocModalOpen} onOpenChange={(open) => {
                      setIsDocModalOpen(open);
                      if (open) {
                        setSelectedType("file");
                        setApiUrl("");
                        setApiToken("");
                        setApiUser("");
                        setApiPass("");
                        setApiAuthType("none");
                        setDocUrl("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button className="gap-2 h-10 px-5 rounded-xl shadow-md">
                          <Upload className="w-4 h-4" /> Adicionar Material
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-3xl p-8 max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="text-2xl">Adicionar Conhecimento</DialogTitle>
                          <DialogDescription className="text-base mt-2">
                            Escolha a origem do conteúdo e configure a nova fonte de conhecimento.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4">
                          {/* Grid de opções */}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: "file", title: "PDF ou Imagem", icon: FileText, color: "text-orange-500 bg-orange-50 border-orange-100" },
                              { id: "url", title: "Página Web", icon: Globe, color: "text-blue-500 bg-blue-50 border-blue-100" },
                              { id: "api", title: "Swagger / API", icon: Database, color: "text-purple-500 bg-purple-50 border-purple-100" },
                              { id: "portal", title: "Portal do Cliente", icon: BookMarked, color: "text-emerald-500 bg-emerald-50 border-emerald-100" }
                            ].map((item) => {
                              const Icon = item.icon;
                              const isSelected = selectedType === item.id;
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedType(item.id as any)}
                                  className={`p-3 border rounded-2xl cursor-pointer text-center transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                      : "border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${item.color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="text-xs font-bold text-slate-800">{item.title}</div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2">
                            {selectedType === "file" && (
                              <div className="space-y-3">
                                <Label className="text-slate-700 font-semibold text-xs">Arquivo (PDF, PNG, JPG)</Label>
                                <Input 
                                  type="file" 
                                  accept="application/pdf,image/*"
                                  className="h-12 pt-3 rounded-xl bg-slate-50 cursor-pointer text-xs"
                                  onChange={(e) => {
                                    if(e.target.files && e.target.files[0]) {
                                      updateForm("knowledgeBase", [...formData.knowledgeBase, { type: "file", content: e.target.files[0].name }]);
                                      setIsDocModalOpen(false);
                                    }
                                  }}
                                />
                                <p className="text-[10px] text-slate-400">Arraste ou clique para selecionar. Tamanho máximo: 5MB.</p>
                              </div>
                            )}

                            {selectedType === "url" && (
                              <div className="space-y-3">
                                <Label className="text-slate-700 font-semibold text-xs">URL da Página Web</Label>
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="https://exemplo.com/faq" 
                                    value={docUrl}
                                    onChange={(e) => setDocUrl(e.target.value)}
                                    className="h-11 bg-slate-50 rounded-xl text-xs"
                                  />
                                  <Button 
                                    type="button" 
                                    className="h-11 rounded-xl px-4 text-xs font-semibold"
                                    onClick={() => {
                                      if(docUrl.trim()) {
                                        updateForm("knowledgeBase", [...formData.knowledgeBase, { type: "url", content: docUrl }]);
                                        setDocUrl("");
                                        setIsDocModalOpen(false);
                                      }
                                    }}
                                  >
                                    Salvar
                                  </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">Essa URL será lida pelo agente para extrair conteúdo.</p>
                              </div>
                            )}

                            {selectedType === "api" && (
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-slate-700 font-semibold text-xs">URL do Swagger ou Endpoint (GET)</Label>
                                  <Input 
                                    placeholder="https://api.exemplo.com/swagger.json" 
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    className="h-10 bg-slate-50 rounded-xl text-xs"
                                  />
                                </div>
                                
                                <div className="space-y-1.5">
                                  <Label className="text-slate-700 font-semibold text-xs">Tipo de Autenticação</Label>
                                  <select 
                                    className="w-full h-10 bg-slate-50 border border-input rounded-xl text-xs px-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={apiAuthType}
                                    onChange={(e) => setApiAuthType(e.target.value as any)}
                                  >
                                    <option value="none">Nenhuma (Pública)</option>
                                    <option value="token">Token / Bearer / API Key</option>
                                    <option value="basic">Basic Auth (Login e Senha)</option>
                                  </select>
                                </div>

                                {apiAuthType === "token" && (
                                  <div className="space-y-1.5">
                                    <Label className="text-slate-700 font-semibold text-xs">Credencial (Token)</Label>
                                    <Input 
                                      placeholder="Bearer seu_token_aqui ou API Key..." 
                                      value={apiToken}
                                      onChange={(e) => setApiToken(e.target.value)}
                                      className="h-10 bg-slate-50 rounded-xl text-xs"
                                      type="password"
                                    />
                                  </div>
                                )}

                                {apiAuthType === "basic" && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                      <Label className="text-slate-700 font-semibold text-xs">Usuário (Login)</Label>
                                      <Input 
                                        placeholder="Ex: admin" 
                                        value={apiUser}
                                        onChange={(e) => setApiUser(e.target.value)}
                                        className="h-10 bg-slate-50 rounded-xl text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-slate-700 font-semibold text-xs">Senha</Label>
                                      <Input 
                                        placeholder="Sua senha..." 
                                        value={apiPass}
                                        onChange={(e) => setApiPass(e.target.value)}
                                        className="h-10 bg-slate-50 rounded-xl text-xs"
                                        type="password"
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                <Button 
                                  type="button" 
                                  className="w-full h-11 rounded-xl text-xs font-semibold mt-2"
                                  onClick={() => {
                                    if(apiUrl.trim()) {
                                      const kbConfig: any = { type: "api", content: apiUrl, authType: apiAuthType };
                                      if (apiAuthType === "token") kbConfig.token = apiToken;
                                      if (apiAuthType === "basic") {
                                        kbConfig.user = apiUser;
                                        kbConfig.pass = apiPass;
                                      }
                                      
                                      updateForm("knowledgeBase", [...formData.knowledgeBase, kbConfig]);
                                      setApiUrl("");
                                      setApiToken("");
                                      setApiUser("");
                                      setApiPass("");
                                      setApiAuthType("none");
                                      setIsDocModalOpen(false);
                                    }
                                  }}
                                >
                                  Salvar Integração
                                </Button>
                              </div>
                            )}

                            {selectedType === "portal" && (
                              <div className="space-y-3">
                                <Label className="text-slate-700 font-semibold text-xs">Módulo Portal do Cliente</Label>
                                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                  O assistente terá acesso automático a todos os artigos publicados no Portal do Cliente do sistema para responder dúvidas de usuários.
                                </p>
                                <Button 
                                  type="button" 
                                  className="w-full h-11 rounded-xl text-xs font-semibold shadow-sm"
                                  onClick={() => {
                                    updateForm("knowledgeBase", [...formData.knowledgeBase, { type: "portal", content: "Portal do Cliente (Artigos de FAQ)" }]);
                                    setIsDocModalOpen(false);
                                  }}
                                >
                                  Ativar Sincronização
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {formData.knowledgeBase.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                      <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        Nenhum material adicionado ainda. A IA funcionará apenas com conhecimento geral.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.knowledgeBase.map((doc, idx) => {
                        let icon = FileText;
                        let colorClass = "bg-orange-100 text-orange-600";
                        let label = "Arquivo";
                        
                        if (doc.type === "url") {
                          icon = Globe;
                          colorClass = "bg-blue-100 text-blue-600";
                          label = "Link Web";
                        } else if (doc.type === "api") {
                          icon = Database;
                          colorClass = "bg-purple-100 text-purple-600";
                          label = "API";
                        } else if (doc.type === "portal") {
                          icon = BookMarked;
                          colorClass = "bg-emerald-100 text-emerald-600";
                          label = "Portal";
                        }
                        
                        const IconComponent = icon;
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-2xl bg-white shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`} title={label}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-semibold text-slate-700 text-sm block">{doc.content}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="hover:bg-red-50 hover:text-red-600 rounded-lg h-8 w-8"
                              onClick={() => {
                                const newKb = [...formData.knowledgeBase];
                                newKb.splice(idx, 1);
                                updateForm("knowledgeBase", newKb);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Tools */}
              {currentStep === 4 && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-3">
                      <Code className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Integrações (Conexões)</h2>
                    <p className="text-slate-500 text-sm mt-1">Conecte o assistente às APIs globais da plataforma ou crie uma integração avulsa.</p>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div className="relative flex-1 w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <Input 
                          placeholder="Buscar conexões por nome..." 
                          value={connectionSearch}
                          onChange={(e) => setConnectionSearch(e.target.value)}
                          className="pl-9 h-10 bg-white"
                        />
                      </div>
                      
                      <Dialog open={isToolModalOpen} onOpenChange={(open) => {
                        setIsToolModalOpen(open);
                        if (open) {
                          setToolForm({
                            name: "", description: "", endpoint: "", method: "GET", authType: "none", token: "", user: "", pass: "", tokenUrl: "", parameters: []
                          });
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="h-10 border-dashed border-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 font-semibold gap-2">
                            <Plus className="w-4 h-4" /> Criar Conexão Avulsa
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-6">
                          <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl text-slate-800">Nova Integração Avulsa</DialogTitle>
                            <DialogDescription className="text-xs">Defina os parâmetros apenas para este assistente.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nome da Ação (Sem espaços)</Label>
                                <Input placeholder="Ex: consultar_estoque" value={toolForm.name} onChange={e => setToolForm({...toolForm, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')})} className="h-10 text-xs bg-slate-50" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Método HTTP</Label>
                                <select className="w-full h-10 bg-slate-50 border border-input rounded-xl text-xs px-3 focus:outline-none" value={toolForm.method} onChange={e => setToolForm({...toolForm, method: e.target.value})}>
                                  <option value="GET">GET</option>
                                  <option value="POST">POST (Envio de JSON no Body)</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Descrição (Instrução para a IA)</Label>
                              <Input placeholder="Ex: Use esta ferramenta para consultar estoque passando a marca..." value={toolForm.description} onChange={e => setToolForm({...toolForm, description: e.target.value})} className="h-10 text-xs bg-slate-50" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">URL Endpoint</Label>
                              <Input placeholder="https://api.exemplo.com/v1/..." value={toolForm.endpoint} onChange={e => setToolForm({...toolForm, endpoint: e.target.value})} className="h-10 text-xs bg-slate-50" />
                            </div>
                            
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Autenticação</Label>
                              <select className="w-full h-10 bg-slate-50 border border-input rounded-xl text-xs px-3 focus:outline-none" value={toolForm.authType} onChange={e => setToolForm({...toolForm, authType: e.target.value})}>
                                <option value="none">Nenhuma</option>
                                <option value="token">Token / Bearer / API Key</option>
                                <option value="basic">Basic Auth (Login e Senha)</option>
                                <option value="oauth2_password">OAuth2 (Password Flow)</option>
                              </select>
                            </div>
                            {toolForm.authType === "token" && (
                              <Input placeholder="Token..." type="password" value={toolForm.token} onChange={e => setToolForm({...toolForm, token: e.target.value})} className="h-10 text-xs bg-slate-50" />
                            )}
                            {toolForm.authType === "basic" && (
                              <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="Usuário" value={toolForm.user} onChange={e => setToolForm({...toolForm, user: e.target.value})} className="h-10 text-xs bg-slate-50" />
                                <Input placeholder="Senha" type="password" value={toolForm.pass} onChange={e => setToolForm({...toolForm, pass: e.target.value})} className="h-10 text-xs bg-slate-50" />
                              </div>
                            )}
                            {toolForm.authType === "oauth2_password" && (
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold">Token URL (Endpoint de Autenticação)</Label>
                                  <Input placeholder="https://exemplo.com/oauth/token" value={toolForm.tokenUrl} onChange={e => setToolForm({...toolForm, tokenUrl: e.target.value})} className="h-10 text-xs bg-slate-50" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Username</Label>
                                    <Input value={toolForm.user} onChange={e => setToolForm({...toolForm, user: e.target.value})} className="h-10 text-xs bg-slate-50" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Password</Label>
                                    <Input value={toolForm.pass} onChange={e => setToolForm({...toolForm, pass: e.target.value})} type="password" className="h-10 text-xs bg-slate-50" />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                              <div className="flex justify-between items-center mb-3">
                                <Label className="text-xs font-semibold">Parâmetros da API (Opcional)</Label>
                                <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] rounded-lg" onClick={() => setToolForm({...toolForm, parameters: [...toolForm.parameters, { name: "", type: "string", description: "", required: true, testValue: "" }]})}>
                                  <Plus className="w-3 h-3 mr-1" /> Adicionar Parâmetro
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {toolForm.parameters.map((p, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <Input placeholder="Nome" value={p.name} onChange={e => { const np = [...toolForm.parameters]; np[idx].name = e.target.value; setToolForm({...toolForm, parameters: np}); }} className="h-9 text-[11px] bg-white w-20" />
                                    <select className="h-9 bg-white border border-input rounded-md text-[11px] px-2 w-16" value={p.type} onChange={e => { const np = [...toolForm.parameters]; np[idx].type = e.target.value; setToolForm({...toolForm, parameters: np}); }}>
                                      <option value="string">Tex</option>
                                      <option value="number">Núm</option>
                                    </select>
                                    <Input placeholder="Descrição p/ IA" value={p.description} onChange={e => { const np = [...toolForm.parameters]; np[idx].description = e.target.value; setToolForm({...toolForm, parameters: np}); }} className="h-9 text-[11px] bg-white flex-1" />
                                    <Input placeholder="V. Fixo/Teste" value={p.testValue || ""} onChange={e => { const np = [...toolForm.parameters]; np[idx].testValue = e.target.value; setToolForm({...toolForm, parameters: np}); }} className="h-9 text-[11px] bg-white w-20 border-indigo-200" title="Se preenchido, será enviado como padrão caso a IA não envie (Útil para IDs fixos)." />
                                    <select className="h-9 bg-white border border-input rounded-md text-[11px] px-2 w-20" value={p.required !== false ? "true" : "false"} onChange={e => { const np = [...toolForm.parameters]; np[idx].required = e.target.value === "true"; setToolForm({...toolForm, parameters: np}); }}>
                                      <option value="true">Obrig.</option>
                                      <option value="false">Opc.</option>
                                    </select>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-500 rounded-md" onClick={() => { const np = [...toolForm.parameters]; np.splice(idx, 1); setToolForm({...toolForm, parameters: np}); }}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-2">Para GET, serão enviados via Query (?marca=VW). Para POST, via JSON no Body.</p>
                            </div>

                            <Button 
                              type="button" 
                              className="w-full h-11 rounded-xl text-xs font-semibold mt-4"
                              onClick={() => {
                                if (toolForm.name && toolForm.endpoint) {
                                  updateForm("tools", [...formData.tools, toolForm]);
                                  setIsToolModalOpen(false);
                                } else {
                                  toast({ title: "Preencha os campos", description: "Nome da ação e URL são obrigatórios.", variant: "destructive" });
                                }
                              }}
                            >Salvar Ferramenta</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Catalog Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {globalConnections
                        .filter(c => c.name.toLowerCase().includes(connectionSearch.toLowerCase()) || (c.description || "").toLowerCase().includes(connectionSearch.toLowerCase()))
                        .map(conn => {
                          const isSelected = formData.tools.some(t => t.connectionId === conn.id);
                          return (
                            <div key={conn.id} className={`p-5 rounded-2xl border transition-all relative group cursor-pointer ${isSelected ? "bg-primary/5 border-primary shadow-[0_0_0_1px_rgba(var(--primary),1)]" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"}`} onClick={() => {
                              if (isSelected) {
                                updateForm("tools", formData.tools.filter(t => t.connectionId !== conn.id));
                              } else {
                                updateForm("tools", [...formData.tools, { connectionId: conn.id }]);
                              }
                            }}>
                              <div className="flex justify-between items-start mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
                                  <Globe className="w-5 h-5" />
                                </div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isSelected ? "bg-primary border-primary text-white" : "border-slate-200 bg-white"}`}>
                                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                </div>
                              </div>
                              <h3 className="font-bold text-slate-900 text-sm mb-1">{conn.name}</h3>
                              <p className="text-xs text-slate-500 line-clamp-2">{conn.description || "Nenhuma descrição fornecida."}</p>
                              <div className="mt-4 flex gap-2">
                                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">{conn.method}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {formData.tools.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-sm font-bold text-slate-700 mb-4 px-2">Integrações Ativas neste Assistente</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {formData.tools.map((t, idx) => {
                          const isGlobal = !!t.connectionId;
                          const globalConn = isGlobal ? globalConnections.find(c => c.id === t.connectionId) : null;
                          const title = isGlobal ? (globalConn?.name || "Conexão Desconhecida") : t.name;
                          const method = isGlobal ? (globalConn?.method || "N/A") : t.method;
                          const endpoint = isGlobal ? (globalConn?.url || "N/A") : t.endpoint;

                          return (
                            <div key={idx} className="flex flex-col p-4 border border-slate-200 rounded-2xl bg-white shadow-sm relative group">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{title}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-600 rounded-lg h-7 w-7 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                                  e.stopPropagation();
                                  const newTools = [...formData.tools];
                                  newTools.splice(idx, 1);
                                  updateForm("tools", newTools);
                                }}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex gap-2 items-center">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isGlobal ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                                  {isGlobal ? "Global" : "Avulsa"}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase truncate font-mono bg-slate-50 px-1.5 py-0.5 rounded">{method} {endpoint}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Channels */}
              {currentStep === 5 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-3">
                      <Share2 className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Canais de Atendimento</h2>
                    <p className="text-slate-500 text-sm mt-1">Onde sua IA vai operar e atender clientes?</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                    <div 
                      onClick={() => {
                        const newChannels = formData.channels.includes("whatsapp") 
                          ? formData.channels.filter(c => c !== "whatsapp") 
                          : [...formData.channels, "whatsapp"];
                        updateForm("channels", newChannels);
                      }}
                      className={`p-4 border-2 rounded-3xl flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        formData.channels.includes("whatsapp") 
                          ? "border-green-500 bg-green-50 shadow-md ring-4 ring-green-500/10" 
                          : "bg-white border-slate-200 hover:border-green-300"
                      }`}
                    >
                      <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                        <FaWhatsapp className="w-6 h-6" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-800 text-center">WhatsApp</span>
                    </div>

                    <div 
                      onClick={() => {
                        const newChannels = formData.channels.includes("instagram") 
                          ? formData.channels.filter(c => c !== "instagram") 
                          : [...formData.channels, "instagram"];
                        updateForm("channels", newChannels);
                      }}
                      className={`p-4 border-2 rounded-3xl flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        formData.channels.includes("instagram") 
                          ? "border-pink-500 bg-pink-50 shadow-md ring-4 ring-pink-500/10" 
                          : "bg-white border-slate-200 hover:border-pink-300"
                      }`}
                    >
                      <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
                        <Instagram className="w-6 h-6" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-800 text-center">Instagram</span>
                    </div>

                    <div 
                      onClick={() => {
                        const newChannels = formData.channels.includes("facebook") 
                          ? formData.channels.filter(c => c !== "facebook") 
                          : [...formData.channels, "facebook"];
                        updateForm("channels", newChannels);
                      }}
                      className={`p-4 border-2 rounded-3xl flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        formData.channels.includes("facebook") 
                          ? "border-blue-600 bg-blue-50 shadow-md ring-4 ring-blue-600/10" 
                          : "bg-white border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                        <Facebook className="w-6 h-6" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-800 text-center">Facebook</span>
                    </div>

                    <div 
                      onClick={() => {
                        const newChannels = formData.channels.includes("webchat") 
                          ? formData.channels.filter(c => c !== "webchat") 
                          : [...formData.channels, "webchat"];
                        updateForm("channels", newChannels);
                      }}
                      className={`p-4 border-2 rounded-3xl flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        formData.channels.includes("webchat") 
                          ? "border-primary bg-primary/5 shadow-md ring-4 ring-primary/10" 
                          : "bg-white border-slate-200 hover:border-primary/30"
                      }`}
                    >
                      <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                        <Bot className="w-6 h-6" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-800 text-center">Web Chat</span>
                    </div>

                    <div 
                      onClick={() => {
                        const newChannels = formData.channels.includes("api_rest") 
                          ? formData.channels.filter(c => c !== "api_rest") 
                          : [...formData.channels, "api_rest"];
                        updateForm("channels", newChannels);
                      }}
                      className={`p-4 border-2 rounded-3xl flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        formData.channels.includes("api_rest") 
                          ? "border-slate-800 bg-slate-100 shadow-md ring-4 ring-slate-800/10" 
                          : "bg-white border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-800/30">
                        <Code className="w-6 h-6" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-800 text-center">API REST</span>
                    </div>
                  </div>

                  {formData.channels.includes("whatsapp") && (
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 mt-6">
                      <div className="flex justify-between items-center">
                        <Label className="text-slate-700 font-bold text-sm">Selecione a Conexão do WhatsApp</Label>
                        <Dialog open={isNewConnModalOpen} onOpenChange={setIsNewConnModalOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 gap-1 border-slate-300 hover:bg-slate-100">
                              <Plus className="w-3.5 h-3.5" /> Nova Conexão
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[450px] p-6 rounded-3xl">
                            <CreateWhatsappConnectionInline 
                              onCreated={(conn) => {
                                setSelectedWhatsappConnectionId(conn.id);
                                queryClient.invalidateQueries({ queryKey: ["/api/ai/whatsapp-connections"] });
                                setIsNewConnModalOpen(false);
                              }} 
                              onCancel={() => setIsNewConnModalOpen(false)}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {whatsappConnections.length === 0 ? (
                        <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-500 text-sm">
                          Nenhuma conexão de WhatsApp cadastrada. Clique em "+ Nova Conexão" para criar uma.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                          {whatsappConnections.map((conn: any) => {
                            const isSelected = selectedWhatsappConnectionId === conn.id;
                            const providerName = conn.provider === "meta" ? "Meta Cloud (Oficial)" : "Evolution API";
                            return (
                              <div
                                key={conn.id}
                                onClick={() => setSelectedWhatsappConnectionId(conn.id)}
                                className={`p-3 border rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? "border-green-500 bg-green-500/5 shadow-sm ring-2 ring-green-500/20"
                                    : "border-slate-200 hover:border-green-300 bg-white"
                                }`}
                              >
                                <div className="text-left">
                                  <div className="font-semibold text-slate-800 text-sm">{conn.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{providerName} (ID: {conn.id})</div>
                                </div>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.channels.includes("instagram") && (
                    <div className="p-5 bg-pink-50/50 border border-pink-100 rounded-3xl space-y-4 mt-6">
                      <Label className="text-slate-700 font-bold text-sm">Configuração do Instagram</Label>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">ID da Conta Comercial (Em breve)</Label>
                          <Input 
                            placeholder="Ex: 17841400000000000"
                            value={formData.instagramConfig.accountId}
                            onChange={(e) => updateForm("instagramConfig", { ...formData.instagramConfig, accountId: e.target.value })}
                            className="bg-white"
                          />
                          <p className="text-[10px] text-slate-500">
                            No futuro, faremos a listagem automática das contas conectadas na Meta Cloud.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.channels.includes("facebook") && (
                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-4 mt-6">
                      <Label className="text-slate-700 font-bold text-sm">Configuração do Facebook Messenger</Label>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">ID da Página (Em breve)</Label>
                          <Input 
                            placeholder="Ex: 100000000000000"
                            value={formData.facebookConfig.pageId}
                            onChange={(e) => updateForm("facebookConfig", { ...formData.facebookConfig, pageId: e.target.value })}
                            className="bg-white"
                          />
                          <p className="text-[10px] text-slate-500">
                            No futuro, faremos a listagem automática das páginas conectadas na Meta Cloud.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.channels.includes("api_rest") && (
                    <div className="p-5 bg-slate-100/50 border border-slate-200 rounded-3xl space-y-4 mt-6">
                      <Label className="text-slate-700 font-bold text-sm">Configuração da API REST</Label>
                      <p className="text-xs text-slate-500">
                        Use este canal para integrar o assistente ao seu próprio sistema ou aplicativo.
                      </p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Webhook URL (Opcional)</Label>
                          <Input 
                            placeholder="https://seu-sistema.com/webhook/receber-mensagens"
                            value={formData.apiRestConfig.webhookUrl}
                            onChange={(e) => updateForm("apiRestConfig", { ...formData.apiRestConfig, webhookUrl: e.target.value })}
                            className="bg-white font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Token de Autenticação</Label>
                          <Input 
                            placeholder="Bearer token para envio de mensagens"
                            value={formData.apiRestConfig.token}
                            onChange={(e) => updateForm("apiRestConfig", { ...formData.apiRestConfig, token: e.target.value })}
                            className="bg-white font-mono text-xs"
                            type="password"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: Actions */}
              {currentStep === 6 && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-2">
                      <Users className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Ações e Habilidades</h2>
                    <p className="text-slate-500 text-[13px]">O que a IA tem permissão para fazer no sistema?</p>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-4">
                    {/* Action 1 */}
                    <label className={`flex items-center p-3 border-2 rounded-2xl cursor-pointer transition-all ${
                      formData.actions.includes("create_ticket") ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-200 hover:border-primary/30 bg-white"
                    }`}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                          formData.actions.includes("create_ticket") ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                        }`}>
                          {formData.actions.includes("create_ticket") && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Abrir Ticket</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Criar novos tickets de atendimento.</p>
                        </div>
                      </div>
                      <input type="checkbox" className="hidden" checked={formData.actions.includes("create_ticket")} onChange={() => {
                        const newActions = formData.actions.includes("create_ticket") ? formData.actions.filter(a => a !== "create_ticket") : [...formData.actions, "create_ticket"];
                        updateForm("actions", newActions);
                      }}/>
                    </label>

                    {/* Action 2 */}
                    <label className={`flex items-center p-3 border-2 rounded-2xl cursor-pointer transition-all ${
                      formData.actions.includes("transfer_human") ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-200 hover:border-primary/30 bg-white"
                    }`}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                          formData.actions.includes("transfer_human") ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                        }`}>
                          {formData.actions.includes("transfer_human") && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Transferir para Humano</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Encaminhar clientes para a equipe.</p>
                        </div>
                      </div>
                      <input type="checkbox" className="hidden" checked={formData.actions.includes("transfer_human")} onChange={() => {
                        const newActions = formData.actions.includes("transfer_human") ? formData.actions.filter(a => a !== "transfer_human") : [...formData.actions, "transfer_human"];
                        updateForm("actions", newActions);
                      }}/>
                    </label>

                    {/* Action 3 - N8N */}
                    <div className={`flex flex-col border-2 rounded-2xl overflow-hidden transition-all ${
                      formData.actions.includes("n8n") ? "border-orange-500 bg-orange-50/30 ring-4 ring-orange-500/10" : "border-slate-200 hover:border-orange-300 bg-white"
                    }`}>
                      <label className="flex items-center p-3 cursor-pointer">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                            formData.actions.includes("n8n") ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {formData.actions.includes("n8n") && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                            <Workflow className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">Acionar Fluxo no N8N</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Executar automações externas.</p>
                          </div>
                        </div>
                        <input type="checkbox" className="hidden" checked={formData.actions.includes("n8n")} onChange={() => {
                          const newActions = formData.actions.includes("n8n") ? formData.actions.filter(a => a !== "n8n") : [...formData.actions, "n8n"];
                          updateForm("actions", newActions);
                        }}/>
                      </label>
                      
                      {formData.actions.includes("n8n") && (
                        <div className="p-4 bg-white border-t-2 border-orange-100 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-slate-700 font-semibold text-[11px]">Chave de API do N8N (n8n API Key)</Label>
                            <Input 
                              type="password"
                              placeholder="Suas credenciais/Chave de API do n8n..." 
                              value={formData.n8nConfig.authToken}
                              onChange={(e) => updateForm("n8nConfig", { ...formData.n8nConfig, authToken: e.target.value })}
                              className="h-10 text-xs bg-slate-50 font-mono rounded-xl"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              Esta chave permite que o nosso sistema crie o fluxo completo de atendimento para você automaticamente.
                            </p>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                              Canal de Saída (Ex: CRM Hazapi)
                            </Label>
                            <Select 
                              value={formData.n8nConfig.outputConnectionId || "none"}
                              onValueChange={v => updateForm("n8nConfig", { ...formData.n8nConfig, outputConnectionId: v === "none" ? "" : v })}
                            >
                              <SelectTrigger className="h-10 text-xs bg-white rounded-xl">
                                <SelectValue placeholder="Selecione uma conexão para envio da resposta..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum (Usar resposta padrão do Webhook)</SelectItem>
                                {globalConnections.map(c => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500 mt-1">
                              A IA usará esta conexão de saída para devolver a mensagem para o cliente.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Action 4 - Logs Toggle */}
                    <div className={`mt-4 p-4 rounded-2xl border-2 transition-all flex items-start justify-between gap-4 cursor-pointer ${
                      formData.enableLogs ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                    }`}
                      onClick={() => updateForm("enableLogs", !formData.enableLogs)}
                    >
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-[15px]">Criar logs de todas as ações geradas</h4>
                        <p className="text-[13px] text-slate-500 mt-1">
                          Se ativado, o sistema irá registrar um histórico detalhado (logs) de todas as automações, tickets e transferências realizadas por esta IA. Você poderá acompanhar esses registros no menu de Logs.
                        </p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 flex items-center ${formData.enableLogs ? "bg-primary" : "bg-slate-300"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute ${formData.enableLogs ? "translate-x-7" : "translate-x-1"}`} />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 7: Review */}
              {currentStep === 7 && (
                <div className="space-y-6 max-w-3xl mx-auto text-center py-10">
                  <div className="w-32 h-32 mx-auto bg-primary/10 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-primary/10 border-4 border-white mb-6 overflow-hidden">
                    {formData.avatar && (formData.avatar.startsWith("data:image/") || formData.avatar.startsWith("http")) ? (
                      <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl">{formData.avatar || "🤖"}</span>
                    )}
                  </div>
                  <h2 className="text-4xl font-black text-slate-900">{formData.name || "Sem nome"}</h2>
                  <p className="text-lg text-slate-500 mt-2">{formData.description || "Pronto para ser ativado e ajudar seus clientes."}</p>

                  <div className="flex items-center justify-center gap-3 text-emerald-600 bg-emerald-50 py-4 px-6 rounded-2xl mt-8 border border-emerald-100 font-semibold shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                    Tudo certo! Seu assistente está pronto para ser ativado.
                  </div>
                </div>
              )}

            </CardContent>

            {/* Horizontal Stepper (Bottom) */}
            <div className="px-6 sm:px-10 py-6 bg-slate-50 border-t border-slate-100 hidden md:block">
              <div className="flex items-center justify-between relative max-w-5xl mx-auto">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-0 -translate-y-1/2" />
                {WIZARD_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === index;
                  const isPast = currentStep > index;
                  
                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 bg-slate-50 px-2 cursor-pointer" onClick={() => currentStep > index && setCurrentStep(index)}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                        isActive ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-110" : 
                        isPast ? "bg-primary/20 text-primary border-primary/20" : "bg-white text-slate-400 border-slate-200"
                      }`}>
                        {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[11px] font-bold transition-colors ${isActive ? "text-primary" : isPast ? "text-slate-600" : "text-slate-400"}`}>
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <CardFooter className="p-5 sm:px-10 sm:py-6 flex justify-between bg-white border-t items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative z-20">
              <Button variant="outline" onClick={handleBack} className="gap-2 h-12 px-6 rounded-xl text-slate-600 font-bold hover:bg-slate-50 text-[15px]">
                {currentStep === 0 ? "Cancelar" : <><ArrowLeft className="w-4 h-4" /> Voltar</>}
              </Button>
              
              {/* Mobile Stepper Info */}
              <div className="md:hidden text-sm font-bold text-slate-500">
                Passo {currentStep + 1} de {WIZARD_STEPS.length}
              </div>

              <Button 
                onClick={handleNext} 
                className="gap-2 h-12 px-8 rounded-xl font-bold shadow-xl shadow-primary/30 text-[15px] hover:scale-[1.02] transition-transform"
                disabled={
                  (currentStep === 0 && !formData.name) || 
                  (currentStep === 1 && !formData.apiKey)
                }
              >
                {currentStep === WIZARD_STEPS.length - 1 ? (
                  createAssistantMutation.isPending ? "Criando..." : "Finalizar e Ativar"
                ) : (
                  <>Próximo Passo <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </CardFooter>
          </Card>
      </div>
    </div>
  );
}
