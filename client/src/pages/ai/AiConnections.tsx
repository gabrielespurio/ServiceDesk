import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Link2, Globe, Trash2, Edit, Save, PlusCircle, Search, Play, CheckCircle2, AlertCircle, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AiConnections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "api_rest",
    url: "",
    method: "GET",
    authType: "none",
    authConfig: { token: "", user: "", pass: "", tokenUrl: "" },
    bodySchema: "",
    parameters: [] as { name: string; type: string; description: string; required: boolean; testValue?: string }[]
  });

  const { data: connections = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/ai/connections"],
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingId) {
        return apiRequest("PUT", `/api/ai/connections/${editingId}`, data);
      }
      return apiRequest("POST", "/api/ai/connections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/connections"] });
      toast({ title: "Sucesso", description: editingId ? "Conexão atualizada!" : "Conexão criada!" });
      setIsModalOpen(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível salvar a conexão.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/ai/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/connections"] });
      toast({ title: "Sucesso", description: "Conexão excluída!" });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/ai/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.ok) {
        toast({ title: "Conexão bem-sucedida!", description: `Status: ${data.status}` });
      } else {
        toast({ title: "Erro na API", description: `A API retornou status ${data.status}`, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      setTestResult({ error: err.message });
      toast({ title: "Falha Crítica", description: "Não foi possível alcançar o servidor.", variant: "destructive" });
    }
  });

  const handleEdit = (conn: any) => {
    setTestResult(null);
    setEditingId(conn.id);
    setFormData({
      name: conn.name,
      description: conn.description || "",
      type: conn.type,
      url: conn.url,
      method: conn.method,
      authType: conn.authType,
      authConfig: conn.authConfig ? JSON.parse(conn.authConfig) : { token: "", user: "", pass: "", tokenUrl: "" },
      bodySchema: conn.bodySchema || "",
      parameters: conn.parameters ? JSON.parse(conn.parameters) : []
    });
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setTestResult(null);
    setEditingId(null);
    setFormData({
      name: "", description: "", type: "api_rest", url: "", method: "GET", authType: "none",
      authConfig: { token: "", user: "", pass: "", tokenUrl: "" }, bodySchema: "", parameters: []
    });
    setIsModalOpen(true);
  };

  const filteredConnections = connections.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Link2 className="w-8 h-8 text-primary" />
            Conexões (Ferramentas)
          </h1>
          <p className="text-slate-500 mt-1">Configure APIs externas globalmente para usar em qualquer Assistente de IA.</p>
        </div>
        <Button onClick={handleCreateNew} className="h-11 px-6 rounded-xl font-bold gap-2">
          <Plus className="w-4 h-4" /> Nova Conexão
        </Button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
          <Input 
            placeholder="Buscar conexões por nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-slate-50 border-none"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Nenhuma conexão encontrada</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Você ainda não possui conexões globais cadastradas. Crie uma para começar a integrá-las aos seus assistentes.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Nome</TableHead>
                <TableHead className="font-semibold text-slate-700">Endpoint</TableHead>
                <TableHead className="font-semibold text-slate-700">Autenticação</TableHead>
                <TableHead className="font-semibold text-slate-700">Parâmetros</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnections.map((conn) => {
                const params = conn.parameters ? JSON.parse(conn.parameters) : [];
                return (
                  <TableRow key={conn.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-slate-900 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm leading-snug">{conn.name}</div>
                          <div className="text-xs text-slate-500 font-normal mt-0.5 line-clamp-1 max-w-[280px]" title={conn.description}>
                            {conn.description || "Nenhuma descrição fornecida."}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          conn.method === "GET" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {conn.method}
                        </span>
                        <code className="text-xs text-slate-600 font-mono max-w-[200px] lg:max-w-[300px] truncate block" title={conn.url}>
                          {conn.url}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/50">
                        {conn.authType === "none" && "Nenhuma"}
                        {conn.authType === "token" && "Bearer Token"}
                        {conn.authType === "basic" && "Basic Auth"}
                        {conn.authType === "oauth2_password" && "OAuth2"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {params.length > 0 ? (
                        <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-medium">
                          {params.length} {params.length === 1 ? "parâmetro" : "parâmetros"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">Nenhum</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg" onClick={() => handleEdit(conn)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => {
                          if (confirm("Tem certeza que deseja excluir? Assistentes que usam essa conexão vão falhar nas chamadas.")) {
                            deleteMutation.mutate(conn.id);
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConnections.map(conn => (
            <div key={conn.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEdit(conn)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => {
                    if (confirm("Tem certeza que deseja excluir? Assistentes que usam essa conexão vão falhar nas chamadas.")) {
                      deleteMutation.mutate(conn.id);
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-900">{conn.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-1 flex-1">{conn.description || "Nenhuma descrição fornecida."}</p>
              
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs font-semibold">
                <span className={`px-2 py-1 rounded bg-slate-100 text-slate-600`}>{conn.method}</span>
                <span className="text-slate-400 truncate max-w-[200px]">{conn.url}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingId ? "Editar Conexão" : "Nova Conexão"}</DialogTitle>
            <DialogDescription>Cadastre a API para que os assistentes possam consumi-la facilmente.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Ferramenta</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Consulta_Estoque_Bling" />
              </div>
              <div className="space-y-2">
                <Label>Descrição Curta</Label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Para que serve essa API?" />
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-4">
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={formData.method} onValueChange={v => setFormData({...formData, method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Endpoint (URL)</Label>
                <Input value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://api.exemplo.com/v1/..." />
              </div>
            </div>

            <div className="space-y-4 border p-4 rounded-xl bg-slate-50">
              <h4 className="font-bold text-sm">Autenticação</h4>
              <Select value={formData.authType} onValueChange={v => setFormData({...formData, authType: v})}>
                <SelectTrigger className="w-full bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="token">Bearer Token (API Key)</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="oauth2_password">OAuth2 (Password Flow)</SelectItem>
                </SelectContent>
              </Select>
              
              {formData.authType === "token" && (
                <div className="space-y-2">
                  <Label>Token</Label>
                  <Input value={formData.authConfig.token} onChange={e => setFormData({...formData, authConfig: {...formData.authConfig, token: e.target.value}})} className="bg-white" />
                </div>
              )}
              {formData.authType === "basic" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Input value={formData.authConfig.user} onChange={e => setFormData({...formData, authConfig: {...formData.authConfig, user: e.target.value}})} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input value={formData.authConfig.pass} onChange={e => setFormData({...formData, authConfig: {...formData.authConfig, pass: e.target.value}})} type="password" className="bg-white" />
                  </div>
                </div>
              )}
              {formData.authType === "oauth2_password" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Token URL (Endpoint de Autenticação)</Label>
                    <Input placeholder="https://exemplo.com/oauth/token" value={formData.authConfig.tokenUrl || ""} onChange={e => setFormData({...formData, authConfig: {...formData.authConfig, tokenUrl: e.target.value}})} className="bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={formData.authConfig.user} onChange={e => setFormData({...formData, authConfig: {...formData.authConfig, user: e.target.value}})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input value={formData.authConfig.pass} onChange={e => setFormData({...formData, authConfig: {...formData.authConfig, pass: e.target.value}})} type="password" className="bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {(formData.method === "POST" || formData.method === "PUT" || formData.method === "PATCH") && (
                <div className="space-y-2 mt-4 p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-indigo-900">Corpo Personalizado (JSON) - Opcional</Label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Se esta API exige um formato JSON complexo no envio, insira a estrutura aqui.
                    Use <strong className="text-indigo-600 font-mono">{"{{nome_do_parametro}}"}</strong> para injetar valores dinâmicos passados pela IA.<br/>
                    <em>Ex: {"{\"}mensagem{\": \"{{texto}}\", \"telefone\": \"{{numero}}\"}"}</em>. <br/>
                    Deixe em branco para usar o envio padrão.
                  </p>
                  <textarea 
                    value={formData.bodySchema || ""}
                    onChange={e => setFormData({...formData, bodySchema: e.target.value})}
                    placeholder={"{\n  \"mensagem\": \"{{texto}}\"\n}"}
                    className="w-full h-32 p-3 text-xs font-mono bg-slate-900 text-green-400 rounded-lg border-0 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">Parâmetros Esperados pela API</h4>
                <Button variant="outline" size="sm" onClick={() => setFormData({...formData, parameters: [...formData.parameters, { name: "", type: "string", description: "", required: true, testValue: "" }]})}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>
              {formData.parameters.map((param, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_2fr_1fr_90px_35px] gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Input placeholder="Nome (ex: id)" value={param.name} onChange={e => {
                    const newP = [...formData.parameters]; newP[index].name = e.target.value; setFormData({...formData, parameters: newP});
                  }} className="h-9 text-xs" />
                  <Select value={param.type} onValueChange={v => {
                    const newP = [...formData.parameters]; newP[index].type = v; setFormData({...formData, parameters: newP});
                  }}>
                    <SelectTrigger className="h-9 text-[11px] px-2"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="string">Texto</SelectItem><SelectItem value="number">Núm</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="Descrição para a IA" value={param.description} onChange={e => {
                    const newP = [...formData.parameters]; newP[index].description = e.target.value; setFormData({...formData, parameters: newP});
                  }} className="h-9 text-xs" />
                  <Input placeholder="V. Fixo/Teste" value={param.testValue || ""} onChange={e => {
                    const newP = [...formData.parameters]; newP[index].testValue = e.target.value; setFormData({...formData, parameters: newP});
                  }} className="h-9 text-[11px] border-indigo-200 focus-visible:ring-indigo-500" title="Se preenchido, será enviado como padrão caso a IA não envie este parâmetro (Útil para IDs fixos). Também usado no botão Testar." />
                  <Select value={param.required !== false ? "true" : "false"} onValueChange={v => {
                    const newP = [...formData.parameters]; newP[index].required = v === "true"; setFormData({...formData, parameters: newP});
                  }}>
                    <SelectTrigger className="h-9 text-[11px] px-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Obrigat.</SelectItem>
                      <SelectItem value="false">Opcional</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => {
                    const newP = [...formData.parameters]; newP.splice(index, 1); setFormData({...formData, parameters: newP});
                  }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border text-sm ${testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                <h4 className="font-bold flex items-center gap-2 mb-2">
                  {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  Resultado do Teste {testResult.status ? `(Status: ${testResult.status})` : ""}
                </h4>
                <div className="bg-white/60 p-2 rounded max-h-40 overflow-y-auto font-mono text-xs whitespace-pre-wrap">
                  {JSON.stringify(testResult.body || testResult.error, null, 2)}
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button 
                variant="secondary" 
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                onClick={() => testMutation.mutate(formData)} 
                disabled={!formData.url || testMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" /> {testMutation.isPending ? "Testando..." : "Testar Conexão"}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={() => mutation.mutate(formData)} disabled={!formData.name || !formData.url || mutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Salvar Conexão
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
