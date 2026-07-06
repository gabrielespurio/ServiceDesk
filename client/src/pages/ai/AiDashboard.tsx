import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageCircle, Zap, AlertCircle, Award, TrendingUp } from "lucide-react";

export default function AiDashboard() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/ai/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de IA</h1>
          <p className="text-muted-foreground mt-2">Carregando métricas de desempenho dos assistentes...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-none shadow-lg shadow-slate-100/70 bg-white animate-pulse">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 w-32 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const maxVolume = Math.max(...(stats?.dailyVolume?.map((d: any) => d.count) || [1]));
  const maxUsage = Math.max(...(stats?.topAssistants?.map((a: any) => a.count) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Dashboard de IA</h1>
          <p className="text-muted-foreground mt-2">Visão geral do desempenho dos seus assistentes digitais.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Assistentes */}
        <Card className="border-none shadow-lg shadow-slate-100/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assistentes</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Bot className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800">
              {stats?.activeAssistants} <span className="text-sm font-medium text-slate-400">/ {stats?.totalAssistants}</span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 mt-2 flex items-center gap-1">
              Assistentes ativos prontos para atender
            </p>
          </CardContent>
        </Card>
        
        {/* Conversas */}
        <Card className="border-none shadow-lg shadow-slate-100/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversas (Hoje)</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <MessageCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800">{stats?.totalChatsToday}</div>
            <p className="text-[11px] font-semibold text-slate-400 mt-2">
              Histórico total: {stats?.totalChatsAllTime} interações
            </p>
          </CardContent>
        </Card>
        
        {/* Taxa de Resolução */}
        <Card className="border-none shadow-lg shadow-slate-100/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Automação</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800">{stats?.autoResolutionRate}%</div>
            <p className="text-[11px] font-semibold text-slate-400 mt-2">
              Taxa de sucesso nas respostas
            </p>
          </CardContent>
        </Card>
        
        {/* Falhas de API */}
        <Card className="border-none shadow-lg shadow-slate-100/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Falhas de API</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800">{stats?.apiErrorCount}</div>
            <p className="text-[11px] font-semibold text-red-600 mt-2 flex items-center gap-1">
              Erros de chave de API ou conexão
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Volume de Conversas */}
        <Card className="border-none shadow-lg shadow-slate-100/70 bg-white min-h-[350px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volume de Conversas
            </CardTitle>
            <CardDescription className="text-xs">Quantidade de atendimentos realizados nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end p-6 pt-4">
            {stats?.dailyVolume && stats.dailyVolume.some((d: any) => d.count > 0) ? (
              <div className="h-[180px] flex items-end justify-between gap-3 px-2">
                {stats.dailyVolume.map((day: any, idx: number) => {
                  const percentage = maxVolume > 0 ? (day.count / maxVolume) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {day.count}
                      </div>
                      <div 
                        style={{ height: `${Math.max(percentage, 5)}%` }} 
                        className="w-full bg-primary/20 group-hover:bg-primary rounded-t-lg transition-all duration-300 relative"
                      >
                        {/* Tooltip detail */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap z-10">
                          {day.count} chats
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1 select-none">
                        {day.date}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs italic h-[180px]">
                Sem dados suficientes nos últimos 7 dias
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Top Assistentes */}
        <Card className="border-none shadow-lg shadow-slate-100/70 bg-white min-h-[350px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Top Assistentes por Uso
            </CardTitle>
            <CardDescription className="text-xs">Ranking de interações acumuladas por agente digital</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-6 space-y-4">
            {stats?.topAssistants && stats.topAssistants.length > 0 ? (
              <div className="space-y-4">
                {stats.topAssistants.map((assistant: any, idx: number) => {
                  const percentage = maxUsage > 0 ? (assistant.count / maxUsage) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-700">{assistant.name}</span>
                        <span className="text-slate-500">{assistant.count} interações</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${percentage}%` }}
                          className="h-full bg-primary rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs italic h-[180px]">
                Nenhum assistente interagiu no chat ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
