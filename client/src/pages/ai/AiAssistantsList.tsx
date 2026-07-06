import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Bot, Plus, Settings, MessageCircle, MoreVertical, Send, User, 
  Sparkles, Target, Share2, Users, CheckCircle2, Workflow, Ticket, 
  UserPlus, HelpCircle, FileText, Lock, X, Paperclip, Upload,
  Facebook, Instagram, Code, LayoutGrid, List, Search, Globe,
  Mic, Square
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AiAssistantsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [testingAssistant, setTestingAssistant] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<{
    role: 'user'|'assistant', 
    text: string, 
    file?: { name: string; mimeType: string; dataBase64: string }
  }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; mimeType: string; dataBase64: string; previewUrl?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  
  // Expanded editing states
  const [editingAssistant, setEditingAssistant] = useState<any>(null);
  const [activeEditTab, setActiveEditTab] = useState<"identity" | "instructions" | "channels_actions">("identity");
  const [editFormData, setEditFormData] = useState<any>({
    name: "",
    description: "",
    avatar: "🤖",
    objective: "",
    personality: "",
    provider: "gemini",
    model: "gemini-2.5-flash",
    apiKey: "",
    active: true,
    channels: [] as string[],
    selectedWhatsappConnectionId: null as number | null,
    actions: [] as string[],
    tools: [] as any[],
    n8nConfig: { webhookUrl: "", authToken: "", outputConnectionId: "" },
    facebookConfig: { pageId: "" },
    instagramConfig: { accountId: "" },
    apiRestConfig: { webhookUrl: "", token: "" },
    enableLogs: false,
  });

  const { data: whatsappConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/whatsapp-connections"],
  });

  const { data: globalConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/connections"],
  });

  const { data: assistants, isLoading } = useQuery<any[]>({
    queryKey: ["/api/ai/assistants"],
  });

  const filteredAssistants = (assistants || []).filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest("PATCH", `/api/ai/assistants/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/assistants"] });
      toast({ title: "Assistente atualizado com sucesso." });
      setEditingAssistant(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar assistente.", variant: "destructive" });
    }
  });

  const handleEdit = async (assistant: any) => {
    try {
      // Fetch full assistant to load relations (channels and actions)
      const res = await fetch(`/api/ai/assistants/${assistant.id}`);
      if (!res.ok) throw new Error("Erro ao carregar detalhes");
      const fullAssistant = await res.json();
      
      // Extract channels and connection ID
      const channelsList: string[] = [];
      let connectionId: number | null = null;
      let fbConfig = { pageId: "" };
      let igConfig = { accountId: "" };
      let apiConfig = { webhookUrl: "", token: "" };
      
      if (fullAssistant.channels) {
        fullAssistant.channels.forEach((c: any) => {
          channelsList.push(c.type);
          try {
            const cfg = c.config ? JSON.parse(c.config) : null;
            if (cfg) {
              if (c.type === "whatsapp" && cfg.connectionId) connectionId = Number(cfg.connectionId);
              if (c.type === "facebook") fbConfig = cfg;
              if (c.type === "instagram") igConfig = cfg;
              if (c.type === "api_rest") apiConfig = cfg;
            }
          } catch (e) {}
        });
      }

      // Extract actions, N8N config, and API tools
      const actionsList: string[] = [];
      const apiTools: any[] = [];
      let n8nWebUrl = "";
      let n8nAuthToken = "";
      let n8nOutputConnectionId = "";
      if (fullAssistant.actions) {
        fullAssistant.actions.forEach((a: any) => {
          actionsList.push(a.actionType);
          if (a.actionType === "n8n") {
            try {
              const cfg = a.config ? JSON.parse(a.config) : null;
              if (cfg) {
                if (cfg.webhookUrl) n8nWebUrl = cfg.webhookUrl;
                if (cfg.authToken) n8nAuthToken = cfg.authToken;
                if (cfg.outputConnectionId) n8nOutputConnectionId = String(cfg.outputConnectionId);
              }
            } catch (e) {}
          }
          if (a.actionType === "api_tool" && a.config) {
            try {
              apiTools.push(typeof a.config === "string" ? JSON.parse(a.config) : a.config);
            } catch (e) {
              apiTools.push(a.config);
            }
          }
        });
      }

      setEditFormData({
        name: fullAssistant.name,
        description: fullAssistant.description || "",
        avatar: fullAssistant.avatar || "🤖",
        objective: fullAssistant.objective || "",
        personality: fullAssistant.personality || "",
        provider: fullAssistant.provider || "gemini",
        model: fullAssistant.model || "gemini-2.5-flash",
        apiKey: fullAssistant.apiKey || "",
        active: fullAssistant.active ?? true,
        channels: channelsList,
        selectedWhatsappConnectionId: connectionId,
        facebookConfig: fbConfig,
        instagramConfig: igConfig,
        apiRestConfig: apiConfig,
        actions: actionsList,
        tools: apiTools,
        n8nConfig: { webhookUrl: n8nWebUrl, authToken: n8nAuthToken, outputConnectionId: n8nOutputConnectionId },
        enableLogs: fullAssistant.enableLogs ?? false,
      });
      
      setEditingAssistant(fullAssistant);
      setActiveEditTab("identity");
    } catch (e: any) {
      toast({ title: "Erro", description: `Falha ao carregar detalhes do assistente: ${e.message || e}`, variant: "destructive" });
    }
  };

  const handleSave = () => {
    const payload = {
      name: editFormData.name,
      description: editFormData.description,
      avatar: editFormData.avatar,
      objective: editFormData.objective,
      personality: editFormData.personality,
      provider: editFormData.provider,
      model: editFormData.model,
      apiKey: editFormData.apiKey,
      active: editFormData.active,
      enableLogs: editFormData.enableLogs,
      channels: editFormData.channels.map((c: string) => {
        if (c === "whatsapp") {
          return {
            type: "whatsapp",
            config: { connectionId: editFormData.selectedWhatsappConnectionId }
          };
        }
        if (c === "facebook") return { type: "facebook", config: editFormData.facebookConfig };
        if (c === "instagram") return { type: "instagram", config: editFormData.instagramConfig };
        if (c === "api_rest") return { type: "api_rest", config: editFormData.apiRestConfig };
        return { type: c };
      }),
      actions: [
        ...editFormData.actions.filter((a: string) => a !== "api_tool" && a !== "n8n").map((a: string) => ({ type: a })),
        ...(editFormData.actions.includes("n8n") ? [{ type: "n8n", config: editFormData.n8nConfig }] : []),
        ...editFormData.tools.map((t: any) => ({ type: "api_tool", config: t }))
      ]
    };

    updateMutation.mutate({ id: editingAssistant.id, data: payload });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/ai/assistants/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/assistants"] });
      toast({ title: "Assistente excluído com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro ao excluir assistente.", variant: "destructive" });
    }
  });

  const handleTest = (assistant: any) => {
    setTestingAssistant(assistant);
    setMessages([{ role: 'assistant', text: `Olá! Sou ${assistant.name}. Como posso ajudar?` }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      setAttachedFile({
        name: file.name,
        mimeType: file.type,
        dataBase64: base64String,
        previewUrl: file.type.startsWith("image/") ? (reader.result as string) : undefined
      });
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1];
          setAttachedFile({
            name: "audio_gravado.webm",
            mimeType: "audio/webm",
            dataBase64: base64
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone", err);
      toast({ title: "Erro", description: "Não foi possível acessar o microfone. Verifique as permissões do navegador.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatMessage.trim() && !attachedFile) || isChatLoading) return;
    
    const userMsg = chatMessage;
    const newMsg: any = { role: 'user' as const, text: userMsg };
    if (attachedFile) {
      newMsg.file = {
        name: attachedFile.name,
        mimeType: attachedFile.mimeType,
        dataBase64: attachedFile.dataBase64
      };
    }
    const newMessages = [...messages, newMsg];
    
    setMessages(newMessages);
    setChatMessage("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsChatLoading(true);
    
    try {
      const res = await fetch(`/api/ai/assistants/${testingAssistant.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: newMessages
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Erro ao gerar resposta");
      }
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: `Erro de conexão: ${err.message}` }]);
      toast({
        title: "Erro no Chat",
        description: err.message || "Não foi possível obter resposta do assistente.",
        variant: "destructive"
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleChannel = (channel: string) => {
    const isSelected = editFormData.channels.includes(channel);
    const updated = isSelected 
      ? editFormData.channels.filter((c: string) => c !== channel) 
      : [...editFormData.channels, channel];
    setEditFormData({ ...editFormData, channels: updated });
  };

  const toggleAction = (action: string) => {
    const isSelected = editFormData.actions.includes(action);
    const updated = isSelected 
      ? editFormData.actions.filter((a: string) => a !== action) 
      : [...editFormData.actions, action];
    setEditFormData({ ...editFormData, actions: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Assistentes</h1>
          <p className="text-muted-foreground mt-2">Gerencie e crie novos assistentes digitais para sua operação.</p>
        </div>
        <Link href="/ai/assistants/new">
          <Button className="gap-2 shadow-sm rounded-xl font-bold">
            <Plus className="w-4 h-4" />
            Novo Assistente
          </Button>
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
          <Input 
            placeholder="Buscar assistentes por nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-slate-50 border-none rounded-xl"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode('table')}
            className={`h-9 px-3 rounded-lg font-medium gap-2 transition-all ${
              viewMode === 'table' 
                ? 'bg-white text-slate-900 shadow-sm hover:bg-white border border-transparent' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
            }`}
          >
            <List className="w-4 h-4" /> Tabela
          </Button>
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode('card')}
            className={`h-9 px-3 rounded-lg font-medium gap-2 transition-all ${
              viewMode === 'card' 
                ? 'bg-white text-slate-900 shadow-sm hover:bg-white border border-slate-200/85' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Cards
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredAssistants.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Nenhum assistente encontrado</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Nenhum assistente corresponde aos termos da pesquisa ou nenhum assistente foi criado ainda.
          </p>
          {assistants?.length === 0 && (
            <Link href="/ai/assistants/new">
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Criar Meu Primeiro Assistente
              </Button>
            </Link>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Assistente</TableHead>
                <TableHead className="font-semibold text-slate-700">Provedor</TableHead>
                <TableHead className="font-semibold text-slate-700">Modelo</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssistants.map((assistant: any) => (
                <TableRow key={assistant.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-semibold text-slate-900 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                        {assistant.avatar && (assistant.avatar.startsWith("data:image/") || assistant.avatar.startsWith("http")) ? (
                          <img src={assistant.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{assistant.avatar || "🤖"}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm leading-snug">{assistant.name}</div>
                        <div className="text-xs text-slate-500 font-normal mt-0.5 line-clamp-1 max-w-[280px]" title={assistant.description}>
                          {assistant.description || "Nenhuma descrição fornecida."}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/50 uppercase">
                      {assistant.provider}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <code className="text-xs text-slate-600 font-mono">
                      {assistant.model}
                    </code>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                      assistant.active 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-rose-100 text-rose-700"
                    )}>
                      {assistant.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
                      {assistant.active ? "Ativo" : "Inativo"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="flex justify-end items-center gap-2">
                      <Button size="sm" className="h-8 gap-1.5 shadow-sm rounded-lg text-xs" onClick={() => handleTest(assistant)}>
                        <MessageCircle className="w-3.5 h-3.5" />
                        Testar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleEdit(assistant)}>
                            Configurar Completo
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => toast({ title: "Em breve", description: "Gerenciamento da Base de Conhecimento estará disponível em breve!" })}>
                            Base de Conhecimento
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive text-xs cursor-pointer" onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este assistente?")) {
                              deleteMutation.mutate(assistant.id);
                            }
                          }}>
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssistants.map((assistant: any) => (
            <Card key={assistant.id} className="flex flex-col border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-100">
              <CardHeader className="flex flex-row items-start justify-between pb-4 pt-6 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                    {assistant.avatar && (assistant.avatar.startsWith("data:image/") || assistant.avatar.startsWith("http")) ? (
                      <img src={assistant.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{assistant.avatar || "🤖"}</span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">{assistant.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                        assistant.active 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-rose-100 text-rose-700"
                      )}>
                        {assistant.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
                        {assistant.active ? "Ativo" : "Inativo"}
                      </div>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(assistant)}>
                      Configurar Completo
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Em breve", description: "Gerenciamento da Base de Conhecimento estará disponível em breve!" })}>
                      Base de Conhecimento
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => {
                      if (confirm("Tem certeza que deseja excluir este assistente?")) {
                        deleteMutation.mutate(assistant.id);
                      }
                    }}>
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1 px-6">
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                  {assistant.description || "Nenhuma descrição fornecida para este assistente."}
                </p>
              </CardContent>
              <CardFooter className="bg-slate-50/80 py-4 px-6 flex justify-end mt-auto border-t border-slate-100">
                <Button size="sm" className="gap-2 shadow-sm rounded-xl" onClick={() => handleTest(assistant)}>
                  <MessageCircle className="w-4 h-4" />
                  Testar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Test Dialog Modal */}
      <Dialog open={!!testingAssistant} onOpenChange={(open) => !open && setTestingAssistant(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] p-0 gap-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white flex flex-col max-h-[85vh] h-[650px]">
          <DialogHeader className="p-5 border-b bg-slate-50/70 shrink-0 flex flex-row items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                {testingAssistant?.avatar && (testingAssistant.avatar.startsWith("data:image/") || testingAssistant.avatar.startsWith("http")) ? (
                  <img src={testingAssistant.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{testingAssistant?.avatar || "🤖"}</span>
                )}
              </div>
              <div className="text-left">
                <div className="text-base font-extrabold text-slate-800 leading-none">{testingAssistant?.name}</div>
                <div className="text-[11px] font-medium text-slate-400 mt-1.5 leading-none">{testingAssistant?.description || "Assistente Digital"}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-slate-50/50 scrollbar-thin">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "flex gap-3 max-w-[75%] items-start animate-in fade-in slide-in-from-bottom-2 duration-300",
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                    isUser ? "bg-primary text-white border-primary/10" : "bg-white text-primary border-slate-100"
                  )}>
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={cn(
                    "p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm flex flex-col gap-2",
                    isUser 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                  )}>
                    {msg.file && (
                      <div className="mb-1 max-w-[240px]">
                        {msg.file.mimeType?.startsWith("image/") ? (
                          <img 
                            src={`data:${msg.file.mimeType};base64,${msg.file.dataBase64}`} 
                            alt={msg.file.name} 
                            className="max-h-[160px] w-auto object-contain rounded-lg border border-slate-100/10 shadow-sm"
                          />
                        ) : msg.file.mimeType?.startsWith("audio/") ? (
                          <audio 
                            controls 
                            src={`data:${msg.file.mimeType};base64,${msg.file.dataBase64}`} 
                            className="max-w-[220px] h-10"
                          />
                        ) : (
                          <div className={cn(
                            "flex items-center gap-2 p-2.5 rounded-xl border text-[11px]",
                            isUser 
                              ? "bg-white/10 border-white/20 text-white" 
                              : "bg-slate-50 border-slate-100 text-slate-700"
                          )}>
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate font-medium text-left">{msg.file.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.text && (
                      <div className={cn(
                        "text-left text-sm whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1",
                        isUser && "text-white prose-p:text-white prose-strong:text-white prose-headings:text-white prose-a:text-white"
                      )}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            img: ({ node, ...props }) => (
                              <div className="my-3 max-w-sm">
                                <img {...props} className="w-full rounded-lg object-cover shadow-sm border border-slate-200" />
                              </div>
                            ),
                            a: ({ node, ...props }) => {
                              const href = props.href || "";
                              const isImage = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(href);
                              if (isImage) {
                                return (
                                  <div className="my-3 max-w-sm">
                                    <img src={href} alt="Imagem anexa" className="w-full rounded-lg object-cover shadow-sm border border-slate-200" />
                                  </div>
                                );
                              }
                              return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all" />;
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {isChatLoading && (
              <div className="flex gap-3 max-w-[75%] items-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white text-primary border border-slate-100 shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-none bg-white border border-slate-100 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary/45 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/45 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/45 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
          
          {attachedFile && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-3 animate-in fade-in duration-200 shrink-0">
              {attachedFile.previewUrl ? (
                <img src={attachedFile.previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
              ) : attachedFile.mimeType.startsWith("audio/") ? (
                <audio controls src={`data:${attachedFile.mimeType};base64,${attachedFile.dataBase64}`} className="max-w-[200px] h-10 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700 truncate text-left">{attachedFile.name}</div>
                <div className="text-[10px] text-slate-400 text-left">Pronto para enviar</div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                onClick={() => {
                  setAttachedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,application/pdf,audio/*" 
              className="hidden" 
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-100 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isChatLoading || isRecording}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              className={`h-11 w-11 rounded-xl shrink-0 border ${isRecording ? 'animate-pulse border-red-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-slate-100'}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isChatLoading}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            {isRecording ? (
              <div className="flex-1 h-11 px-4 flex items-center justify-center bg-red-50 text-red-500 rounded-xl text-sm font-bold animate-pulse border border-red-100">
                Gravando... {formatTime(recordingTime)}
              </div>
            ) : (
              <Input 
                placeholder={`Falar com ${testingAssistant?.name || "assistente"}...`} 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 h-11 px-4 rounded-xl text-xs bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                disabled={isChatLoading}
              />
            )}
            <Button  
              type="submit" 
              size="icon" 
              className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20 shrink-0 font-bold"
              disabled={isChatLoading || (!chatMessage.trim() && !attachedFile)}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog Modal (Advanced Settings) */}
      <Dialog open={!!editingAssistant} onOpenChange={(open) => !open && setEditingAssistant(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[550px] p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-border/50 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configurações do Assistente
            </DialogTitle>
          </DialogHeader>
          
          {/* Tab Selection */}
          <div className="flex border-b border-border/40 bg-slate-50/50 px-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveEditTab("identity")}
              className={cn(
                "flex-1 py-3 text-xs font-semibold border-b-2 transition-all",
                activeEditTab === "identity"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Identidade & Modelo
            </button>
            <button
              type="button"
              onClick={() => setActiveEditTab("instructions")}
              className={cn(
                "flex-1 py-3 text-xs font-semibold border-b-2 transition-all",
                activeEditTab === "instructions"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Instruções
            </button>
            <button
              type="button"
              onClick={() => setActiveEditTab("channels_actions")}
              className={cn(
                "flex-1 py-3 text-xs font-semibold border-b-2 transition-all",
                activeEditTab === "channels_actions"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Canais & Ações
            </button>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {activeEditTab === "identity" && (
              <div className="space-y-4">
                <div className="space-y-3 p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <Label className="text-xs font-semibold text-slate-700">Avatar do Assistente</Label>
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                      {editFormData.avatar && (editFormData.avatar.startsWith("data:image/") || editFormData.avatar.startsWith("http")) ? (
                        <img src={editFormData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{editFormData.avatar || "🤖"}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          accept="image/*"
                          id="avatar-upload-edit"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditFormData({ ...editFormData, avatar: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl px-3 gap-1.5 text-xs text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
                          onClick={() => document.getElementById("avatar-upload-edit")?.click()}
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-400" />
                          Carregar Imagem
                        </Button>
                        
                        {(editFormData.avatar && (editFormData.avatar.startsWith("data:image/") || editFormData.avatar.startsWith("http"))) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl px-2.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setEditFormData({ ...editFormData, avatar: "🤖" })}
                          >
                            Remover
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-medium">ou Emoji:</span>
                            <Input 
                              placeholder="🤖" 
                              value={editFormData.avatar && !editFormData.avatar.startsWith("data:image/") && !editFormData.avatar.startsWith("http") ? editFormData.avatar : ""}
                              onChange={(e) => setEditFormData({ ...editFormData, avatar: e.target.value || "🤖" })}
                              className="w-12 text-center text-base h-9 rounded-xl bg-white border-slate-200"
                              maxLength={4}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Nome do Assistente</Label>
                  <Input 
                    value={editFormData.name} 
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Ex: Sophia"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
                  <Textarea 
                    value={editFormData.description} 
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Ex: Auxiliar de atendimento"
                    rows={3}
                    className="text-xs rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20 resize-none min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Provedor de IA</Label>
                    <Select 
                      value={editFormData.provider} 
                      onValueChange={(val) => setEditFormData({ 
                        ...editFormData, 
                        provider: val,
                        model: val === "gemini" ? "gemini-2.5-flash" : val === "openai" ? "gpt-4o-mini" : "claude-3-5-sonnet-20240620"
                      })}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini" className="text-xs">Google Gemini</SelectItem>
                        <SelectItem value="openai" className="text-xs">OpenAI GPT</SelectItem>
                        <SelectItem value="anthropic" className="text-xs">Anthropic Claude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Modelo de IA</Label>
                    <Select 
                      value={editFormData.model} 
                      onValueChange={(val) => setEditFormData({ ...editFormData, model: val })}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {editFormData.provider === "gemini" && (
                          <>
                            <SelectItem value="gemini-2.5-flash" className="text-xs">Gemini 2.5 Flash</SelectItem>
                            <SelectItem value="gemini-1.5-pro" className="text-xs">Gemini 1.5 Pro</SelectItem>
                            <SelectItem value="gemini-1.5-flash" className="text-xs">Gemini 1.5 Flash</SelectItem>
                          </>
                        )}
                        {editFormData.provider === "openai" && (
                          <>
                            <SelectItem value="gpt-5" className="text-xs">GPT-5</SelectItem>
                            <SelectItem value="gpt-5-mini" className="text-xs">GPT-5 Mini</SelectItem>
                            <SelectItem value="gpt-5-turbo" className="text-xs">GPT-5 Turbo</SelectItem>
                            <SelectItem value="gpt-4o" className="text-xs">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini" className="text-xs">GPT-4o Mini</SelectItem>
                            <SelectItem value="gpt-3.5-turbo" className="text-xs">GPT-3.5 Turbo</SelectItem>
                          </>
                        )}
                        {editFormData.provider === "anthropic" && (
                          <>
                            <SelectItem value="claude-3-5-sonnet-20240620" className="text-xs">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-opus-20240229" className="text-xs">Claude 3 Opus</SelectItem>
                            <SelectItem value="claude-3-haiku-20240307" className="text-xs">Claude 3 Haiku</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">API Key do Provedor</Label>
                  <Input 
                    type="password"
                    value={editFormData.apiKey} 
                    onChange={(e) => setEditFormData({ ...editFormData, apiKey: e.target.value })}
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-border/40 rounded-xl bg-slate-50 mt-4">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800 cursor-pointer" htmlFor="edit-active-status">Status do Assistente</Label>
                    <div className="text-[10px] text-muted-foreground">Ativa ou desativa a IA temporariamente</div>
                  </div>
                  <Switch 
                    id="edit-active-status"
                    checked={editFormData.active} 
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, active: checked })}
                  />
                </div>
              </div>
            )}

            {activeEditTab === "instructions" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Objetivo (O que ele deve fazer)</Label>
                  <Textarea 
                    value={editFormData.objective} 
                    onChange={(e) => setEditFormData({ ...editFormData, objective: e.target.value })}
                    placeholder="Instrua o que a IA deve realizar, quais tarefas ela deve focar..."
                    className="min-h-[120px] text-xs resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Personalidade (Comportamento e tom de voz)</Label>
                  <Textarea 
                    value={editFormData.personality} 
                    onChange={(e) => setEditFormData({ ...editFormData, personality: e.target.value })}
                    placeholder="Instrua como a IA deve falar (simpática, técnica, formal)..."
                    className="min-h-[120px] text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {activeEditTab === "channels_actions" && (
              <div className="space-y-5">
                {/* Canais Section */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Canais Ativos</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div 
                      onClick={() => toggleChannel("webchat")}
                      className={cn(
                        "p-3 border rounded-2xl flex items-center gap-2.5 cursor-pointer transition-all",
                        editFormData.channels.includes("webchat") 
                          ? "border-primary bg-primary/5 font-bold shadow-sm" 
                          : "bg-white border-slate-200 hover:border-primary/20"
                      )}
                    >
                      <Bot className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-xs text-slate-800 truncate">Web Chat</span>
                    </div>
                    <div 
                      onClick={() => toggleChannel("whatsapp")}
                      className={cn(
                        "p-3 border rounded-2xl flex items-center gap-2.5 cursor-pointer transition-all",
                        editFormData.channels.includes("whatsapp") 
                          ? "border-green-500 bg-green-500/5 font-bold shadow-sm" 
                          : "bg-white border-slate-200 hover:border-green-200"
                      )}
                    >
                      <FaWhatsapp className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-xs text-slate-800 truncate">WhatsApp</span>
                    </div>
                    <div 
                      onClick={() => toggleChannel("instagram")}
                      className={cn(
                        "p-3 border rounded-2xl flex items-center gap-2.5 cursor-pointer transition-all",
                        editFormData.channels.includes("instagram") 
                          ? "border-pink-500 bg-pink-500/5 font-bold shadow-sm" 
                          : "bg-white border-slate-200 hover:border-pink-200"
                      )}
                    >
                      <Instagram className="w-5 h-5 text-pink-500 shrink-0" />
                      <span className="text-xs text-slate-800 truncate">Instagram</span>
                    </div>
                    <div 
                      onClick={() => toggleChannel("facebook")}
                      className={cn(
                        "p-3 border rounded-2xl flex items-center gap-2.5 cursor-pointer transition-all",
                        editFormData.channels.includes("facebook") 
                          ? "border-blue-600 bg-blue-600/5 font-bold shadow-sm" 
                          : "bg-white border-slate-200 hover:border-blue-200"
                      )}
                    >
                      <Facebook className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="text-xs text-slate-800 truncate">Facebook</span>
                    </div>
                    <div 
                      onClick={() => toggleChannel("api_rest")}
                      className={cn(
                        "p-3 border rounded-2xl flex items-center gap-2.5 cursor-pointer transition-all",
                        editFormData.channels.includes("api_rest") 
                          ? "border-slate-800 bg-slate-800/5 font-bold shadow-sm" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Code className="w-5 h-5 text-slate-800 shrink-0" />
                      <span className="text-xs text-slate-800 truncate">API REST</span>
                    </div>
                  </div>

                  {editFormData.channels.includes("whatsapp") && (
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2 mt-2">
                      <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Conexão do WhatsApp</Label>
                      {whatsappConnections.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground italic">Nenhuma conexão cadastrada no painel de canais.</div>
                      ) : (
                        <Select
                          value={editFormData.selectedWhatsappConnectionId ? String(editFormData.selectedWhatsappConnectionId) : undefined}
                          onValueChange={(val) => setEditFormData({ ...editFormData, selectedWhatsappConnectionId: Number(val) })}
                        >
                          <SelectTrigger className="h-9 text-xs bg-white">
                            <SelectValue placeholder="Selecione uma conexão..." />
                          </SelectTrigger>
                          <SelectContent>
                            {whatsappConnections.map((conn: any) => (
                              <SelectItem key={conn.id} value={String(conn.id)} className="text-xs">
                                {conn.name} ({conn.provider === 'meta' ? 'Meta' : 'Evolution'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {editFormData.channels.includes("instagram") && (
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2 mt-2">
                      <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Conta do Instagram</Label>
                      <Input 
                        placeholder="ID da Conta Comercial (Em breve)" 
                        value={editFormData.instagramConfig.accountId}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          instagramConfig: { ...editFormData.instagramConfig, accountId: e.target.value }
                        })}
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                  )}

                  {editFormData.channels.includes("facebook") && (
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2 mt-2">
                      <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Página do Facebook</Label>
                      <Input 
                        placeholder="ID da Página (Em breve)" 
                        value={editFormData.facebookConfig.pageId}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          facebookConfig: { ...editFormData.facebookConfig, pageId: e.target.value }
                        })}
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                  )}

                  {editFormData.channels.includes("api_rest") && (
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 mt-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Webhook URL (Opcional)</Label>
                        <Input 
                          placeholder="https://seu-sistema.com/webhook/receber-mensagens" 
                          value={editFormData.apiRestConfig.webhookUrl}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            apiRestConfig: { ...editFormData.apiRestConfig, webhookUrl: e.target.value }
                          })}
                          className="h-9 text-xs bg-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Token de Autenticação</Label>
                        <Input 
                          type="password"
                          placeholder="Bearer token para envio de mensagens" 
                          value={editFormData.apiRestConfig.token}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            apiRestConfig: { ...editFormData.apiRestConfig, token: e.target.value }
                          })}
                          className="h-9 text-xs bg-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="bg-border/40" />

                {/* Conexões Globais Section */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ferramentas de API Conectadas (Integrações)</Label>
                  {globalConnections.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic text-left">Nenhuma conexão de API cadastrada globalmente.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {globalConnections.map((conn: any) => {
                        const isSelected = editFormData.tools.some((t: any) => t.connectionId === conn.id);
                        return (
                          <div 
                            key={conn.id}
                            onClick={() => {
                              const newTools = isSelected 
                                ? editFormData.tools.filter((t: any) => t.connectionId !== conn.id) 
                                : [...editFormData.tools, { connectionId: conn.id }];
                              setEditFormData({ ...editFormData, tools: newTools });
                            }}
                            className={cn(
                              "p-3 border rounded-xl flex items-center gap-3 cursor-pointer transition-all",
                              isSelected 
                                ? "border-primary bg-primary/5 font-semibold" 
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                              isSelected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <Globe className="w-4 h-4 text-primary shrink-0" />
                            <div className="text-xs text-slate-700 truncate flex-1 text-left" title={conn.name}>{conn.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator className="bg-border/40" />

                {/* Habilidades Section */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ações e Habilidades</Label>
                  <div className="space-y-2.5">
                    {/* Action 1 */}
                    <div 
                      onClick={() => toggleAction("create_ticket")}
                      className={cn(
                        "p-3 border rounded-xl flex items-center gap-3 cursor-pointer transition-all",
                        editFormData.actions.includes("create_ticket") ? "border-primary bg-primary/5 font-semibold" : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        editFormData.actions.includes("create_ticket") ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                      )}>
                        {editFormData.actions.includes("create_ticket") && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <Ticket className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="text-xs text-slate-700">Abrir Ticket no HelpDesk</div>
                    </div>

                    {/* Action 2 */}
                    <div 
                      onClick={() => toggleAction("transfer_human")}
                      className={cn(
                        "p-3 border rounded-xl flex items-center gap-3 cursor-pointer transition-all",
                        editFormData.actions.includes("transfer_human") ? "border-primary bg-primary/5 font-semibold" : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        editFormData.actions.includes("transfer_human") ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                      )}>
                        {editFormData.actions.includes("transfer_human") && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <UserPlus className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="text-xs text-slate-700">Transferir para Humano (Técnico)</div>
                    </div>

                    {/* Action 3 - N8N */}
                    <div className={cn(
                      "border rounded-xl overflow-hidden transition-all flex flex-col",
                      editFormData.actions.includes("n8n") ? "border-orange-500 bg-orange-50/20" : "border-slate-200 hover:border-slate-300 bg-white"
                    )}>
                      <div 
                        onClick={() => toggleAction("n8n")}
                        className="p-3 flex items-center gap-3 cursor-pointer"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                          editFormData.actions.includes("n8n") ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white"
                        )}>
                          {editFormData.actions.includes("n8n") && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <Workflow className="w-4 h-4 text-orange-500 shrink-0" />
                        <div className="text-xs text-slate-700">Acionar Automação no N8N</div>
                      </div>
                      {editFormData.actions.includes("n8n") && (
                        <div className="p-3 bg-white border-t border-orange-100/60 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">URL Base do n8n (Ex: https://n8n.seudominio.com)</Label>
                            <Input 
                              placeholder="https://n8n.seudominio.com"
                              value={editFormData.n8nConfig.webhookUrl || ""}
                              onChange={(e) => setEditFormData({
                                ...editFormData,
                                n8nConfig: { ...editFormData.n8nConfig, webhookUrl: e.target.value }
                              })}
                              className="h-9 text-xs bg-slate-50 font-mono rounded-lg"
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">Necessário para o sistema saber onde criar o fluxo.</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Chave de API do N8N (n8n API Key)</Label>
                            <Input 
                              type="password"
                              placeholder="Chave de API do n8n..." 
                              value={editFormData.n8nConfig.authToken || ""}
                              onChange={(e) => setEditFormData({
                                ...editFormData,
                                n8nConfig: { ...editFormData.n8nConfig, authToken: e.target.value }
                              })}
                              className="h-9 text-xs bg-slate-50 font-mono rounded-lg"
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">Necessário para criar o fluxo automaticamente.</p>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Canal de Saída (Ex: CRM Hazapi)</Label>
                            <Select 
                              value={editFormData.n8nConfig.outputConnectionId || "none"}
                              onValueChange={v => setEditFormData({
                                ...editFormData,
                                n8nConfig: { ...editFormData.n8nConfig, outputConnectionId: v === "none" ? "" : v }
                              })}
                            >
                              <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="Selecione uma conexão para enviar as respostas..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum (Usar resposta padrão do Webhook)</SelectItem>
                                {globalConnections.map(c => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 mt-0.5">A IA usará esta conexão para devolver a resposta ao seu cliente.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/40" />

                {/* Logs Settings Toggle */}
                <div className="flex items-center justify-between p-3 border border-border/40 rounded-xl bg-slate-50">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800 cursor-pointer" htmlFor="edit-logs-toggle">Habilitar Logs</Label>
                    <div className="text-[10px] text-muted-foreground">Grava histórico de ações executadas</div>
                  </div>
                  <Switch 
                    id="edit-logs-toggle"
                    checked={editFormData.enableLogs} 
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, enableLogs: checked })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-slate-50 border-t border-border/50 shrink-0 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingAssistant(null)} className="text-xs font-semibold">
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={updateMutation.isPending || !editFormData.name}
              className="bg-primary hover:bg-primary/95 text-white font-bold text-xs shadow-md"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
