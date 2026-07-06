import { useTicket, useUpdateTicket } from "@/hooks/use-tickets";
import { useMessages, useCreateMessage } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useResolvers } from "@/hooks/use-users";
import { useRoute, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, ArrowLeft, Lock, User, Clock, Bell, ChevronDown, Paperclip, Smile, 
  BookOpen, Sparkles, Clipboard, UserPlus, Pencil, MoreVertical, Globe, 
  Calendar, AlertCircle, Check, FileText
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";

export default function TicketDetail() {
  const [, params] = useRoute("/portal/ticket/:id");
  const [, setLocation] = useLocation();
  const ticketId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId);
  const { data: messages, isLoading: messagesLoading } = useMessages(ticketId);
  const { data: resolvers } = useResolvers();
  
  const createMessage = useCreateMessage();
  const updateTicket = useUpdateTicket();
  
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [activeTab, setActiveTab] = useState<"reply" | "internal" | "attachment">("reply");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  
  // Custom fields editing state
  const [isEditingCustomFields, setIsEditingCustomFields] = useState(false);
  const [editedCustomFields, setEditedCustomFields] = useState<Record<string, { label: string; value: any; type: string }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isResolver = user?.role === 'resolver' || user?.role === 'admin';

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    createMessage.mutate(
      { ticketId, content: newMessage, isInternal },
      { onSuccess: () => setNewMessage("") }
    );
  };

  const handleStatusChange = (newStatus: string) => {
    updateTicket.mutate({ id: ticketId, status: newStatus as any });
  };

  const handleCopyEmail = () => {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.creator.email);
    toast({
      title: "E-mail copiado!",
      description: "O e-mail do solicitante foi copiado para a área de transferência.",
    });
  };

  const handleOpenEditCustomFields = () => {
    if (!ticket) return;
    try {
      const fields = JSON.parse(ticket.customFields as string || "{}");
      setEditedCustomFields(fields);
      setIsEditingCustomFields(true);
    } catch {
      setEditedCustomFields({});
    }
  };

  const handleSaveCustomFields = () => {
    updateTicket.mutate({
      id: ticketId,
      customFields: JSON.stringify(editedCustomFields)
    }, {
      onSuccess: () => {
        setIsEditingCustomFields(false);
      }
    });
  };

  const selectAiSuggestion = (suggestionText: string) => {
    setNewMessage(suggestionText);
    setShowAiSuggestions(false);
    toast({
      title: "Resposta preenchida!",
      description: "A resposta sugerida pela IA foi inserida no campo de texto.",
    });
  };

  if (ticketLoading || messagesLoading) return <div className="p-8 text-center">Carregando detalhes do chamado...</div>;
  if (!ticket) return <div className="p-8 text-center">Chamado não encontrado</div>;

  // Build the list of displayed messages (initial description + subsequent replies)
  interface MessageItem {
    id: string | number;
    userId: number;
    fullName: string;
    role: string;
    createdAt: Date;
    content: string;
    isInternal: boolean;
    isInitialDescription?: boolean;
  }

  const displayMessages: MessageItem[] = [
    {
      id: "initial",
      userId: ticket.creatorId,
      fullName: ticket.creator.fullName,
      role: ticket.creator.role,
      createdAt: new Date(ticket.createdAt!),
      content: ticket.description,
      isInternal: false,
      isInitialDescription: true,
    },
    ...(messages || []).map((msg) => ({
      id: msg.id,
      userId: msg.userId,
      fullName: msg.user.fullName,
      role: msg.user.role,
      createdAt: new Date(msg.createdAt!),
      content: msg.content,
      isInternal: msg.isInternal,
    }))
  ];

  const sortedDisplayMessages = [...displayMessages].sort((a, b) => {
    const dateA = a.createdAt.getTime();
    const dateB = b.createdAt.getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const getSlaDetails = () => {
    if (!ticket.sla) return null;
    const deadline = new Date(ticket.sla.deadline);
    const created = new Date(ticket.createdAt!);
    const now = new Date();
    
    const totalSlaTime = deadline.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    
    let progress = 0;
    let colorClass = "bg-gradient-to-r from-indigo-500 to-indigo-400";
    let statusText = "";
    
    if (ticket.sla.wasMet) {
      progress = 100;
      colorClass = "bg-gradient-to-r from-emerald-500 to-teal-400";
      statusText = "Cumprido";
    } else if (ticket.sla.isOverdue) {
      progress = 100;
      colorClass = "bg-gradient-to-r from-red-500 to-rose-500";
      const distance = formatDistanceToNow(deadline, { locale: ptBR });
      statusText = `${distance} de atraso`;
    } else {
      progress = totalSlaTime > 0 ? Math.min(100, Math.max(0, (elapsed / totalSlaTime) * 100)) : 100;
      const distance = formatDistanceToNow(deadline, { locale: ptBR });
      statusText = `${distance} restante(s)`;
    }
    
    return { progress, colorClass, statusText };
  };

  const slaInfo = getSlaDetails();

  const isDifferentDay = (idx: number) => {
    if (idx === 0) return true;
    const prevMsg = sortedDisplayMessages[idx - 1];
    const currMsg = sortedDisplayMessages[idx];
    return format(prevMsg.createdAt, "yyyy-MM-dd") !== format(currMsg.createdAt, "yyyy-MM-dd");
  };

  // IA Suggested answers list based on details
  const aiSuggestions = [
    `Olá ${ticket.creator.fullName.split(' ')[0]}! Recebemos sua solicitação e nossa equipe já está trabalhando para resolver a situação do sistema ${ticket.category}. Entraremos em contato com atualizações em breve.`,
    `Olá! Poderia nos fornecer mais detalhes ou prints do erro que você está encontrando ao acessar o ${ticket.category}? Isso nos ajudará a diagnosticar o problema mais rapidamente.`,
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      {/* Top Header Row */}
      <div className="flex items-center justify-between shrink-0 pb-1">
        <Button 
          variant="ghost" 
          className="pl-0 text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5"
          onClick={() => setLocation(isResolver ? "/dashboard" : "/portal")}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para a lista
        </Button>
        
        <div className="flex items-center gap-4">
          {isResolver && (
            <SelectStatus currentStatus={ticket.status} onChange={handleStatusChange} />
          )}
          
          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground h-9 w-9">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-background">3</span>
          </Button>
          
          {/* User profile */}
          <div className="flex items-center gap-2 border-l pl-3 h-8">
            <Avatar className="w-8 h-8 border border-border/50">
              <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xs">
                {user?.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground leading-tight">{user?.fullName}</span>
              <span className="text-[10px] text-muted-foreground capitalize leading-tight">
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'resolver' ? 'Técnico' : 'Usuário'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
          </div>
        </div>
      </div>

      {/* Ticket Details Main Card Header */}
      <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-white shrink-0">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-4">
            {/* Icon box */}
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-indigo-100/50">
              <FileText className="w-6 h-6" />
            </div>
            {/* Info column */}
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-foreground leading-tight">{ticket.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-slate-500">#{ticket.id}</span>
                <span>•</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Criado em {format(new Date(ticket.createdAt!), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Mais ações button/dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-border/60 hover:bg-slate-50 flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-white rounded-lg shadow-sm">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  Mais ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Ações do Chamado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => updateTicket.mutate({ id: ticket.id, status: 'resolvido' })} 
                  disabled={ticket.status === 'resolvido'}
                  className="cursor-pointer text-xs"
                >
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Marcar como Resolvido
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => updateTicket.mutate({ id: ticket.id, status: 'fechado' })} 
                  disabled={ticket.status === 'fechado'}
                  className="cursor-pointer text-xs"
                >
                  <Lock className="w-4 h-4 mr-2 text-slate-500" />
                  Fechar Chamado
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] text-muted-foreground">Alterar Prioridade</DropdownMenuLabel>
                {['baixa', 'media', 'alta', 'critica'].map((p) => (
                  <DropdownMenuItem 
                    key={p} 
                    onClick={() => updateTicket.mutate({ id: ticket.id, priority: p as any })}
                    className={cn("cursor-pointer text-xs capitalize", ticket.priority === p && "font-bold text-indigo-600 bg-indigo-50")}
                  >
                    {p}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white border border-border/50 rounded-xl shadow-sm overflow-hidden h-full min-h-0">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-slate-50/50 shrink-0">
            <span className="font-bold text-sm text-foreground">Conversa</span>
            
            {/* Sort order select */}
            <Select 
              value={sortOrder} 
              onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
            >
              <SelectTrigger className="w-[190px] h-8 bg-white text-xs text-muted-foreground border-border/40 rounded-lg">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc" className="text-xs">Mais antigos primeiro</SelectItem>
                <SelectItem value="desc" className="text-xs">Mais recentes primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Messages list (scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            {sortedDisplayMessages.map((msg, idx) => {
              // Hide internal messages from regular users
              if (msg.isInternal && !isResolver) return null;

              const isMe = msg.userId === user?.id;

              return (
                <div key={msg.id} className="space-y-4">
                  {/* Date Divider */}
                  {isDifferentDay(idx) && (
                    <div className="relative my-4 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/40" />
                      </div>
                      <span className="relative bg-[#fbfcfd] px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {format(msg.createdAt, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                    <Avatar className={cn("w-9 h-9 border border-border/50 shrink-0")}>
                      <AvatarFallback className={cn(isMe ? "bg-indigo-600 text-white font-semibold text-xs" : "bg-slate-100 text-slate-700 font-semibold text-xs")}>
                        {msg.fullName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("space-y-1 max-w-[80%] flex flex-col", isMe ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-2 text-xs">
                        {msg.isInternal && <Lock className="w-3 h-3 text-amber-600" />}
                        <span className="font-semibold text-slate-800">{msg.fullName}</span>
                        <span className="text-muted-foreground text-[10px]">{format(msg.createdAt, "HH:mm")}</span>
                      </div>
                      <div className={cn(
                        "p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm border",
                        isMe 
                          ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none" 
                          : msg.isInternal 
                            ? "bg-amber-50/70 border-amber-200 text-amber-900 rounded-tl-none" 
                            : "bg-white border-border/40 text-slate-800 rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>

                  {/* Special Conversa Iniciada Divider after first message in ASC order */}
                  {msg.isInitialDescription && sortOrder === "asc" && (
                    <div className="relative my-4 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-dashed border-border/50" />
                      </div>
                      <span className="relative bg-[#fbfcfd] px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Conversa Iniciada
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Editor Card */}
          <div className="border-t border-border/50 shrink-0 flex flex-col bg-white">
            {/* Editor Tabs */}
            <div className="flex border-b border-border/40 bg-slate-50/50 px-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("reply");
                  setIsInternal(false);
                }}
                className={cn(
                  "px-4 py-3 text-xs font-semibold border-b-2 transition-all",
                  activeTab === "reply"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Responder
              </button>
              {isResolver && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("internal");
                    setIsInternal(true);
                  }}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold border-b-2 transition-all",
                    activeTab === "internal"
                      ? "border-indigo-600 text-indigo-600 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Nota interna
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("attachment")}
                className={cn(
                  "px-4 py-3 text-xs font-semibold border-b-2 transition-all",
                  activeTab === "attachment"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Anexos
              </button>
            </div>

            {/* Input fields / upload states */}
            {activeTab === "attachment" ? (
              <div className="p-5 border-2 border-dashed border-border/40 rounded-xl m-4 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50/30 hover:bg-slate-50/60 transition-colors">
                <div className="p-2.5 bg-white rounded-full shadow-sm">
                  <Paperclip className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-foreground">Clique para anexar arquivos</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PDF, PNG, JPG ou ZIP até 10MB</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex flex-col">
                <div className="p-3">
                  <Textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isInternal ? "Adicionar uma nota interna (visível apenas para a equipe)..." : "Digite sua resposta..."}
                    className={cn(
                      "min-h-[75px] resize-none shadow-none border-none outline-none focus-visible:ring-0 text-sm p-2", 
                      isInternal && "placeholder:text-amber-700/60"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                {/* Editor Bottom Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-slate-50/30">
                  <div className="flex items-center gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <BookOpen className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="sm" 
                    className={cn(
                      "rounded-lg font-semibold text-xs px-4 flex items-center gap-1.5 shadow-sm transition-all",
                      isInternal 
                        ? "bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-amber-100" 
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                    )}
                    disabled={!newMessage.trim() || createMessage.isPending}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isInternal ? "Enviar Nota" : "Enviar"}
                  </Button>
                </div>
              </form>
            )}

            {/* AI Suggested Response Banner */}
            {!isInternal && activeTab !== "attachment" && (
              <div className="border-t border-border/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAiSuggestions(!showAiSuggestions)}
                  className="w-full flex items-center justify-between px-5 py-2.5 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-white hover:from-indigo-50/80 transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Respostas sugeridas com IA
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-indigo-500 transition-transform duration-200", showAiSuggestions && "transform rotate-180")} />
                </button>
                
                {showAiSuggestions && (
                  <div className="p-4 bg-slate-50/50 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiSuggestions.map((suggestion, index) => (
                      <div 
                        key={index}
                        onClick={() => selectAiSuggestion(suggestion)}
                        className="p-3 bg-white border border-border/40 hover:border-indigo-300 hover:shadow-sm rounded-lg text-xs leading-relaxed text-slate-600 cursor-pointer transition-all"
                      >
                        <div className="font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Sugestão {index + 1}
                        </div>
                        {suggestion.length > 130 ? `${suggestion.substring(0, 130)}...` : suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="w-full lg:w-80 space-y-6 shrink-0">
          {/* Card Detalhes do Chamado */}
          <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Detalhes do Chamado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              {/* Solicitante Row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Solicitante</span>
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7 border border-border/50 shrink-0">
                    <AvatarFallback className="bg-indigo-50 text-indigo-700 font-semibold text-xs">
                      {ticket.creator.fullName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-slate-800 truncate">{ticket.creator.fullName}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{ticket.creator.email}</span>
                  </div>
                  <button 
                    onClick={handleCopyEmail}
                    className="text-muted-foreground hover:text-indigo-600 transition-colors p-1 rounded hover:bg-slate-100 ml-auto shrink-0"
                    title="Copiar e-mail"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <Separator className="bg-border/40" />

              {/* Categoria and Prioridade Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Categoria</span>
                  <span className="text-xs font-bold text-slate-800 capitalize truncate">{ticket.category}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Prioridade</span>
                  <PriorityBadge priority={ticket.priority} />
                </div>
              </div>
              
              <Separator className="bg-border/40" />

              {/* Atribuído a */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Atribuído a</span>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {ticket.assignee ? (
                      <>
                        <Avatar className="w-7 h-7 border border-border/50 shrink-0">
                          <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold text-xs">
                            {ticket.assignee.fullName[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-slate-800 truncate">{ticket.assignee.fullName}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Não atribuído</span>
                    )}
                  </div>
                  
                  {/* Quick Assign Dropdown for resolver/admin */}
                  {isResolver && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 flex items-center gap-1 font-bold text-xs h-7 px-2 rounded-md shrink-0">
                          <UserPlus className="w-3.5 h-3.5" />
                          Atribuir
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="text-xs">Técnico Responsável</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {resolvers?.map((r: any) => (
                          <DropdownMenuItem 
                            key={r.id} 
                            onClick={() => updateTicket.mutate({ id: ticket.id, assignedToId: r.id })}
                            className="flex items-center gap-2 cursor-pointer py-1.5 text-xs"
                          >
                            <Avatar className="w-5 h-5 shrink-0">
                              <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-700 font-bold">{r.fullName[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{r.fullName}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => updateTicket.mutate({ id: ticket.id, assignedToId: null })}
                          className="text-destructive focus:text-destructive cursor-pointer text-xs"
                        >
                          Remover Atribuição
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SLA Status Card */}
          {ticket.sla && slaInfo && (
            <Card className={cn(
              "border shadow-sm rounded-xl overflow-hidden bg-white", 
              ticket.sla.isOverdue && !ticket.sla.wasMet ? "border-red-200/60 bg-red-50/10" : ticket.sla.wasMet ? "border-green-200/60 bg-green-50/10" : "border-border/50"
            )}>
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock className={cn(
                    "w-4 h-4", 
                    ticket.sla.isOverdue && !ticket.sla.wasMet ? "text-red-500" : ticket.sla.wasMet ? "text-emerald-500" : "text-indigo-500"
                  )} />
                  Status do SLA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Política Aplicada</span>
                    <span className="text-xs font-bold text-slate-800 truncate">{ticket.sla.matchingPolicyName}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Prazo de Resolução</span>
                    <span className="text-xs font-bold text-slate-800">
                      {format(new Date(ticket.sla.deadline), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>

                {/* SLA Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div 
                      className={cn("h-full transition-all duration-500", slaInfo.colorClass)}
                      style={{ width: `${slaInfo.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-bold flex items-center gap-1", 
                      ticket.sla.isOverdue && !ticket.sla.wasMet ? "text-red-500" : ticket.sla.wasMet ? "text-emerald-600" : "text-indigo-600"
                    )}>
                      {slaInfo.statusText}
                    </span>
                    {ticket.sla.isOverdue && (
                      <Badge variant="destructive" className="h-5 text-[9px] px-1.5 font-bold uppercase tracking-wider">
                        {ticket.sla.isResolved ? "Atrasado" : "Vencido"}
                      </Badge>
                    )}
                    {ticket.sla.wasMet && (
                      <Badge variant="secondary" className="h-5 text-[9px] px-1.5 font-bold bg-green-50 text-emerald-700 border-emerald-100 uppercase tracking-wider">
                        No Prazo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card Campos Adicionais */}
          <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Campos Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-4">
              {(() => {
                if (!ticket.customFields) return <span className="text-xs text-muted-foreground italic">Nenhum campo preenchido</span>;
                try {
                  const fields = JSON.parse(ticket.customFields as string) as Record<string, { label: string; value: string | string[]; type: string }>;
                  const entries = Object.entries(fields);
                  if (entries.length === 0) return <span className="text-xs text-muted-foreground italic">Nenhum campo preenchido</span>;
                  return (
                    <div className="space-y-4">
                      {entries.map(([id, field]) => (
                        <div key={id} className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{field.label}</span>
                          <span className="text-xs font-bold text-slate-800 truncate" data-testid={`custom-field-${id}`}>
                            {Array.isArray(field.value) ? field.value.join(", ") : field.value === "true" ? "Sim" : field.value === "false" ? "Não" : field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                } catch { 
                  return <span className="text-xs text-muted-foreground italic">Erro ao processar campos</span>; 
                }
              })()}

              <Separator className="bg-border/40" />
              
              <Button 
                onClick={handleOpenEditCustomFields}
                variant="ghost" 
                size="sm" 
                className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 flex items-center justify-center gap-1.5 font-bold text-xs h-9 rounded-lg border border-dashed border-indigo-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar campos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Custom Fields Dialog */}
      <Dialog open={isEditingCustomFields} onOpenChange={setIsEditingCustomFields}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Editar Campos Adicionais</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[350px] overflow-y-auto pr-1">
            {Object.entries(editedCustomFields).map(([key, field]) => {
              if (field.type === 'textarea') {
                return (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">{field.label}</Label>
                    <Textarea 
                      value={editedCustomFields[key]?.value || ""}
                      onChange={(e) => setEditedCustomFields(prev => ({
                        ...prev,
                        [key]: { ...prev[key], value: e.target.value }
                      }))}
                      className="min-h-[80px] text-xs resize-none"
                    />
                  </div>
                );
              }
              
              if (field.type === 'checkbox') {
                const isChecked = editedCustomFields[key]?.value === "true" || editedCustomFields[key]?.value === true;
                return (
                  <div key={key} className="flex items-center space-x-2 py-1.5">
                    <Checkbox 
                      id={`edit-field-${key}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => setEditedCustomFields(prev => ({
                        ...prev,
                        [key]: { ...prev[key], value: checked ? "true" : "" }
                      }))}
                    />
                    <Label htmlFor={`edit-field-${key}`} className="text-xs font-semibold text-slate-700 cursor-pointer">{field.label}</Label>
                  </div>
                );
              }

              return (
                <div key={key} className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">{field.label}</Label>
                  <Input 
                    type={field.type === 'number' || field.type === 'decimal' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={Array.isArray(editedCustomFields[key]?.value) ? editedCustomFields[key]?.value.join(", ") : editedCustomFields[key]?.value || ""}
                    onChange={(e) => {
                      let val: any = e.target.value;
                      if (field.type === 'multi-select' && typeof val === 'string') {
                        val = val.split(',').map(s => s.trim());
                      }
                      setEditedCustomFields(prev => ({
                        ...prev,
                        [key]: { ...prev[key], value: val }
                      }));
                    }}
                    className="text-xs h-9"
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditingCustomFields(false)} className="text-xs font-medium">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveCustomFields} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs">
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectStatus({ currentStatus, onChange }: { currentStatus: string, onChange: (s: string) => void }) {
  const statuses = [
    { value: "aberto", label: "Aberto" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "aguardando_usuario", label: "Aguardando Usuário" },
    { value: "resolvido", label: "Resolvido" },
    { value: "fechado", label: "Fechado" },
  ];
  
  return (
    <Select value={currentStatus} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] h-9 bg-white border border-border/50 rounded-lg text-xs font-medium shadow-none">
        <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map(s => (
          <SelectItem key={s.value} value={s.value} className="text-xs font-medium">
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
