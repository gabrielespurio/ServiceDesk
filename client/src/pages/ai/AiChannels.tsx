import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bot, MessageCircle, QrCode, Smartphone, Globe, Plus, Link2, CheckCircle2, Code2, ShieldCheck, ArrowLeft, Key, Copy, Webhook, Settings, Trash2 } from "lucide-react";
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from "react-icons/fa";
import { queryClient } from "@/lib/queryClient";

const CHANNELS = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Conecte seu número oficial e atenda seus clientes com IA pelo WhatsApp.",
    icon: FaWhatsapp,
    color: "bg-green-500",
    status: "available", // connected, available, coming_soon
  },
  {
    id: "webchat",
    name: "Web Chat",
    description: "Um widget de chat inteligente para você instalar no seu site ou portal.",
    icon: Globe,
    color: "bg-blue-500",
    status: "connected",
  },
  {
    id: "instagram",
    name: "Instagram Direct",
    description: "Responda automaticamente os directs e menções dos seus seguidores.",
    icon: FaInstagram,
    color: "bg-pink-600",
    status: "coming_soon",
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Integre a IA na sua página do Facebook para atendimento automatizado.",
    icon: FaFacebookMessenger,
    color: "bg-blue-600",
    status: "coming_soon",
  },
  {
    id: "api",
    name: "API REST",
    description: "Integre a inteligência artificial aos seus sistemas e aplicativos próprios via API.",
    icon: Code2,
    color: "bg-indigo-600",
    status: "available",
  }
];

export default function AiChannels() {
  const { toast } = useToast();
  
  // List Manager Modal
  const [selectedChannelList, setSelectedChannelList] = useState<any>(null);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [newConnName, setNewConnName] = useState("");
  const [newConnProvider, setNewConnProvider] = useState<'evolution' | 'meta'>('evolution');
  
  // Individual Connection Modal
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [whatsappStep, setWhatsappStep] = useState<"select" | "evolution" | "meta">("select");
  const [metaForm, setMetaForm] = useState({ phoneId: "", accountId: "", token: "" });

  const { data: assistants = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/assistants"],
  });

  const { data: dbChannels = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/channels"],
  });

  const { data: whatsappConnections = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/whatsapp-connections"],
  });

  const getAssistantsForChannel = (channelId: string) => {
    return dbChannels.filter((c: any) => c.type === channelId).map((c: any) => {
      const assistant = assistants.find((a: any) => a.id === c.assistantId);
      return {
        ...c,
        assistant,
        configObj: c.config ? JSON.parse(c.config) : null
      };
    }).filter((c: any) => c.assistant);
  };

  const getLinkedAssistants = (connectionId: number) => {
    return dbChannels.filter((c: any) => {
      if (c.type !== 'whatsapp' || !c.config) return false;
      try {
        const configObj = JSON.parse(c.config);
        return configObj && configObj.connectionId === connectionId;
      } catch (e) {
        return false;
      }
    }).map((c: any) => {
      const assistant = assistants.find((a: any) => a.id === c.assistantId);
      return { channelId: c.id, assistant };
    }).filter((item: any) => item.assistant);
  };

  const createConnectionMutation = useMutation({
    mutationFn: async (data: { name: string, provider: 'evolution' | 'meta' }) => {
      const res = await fetch("/api/ai/whatsapp-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar conexão");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/whatsapp-connections"] });
      toast({ title: "Sucesso!", description: "Conexão criada com sucesso." });
      setNewConnName("");
      setIsCreatingConnection(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar conexão.", variant: "destructive" });
    }
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async (data: { id: number, config: any }) => {
      const res = await fetch(`/api/ai/whatsapp-connections/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: data.config }),
      });
      if (!res.ok) throw new Error("Erro ao salvar conexão");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/whatsapp-connections"] });
      toast({ title: "Sucesso!", description: "Conexão configurada com sucesso." });
      setIsConnecting(false);
      setSelectedChannel(null); // Close configure modal
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao configurar a conexão.", variant: "destructive" });
      setIsConnecting(false);
    }
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/ai/whatsapp-connections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir conexão");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/whatsapp-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/channels"] });
      toast({ title: "Sucesso!", description: "Conexão excluída com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao excluir conexão.", variant: "destructive" });
    }
  });

  const unlinkAssistantMutation = useMutation({
    mutationFn: async (channelId: number) => {
      const res = await fetch(`/api/ai/channels/${channelId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao desvincular assistente");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/channels"] });
      toast({ title: "Sucesso!", description: "Assistente desvinculado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao desvincular assistente.", variant: "destructive" });
    }
  });

  const linkAssistantMutation = useMutation({
    mutationFn: async (data: { assistantId: number, connectionId: number }) => {
      const res = await fetch(`/api/ai/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assistantId: data.assistantId, 
          type: "whatsapp",
          config: { connectionId: data.connectionId }
        }),
      });
      if (!res.ok) throw new Error("Erro ao vincular assistente");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/channels"] });
      toast({ title: "Sucesso!", description: "Assistente vinculado com sucesso." });
      setIsAddingConnection(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao vincular assistente.", variant: "destructive" });
    }
  });

  const handleOpenList = (channel: any) => {
    if (channel.status === "coming_soon") {
      toast({
        title: "Em breve",
        description: `A integração com ${channel.name} estará disponível na próxima atualização.`
      });
      return;
    }
    
    // For Webchat and API, just open the modal directly (legacy behavior)
    if (channel.id === "webchat" || channel.id === "api") {
      setSelectedChannel(channel);
      return;
    }

    setSelectedChannelList(channel);
  };

  const handleConfigureConnection = (connection: any) => {
    setActiveConnection(connection);
    setSelectedChannel(CHANNELS.find(c => c.id === "whatsapp"));
    setWhatsappStep("select");
    
    let configObj = null;
    try {
      configObj = connection.config ? JSON.parse(connection.config) : null;
    } catch (e) {
      // ignore
    }

    if (configObj && configObj.provider === 'meta') {
      setWhatsappStep("meta");
      setMetaForm({
        phoneId: configObj.phoneId || "",
        accountId: configObj.accountId || "",
        token: configObj.token || ""
      });
    } else if (configObj && configObj.provider === 'evolution') {
      setWhatsappStep("evolution");
    } else if (connection.provider === 'meta') {
      setWhatsappStep("meta");
      setMetaForm({ phoneId: "", accountId: "", token: "" });
    } else if (connection.provider === 'evolution') {
      setWhatsappStep("evolution");
    } else {
      setMetaForm({ phoneId: "", accountId: "", token: "" });
    }
  };

  const saveConnectionConfig = (provider: 'evolution' | 'meta') => {
    setIsConnecting(true);
    
    let config = {};
    if (provider === 'meta') {
      config = {
        provider: 'meta',
        phoneId: metaForm.phoneId,
        accountId: metaForm.accountId,
        token: metaForm.token
      };
    } else {
      config = { provider: 'evolution' };
    }

    updateConnectionMutation.mutate({
      id: activeConnection.id,
      config
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Canais de Atendimento</h1>
          <p className="text-muted-foreground mt-2">Gerencie as conexões dos seus assistentes nas principais plataformas de comunicação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const assistantsInChannel = getAssistantsForChannel(channel.id);
          const hasConnections = assistantsInChannel.length > 0;
          const isLegacyConnected = channel.id === "webchat";

          return (
            <Card key={channel.id} className={`flex flex-col border transition-all duration-200 h-full ${(hasConnections || isLegacyConnected) ? "border-primary/50 shadow-sm" : "border-border hover:border-primary/20"}`}>
              <CardHeader className="flex flex-row items-start justify-between p-5 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${channel.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {channel.name}
                    </CardTitle>
                    <div className="mt-1">
                      {channel.status === "coming_soon" ? (
                        <Badge variant="secondary" className="bg-muted text-[10px] px-1.5 py-0">Em breve</Badge>
                      ) : (hasConnections || isLegacyConnected) ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200 text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">Disponível</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-5 pt-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{channel.description}</p>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-3 px-5 flex justify-between items-center mt-auto">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Bot className="w-3 h-3" /> 
                  {assistantsInChannel.length} IA(s)
                </div>
                {!(hasConnections || isLegacyConnected) ? (
                  <Button 
                    variant={channel.status === "coming_soon" ? "secondary" : "default"}
                    onClick={() => handleOpenList(channel)}
                    className="gap-1.5 h-8 text-xs px-3"
                  >
                    {channel.status === "coming_soon" ? "Aguarde" : <><Link2 className="w-3 h-3" /> Conectar</>}
                  </Button>
                ) : (
                  <Button variant="outline" className="gap-1.5 h-8 text-xs px-3" onClick={() => handleOpenList(channel)}>
                    <Settings className="w-3 h-3" /> Gerenciar
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* List Manager Modal */}
      <Dialog open={!!selectedChannelList} onOpenChange={(o) => {
        if (!o) {
          setSelectedChannelList(null);
          setIsAddingConnection(false);
          setIsCreatingConnection(false);
          setNewConnName("");
        }
      }}>
        <DialogContent className="sm:max-w-[550px] p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${selectedChannelList?.color}`}>
                  {selectedChannelList?.icon && <selectedChannelList.icon className="w-4 h-4" />}
                </div>
                {isCreatingConnection 
                  ? "Criar Conexão WhatsApp" 
                  : isAddingConnection 
                  ? "Vincular Assistente" 
                  : `Gerenciar ${selectedChannelList?.name}`}
              </div>
              {!isCreatingConnection && !isAddingConnection && (
                <Button size="sm" className="h-8 gap-1 mr-4" onClick={() => setIsCreatingConnection(true)}>
                  <Plus className="w-3.5 h-3.5" /> Nova Conexão
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              {isCreatingConnection 
                ? "Dê um nome e escolha o tipo de API para criar uma nova conexão." 
                : isAddingConnection
                ? "Escolha qual assistente você deseja vincular a esta conexão."
                : "Gerencie suas conexões independentes de WhatsApp e vincule assistentes a elas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isCreatingConnection ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Nome da Conexão</label>
                  <Input 
                    placeholder="Ex: Whats Vendas, WhatsApp Suporte..." 
                    value={newConnName}
                    onChange={(e) => setNewConnName(e.target.value)}
                    className="h-10 text-sm bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">API de Integração</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setNewConnProvider("evolution")}
                      className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                        newConnProvider === "evolution" 
                          ? "border-green-500 bg-green-50/50 font-bold" 
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-sm">Evolution API</span>
                      <span className="text-[10px] text-slate-500 font-normal mt-0.5">Escaneamento de QR Code</span>
                    </div>
                    <div 
                      onClick={() => setNewConnProvider("meta")}
                      className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                        newConnProvider === "meta" 
                          ? "border-blue-500 bg-blue-50/50 font-bold" 
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-sm">Meta Cloud API</span>
                      <span className="text-[10px] text-slate-500 font-normal mt-0.5">API Oficial Cloud</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsCreatingConnection(false)}>Cancelar</Button>
                  <Button size="sm" onClick={() => createConnectionMutation.mutate({ name: newConnName, provider: newConnProvider })} disabled={createConnectionMutation.isPending}>
                    {createConnectionMutation.isPending ? "Criando..." : "Criar Conexão"}
                  </Button>
                </div>
              </div>
            ) : isAddingConnection ? (
              <div className="space-y-3">
                {assistants.filter((a: any) => !dbChannels.some((c: any) => c.type === 'whatsapp' && c.assistantId === a.id)).length === 0 ? (
                  <div className="text-center p-6 text-slate-500 border rounded-2xl bg-slate-50 text-sm">
                    Todos os seus assistentes já possuem um canal WhatsApp configurado.
                  </div>
                ) : (
                  assistants.filter((a: any) => !dbChannels.some((c: any) => c.type === 'whatsapp' && c.assistantId === a.id)).map((a: any) => (
                    <div key={a.id} className="p-3 border rounded-2xl hover:border-primary/50 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between" onClick={() => linkAssistantMutation.mutate({ assistantId: a.id, connectionId: activeConnection.id })}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          {a.avatar && (a.avatar.startsWith("data:image/") || a.avatar.startsWith("http")) ? (
                            <img src={a.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">{a.avatar || "🤖"}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">{a.name}</h4>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-slate-400">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
                <div className="flex justify-start mt-4">
                  <Button variant="outline" size="sm" onClick={() => setIsAddingConnection(false)}>Voltar</Button>
                </div>
              </div>
            ) : whatsappConnections.length === 0 ? (
              <div className="text-center p-8 text-slate-500 border-2 border-dashed rounded-3xl bg-slate-50/50">
                <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-medium text-sm text-slate-700">Nenhuma conexão de WhatsApp</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[80%] mx-auto">Clique em "+ Nova Conexão" acima para criar a sua primeira conexão com WhatsApp.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {whatsappConnections.map((conn: any) => {
                  const linked = getLinkedAssistants(conn.id);
                  const providerName = conn.provider === 'meta' ? 'Meta Oficial' : 'Evolution API';
                  let isConfigured = false;
                  try {
                    isConfigured = conn.config && JSON.parse(conn.config).provider;
                  } catch (e) {}

                  return (
                    <div key={conn.id} className="p-4 border rounded-3xl bg-white space-y-3 shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{conn.name}</h4>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">ID: {conn.id}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                            <span className="text-[11px] text-slate-500 font-medium">{providerName} • {isConfigured ? 'Conectado' : 'Pendente'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl" onClick={() => handleConfigureConnection(conn)}>
                            Configurar
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive rounded-xl" onClick={() => deleteConnectionMutation.mutate(conn.id)} disabled={deleteConnectionMutation.isPending}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Linked Assistants list */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assistentes Vinculados</span>
                          <Button variant="ghost" size="sm" className="h-6 text-[11px] text-primary hover:text-primary/80 font-bold px-1.5 gap-0.5 rounded-lg" onClick={() => {
                            setActiveConnection(conn);
                            setIsAddingConnection(true);
                          }}>
                            <Plus className="w-3 h-3" /> Vincular
                          </Button>
                        </div>
                        {linked.length === 0 ? (
                          <span className="text-xs text-slate-400 italic block pl-1">Nenhum assistente vinculado</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {linked.map((link: any) => (
                              <div key={link.channelId} className="flex items-center gap-1.5 bg-slate-50 border rounded-full pl-1.5 pr-1 py-0.5 text-xs text-slate-700">
                                {link.assistant.avatar && (link.assistant.avatar.startsWith("data:image/") || link.assistant.avatar.startsWith("http")) ? (
                                  <img src={link.assistant.avatar} alt="Avatar" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                ) : (
                                  <span className="shrink-0">{link.assistant.avatar || "🤖"}</span>
                                )}
                                <span className="font-semibold text-[11px]">{link.assistant.name}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-4 h-4 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
                                  onClick={() => unlinkAssistantMutation.mutate(link.channelId)}
                                >
                                  <Plus className="w-2.5 h-2.5 rotate-45" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Connection Modal */}
      <Dialog open={!!selectedChannel && selectedChannel?.id === "whatsapp"} onOpenChange={(o) => {
        if (!o) {
          setSelectedChannel(null);
          setWhatsappStep("select");
        }
      }}>
        <DialogContent className={whatsappStep === "meta" ? "sm:max-w-[600px] p-6 rounded-3xl" : "sm:max-w-[450px] p-6 rounded-3xl"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {whatsappStep !== "select" && (
                <Button variant="ghost" size="icon" className="h-8 w-8 mr-1 rounded-full" onClick={() => setWhatsappStep("select")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${selectedChannel?.color}`}>
                <FaWhatsapp className="w-4 h-4" />
              </div>
              {whatsappStep === "select" ? `Configurar: ${activeConnection?.name}` : whatsappStep === "evolution" ? "Evolution API" : "Meta Cloud API (Oficial)"}
            </DialogTitle>
            <DialogDescription>
              {whatsappStep === "select" 
                ? "Escolha o método de conexão para integrar a IA ao seu WhatsApp."
                : whatsappStep === "evolution" 
                ? "Clique no QR Code abaixo para simular a leitura e conectar (Ambiente de demonstração)."
                : "Insira as credenciais do seu aplicativo da Meta para uma conexão oficial e segura."}
            </DialogDescription>
          </DialogHeader>

          {whatsappStep === "select" && (
            <div className="flex flex-col gap-4 py-4 mt-2">
              <div 
                className="p-5 border-2 border-slate-200 rounded-2xl hover:border-green-500 hover:bg-green-50/30 cursor-pointer transition-all flex gap-4 group"
                onClick={() => setWhatsappStep("evolution")}
              >
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-green-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-green-600 shrink-0 transition-colors">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-green-700">Evolution API (QR Code)</h4>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">Conexão simples via leitura de QR Code. Funciona com qualquer número, mas não é a via oficial.</p>
                </div>
              </div>

              <div 
                className="p-5 border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all flex gap-4 group"
                onClick={() => setWhatsappStep("meta")}
              >
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 shrink-0 transition-colors">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700">Meta Cloud API</h4>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-1.5 py-0 border-blue-200">Oficial</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">Conexão oficial da Meta. Requer criação de App no painel do Facebook, zerando as chances de banimento.</p>
                </div>
              </div>
            </div>
          )}

          {whatsappStep === "evolution" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              {isConnecting ? (
                <div className="flex flex-col items-center gap-4 text-primary">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-medium animate-pulse">Sincronizando com WhatsApp...</p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl p-3 text-xs text-center max-w-[90%] mx-auto font-medium">
                    ⚠️ <strong>Ambiente de Demonstração:</strong> Este QR code é simulado. Para conectar, posicione o cursor sobre o QR code e clique no botão <strong>"Simular Leitura"</strong>. Não o escaneie com seu celular.
                  </div>
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-muted flex items-center justify-center w-64 h-64 relative overflow-hidden group cursor-pointer" onClick={() => saveConnectionConfig('evolution')}>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://nexdesk.com/mock-whatsapp-success" alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                    <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button>Simular Leitura</Button>
                    </div>
                  </div>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside text-left max-w-[80%] mx-auto">
                    <li>Posicione o cursor do mouse sobre o QR Code acima</li>
                    <li>Clique no botão <strong>"Simular Leitura"</strong> que aparece</li>
                    <li>Aguarde a conexão simulada ser concluída</li>
                  </ol>
                </>
              )}
            </div>
          )}

          {whatsappStep === "meta" && (
            <div className="flex flex-col gap-6 py-2 mt-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Phone Number ID (ID do Número)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 105948392817493"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={metaForm.phoneId}
                    onChange={(e) => setMetaForm({...metaForm, phoneId: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">WhatsApp Business Account ID</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 104938271829304"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={metaForm.accountId}
                    onChange={(e) => setMetaForm({...metaForm, accountId: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Access Token Permanente</label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      placeholder="EAAI..."
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      value={metaForm.token}
                      onChange={(e) => setMetaForm({...metaForm, token: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Webhook className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-blue-900 text-sm">Configuração de Webhook (Meta)</h4>
                </div>
                <p className="text-xs text-blue-700 mb-4">Cole a URL e o Token abaixo na seção de Webhooks do seu aplicativo lá no painel da Meta for Developers.</p>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1 block">URL de Retorno (Callback URL)</span>
                    <div className="flex items-center gap-2">
                      <div className="h-9 px-3 bg-white border border-blue-200 rounded-lg text-xs font-mono flex items-center flex-1 overflow-hidden text-ellipsis text-slate-600">
                        https://api.nexdesk.com/webhooks/meta
                      </div>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-100" onClick={() => toast({ title: "URL Copiada!" })}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1 block">Verify Token (Token de Verificação)</span>
                    <div className="flex items-center gap-2">
                      <div className="h-9 px-3 bg-white border border-blue-200 rounded-lg text-xs font-mono flex items-center flex-1 overflow-hidden text-ellipsis text-slate-600">
                        nexdesk_verify_token_2026
                      </div>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-100" onClick={() => toast({ title: "Token Copiado!" })}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto px-8 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => saveConnectionConfig('meta')} disabled={isConnecting}>
                  {isConnecting ? "Salvando..." : "Salvar e Conectar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* API Settings Modal */}
      <Dialog open={!!selectedChannel && selectedChannel?.id === "api"} onOpenChange={(o) => !o && setSelectedChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Integração via API REST</DialogTitle>
            <DialogDescription>Utilize as chaves abaixo para autenticar suas requisições.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chave da API (Bearer Token)</label>
              <div className="flex items-center gap-2">
                <div className="p-3 bg-muted font-mono text-xs rounded-md border flex-1 overflow-hidden text-ellipsis">
                  sk_live_98a7sd897a9s8d7a9s8d7
                </div>
                <Button variant="outline" onClick={() => toast({ title: "Copiado!" })}>Copiar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Endpoint Base</label>
              <div className="p-3 bg-muted font-mono text-xs rounded-md border text-blue-600">
                https://api.nexdesk.com/v1/assistants/chat
              </div>
            </div>
            <div className="p-4 bg-slate-950 text-green-400 font-mono text-xs rounded-lg mt-2 overflow-x-auto">
              <pre>
{`curl -X POST https://api.nexdesk.com/v1/assistants/chat \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Olá!"}'`}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Webchat Settings Modal */}
      <Dialog open={!!selectedChannel && selectedChannel?.id === "webchat"} onOpenChange={(o) => !o && setSelectedChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Web Chat</DialogTitle>
            <DialogDescription>Copie e cole o código abaixo antes do fechamento da tag &lt;/body&gt; no seu site.</DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-slate-950 text-green-400 font-mono text-sm rounded-lg mt-4 overflow-x-auto">
            <pre>
{`<script>
  window.NEXDESK_AI_WIDGET = {
    apiKey: 'sk_test_123456789',
    position: 'bottom-right',
    theme: 'light'
  };
</script>
<script src="https://cdn.nexdesk.com/ai/widget.js" async></script>`}
            </pre>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => {
              toast({ title: "Copiado!", description: "Código copiado para a área de transferência." });
              setSelectedChannel(null);
            }}>
              Copiar Código
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
