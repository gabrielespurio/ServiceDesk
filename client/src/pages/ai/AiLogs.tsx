import { useQuery } from "@tanstack/react-query";
import { 
  Terminal, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Workflow,
  Ticket,
  UserPlus,
  Activity,
  Coins,
  BrainCircuit,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AiLog {
  id: number;
  assistantId: number;
  actionType: string;
  status: string;
  details: any;
  createdAt: string;
}

interface AiAssistant {
  id: number;
  name: string;
  avatar: string;
}

export default function AiLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<AiLog[]>({
    queryKey: ["/api/ai/logs"],
  });

  const { data: assistants = [] } = useQuery<AiAssistant[]>({
    queryKey: ["/api/ai/assistants"],
  });

  const getAssistantName = (id: number) => {
    return assistants.find(a => a.id === id)?.name || `Assistente #${id}`;
  };

  const getAssistantAvatar = (id: number) => {
    return assistants.find(a => a.id === id)?.avatar || "🤖";
  };

  const getActionDetails = (actionType: string) => {
    switch(actionType) {
      case "n8n":
      case "execute_n8n":
        return { icon: Workflow, label: "Execução N8N", color: "text-orange-600", bg: "bg-orange-100" };
      case "create_ticket":
        return { icon: Ticket, label: "Abertura de Ticket", color: "text-blue-600", bg: "bg-blue-100" };
      case "transfer_human":
        return { icon: UserPlus, label: "Transferência Humana", color: "text-emerald-600", bg: "bg-emerald-100" };
      case "chat_response":
        return { icon: MessageSquare, label: "Resposta de Chat", color: "text-blue-500", bg: "bg-blue-50" };
      default:
        return { icon: Terminal, label: actionType, color: "text-slate-600", bg: "bg-slate-100" };
    }
  };

  const filteredLogs = logs.filter(log => 
    log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) || 
    getAssistantName(log.assistantId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcs for Geral Dashboard
  const totalActions = logs.length;
  const successActions = logs.filter(l => l.status === 'success').length;
  const successRate = totalActions > 0 ? Math.round((successActions / totalActions) * 100) : 0;
  const activeAssistantsCount = new Set(logs.map(l => l.assistantId)).size;

  // Calcs for Token Consumption
  const tokenConsumption = useMemo(() => {
    const consumption: Record<number, { tokens: number, model: string, cost: number }> = {};
    
    logs.forEach(log => {
      if (log.actionType === "chat_response" && log.details && log.details.tokens) {
        const astId = log.assistantId;
        const tokens = log.details.tokens || 0;
        const model = log.details.model || "Desconhecido";
        
        if (!consumption[astId]) {
          // Os logs vêm em ordem DESCENDENTE, então o primeiro que encontramos é o mais recente.
          consumption[astId] = { tokens: 0, model, cost: 0 };
        }
        
        consumption[astId].tokens += tokens;
        
        // Cost estimation based on model prices (per 1k tokens combined input/output approx)
        let costPer1k = 0;
        if (model.includes("gemini-2.5-flash")) costPer1k = 0.000075;
        else if (model.includes("gemini-1.5-pro")) costPer1k = 0.0035;
        else if (model.includes("gpt-4o-mini") || model.includes("gpt-5-mini")) costPer1k = 0.00015;
        else if (model.includes("gpt-4o") || model.includes("gpt-5")) costPer1k = 0.005;
        else if (model.includes("gpt-3.5")) costPer1k = 0.001;
        else if (model.includes("claude-3-5-sonnet")) costPer1k = 0.003;
        
        consumption[astId].cost += (tokens / 1000) * costPer1k;
      }
    });

    return Object.entries(consumption).map(([id, data]) => ({
      assistantId: parseInt(id),
      ...data
    })).sort((a, b) => b.cost - a.cost);
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Monitoramento
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Visão geral, logs de ações detalhados e consumo de tokens da Inteligência Artificial.
          </p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-12 w-full md:w-auto inline-flex mb-6">
          <TabsTrigger value="geral" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold rounded-lg px-6">
            <BarChart3 className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold rounded-lg px-6">
            <Terminal className="w-4 h-4 mr-2" />
            Logs de Ações
          </TabsTrigger>
          <TabsTrigger value="tokens" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold rounded-lg px-6">
            <Coins className="w-4 h-4 mr-2" />
            Consumo de Tokens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ações Executadas</p>
                  <h3 className="text-4xl font-bold text-slate-800 mt-2">{totalActions}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-4">Total de automações e chats registrados</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Taxa de Sucesso</p>
                  <h3 className="text-4xl font-bold text-slate-800 mt-2">{successRate}%</h3>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-4">Requisições sem nenhum erro</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Assistentes Ativos</p>
                  <h3 className="text-4xl font-bold text-slate-800 mt-2">{activeAssistantsCount}</h3>
                </div>
                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-4">IA com atividades logadas</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Buscar por ação ou assistente..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-200 rounded-xl"
                />
              </div>
              <Button variant="outline" className="h-10 rounded-xl gap-2 border-slate-200 text-slate-600">
                <Filter className="w-4 h-4" /> Filtros
              </Button>
            </div>

            <div className="p-0">
              {isLoadingLogs ? (
                <div className="p-8 text-center text-slate-500">Carregando logs...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Terminal className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Nenhum log encontrado</h3>
                  <p className="text-slate-500 text-sm mt-1">Os assistentes ainda não executaram nenhuma ação registrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const action = getActionDetails(log.actionType);
                    const isExpanded = expandedLog === log.id;
                    
                    return (
                      <div key={log.id} className={`transition-colors ${isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/50'}`}>
                        <div 
                          className="p-4 flex items-center gap-4 cursor-pointer"
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          {/* Status Icon */}
                          <div className="shrink-0">
                            {log.status === 'success' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : log.status === 'pending' ? (
                              <Clock className="w-5 h-5 text-orange-400" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>

                          {/* Action Type */}
                          <div className="w-48 shrink-0 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.bg} ${action.color}`}>
                              <action.icon className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-slate-700 text-sm">{action.label}</span>
                          </div>

                          {/* Assistant */}
                          <div className="flex-1 flex items-center gap-2">
                            {(() => {
                              const avatar = getAssistantAvatar(log.assistantId);
                              if (avatar && (avatar.startsWith("data:image/") || avatar.startsWith("http"))) {
                                return <img src={avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover shrink-0" />;
                              }
                              return <span className="text-lg" title="Avatar do Assistente">{avatar}</span>;
                            })()}
                            <span className="text-sm font-medium text-slate-600">{getAssistantName(log.assistantId)}</span>
                          </div>

                          {/* Date */}
                          <div className="shrink-0 text-right">
                            <p className="text-sm text-slate-600 font-medium">
                              {format(new Date(log.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                            </p>
                          </div>

                          {/* Expand Toggle */}
                          <div className="shrink-0 pl-4">
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-12 pb-4 pt-1">
                            <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payload Technical Details</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  log.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 
                                  log.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {log.status.toUpperCase()}
                                </span>
                              </div>
                              <pre className="text-[13px] text-green-400 font-mono">
                                {log.details ? JSON.stringify(log.details, null, 2) : "// Nenhum detalhe técnico disponível"}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="mt-0">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-1">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                Custos e Tokens
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o consumo aproximado da API (Baseado em requisições de Chat) por assistente. *Os valores são estimativas e valem a partir da última atualização.*
              </p>
            </div>
            
            <div className="p-0">
              {isLoadingLogs ? (
                <div className="p-8 text-center text-slate-500">Calculando consumo...</div>
              ) : tokenConsumption.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Coins className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Nenhum consumo registrado</h3>
                  <p className="text-slate-500 text-sm mt-1">Os assistentes ainda não consumiram tokens que tenham sido salvos nos logs.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs uppercase bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-2xl">Assistente</th>
                      <th className="px-6 py-4">Último Modelo Usado</th>
                      <th className="px-6 py-4">Tokens Consumidos</th>
                      <th className="px-6 py-4 text-right rounded-tr-2xl">Custo Estimado (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tokenConsumption.map((tc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium flex items-center gap-3 text-slate-800">
                          {(() => {
                            const avatar = getAssistantAvatar(tc.assistantId);
                            if (avatar && (avatar.startsWith("data:image/") || avatar.startsWith("http"))) {
                              return <img src={avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />;
                            }
                            return <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-lg shrink-0">{avatar}</div>;
                          })()}
                          {getAssistantName(tc.assistantId)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                            {tc.model}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-semibold">
                            {tc.tokens.toLocaleString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 text-base">
                          ${tc.cost.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
