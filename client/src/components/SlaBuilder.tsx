import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type SlaPolicy, type InsertSlaPolicy, type Schedule } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, Save, Clock, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface SlaBuilderProps {
    initialData?: SlaPolicy;
    onClose: () => void;
    onSave: (policy?: SlaPolicy) => void;
}

interface Condition {
    id: string;
    field: string;
    operator: string;
    value: string;
}

export default function SlaBuilder({ initialData, onClose, onSave }: SlaBuilderProps) {
    const { toast } = useToast();
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [responseTime, setResponseTime] = useState<string>(initialData?.responseTime?.toString() || "");
    const [resolutionTime, setResolutionTime] = useState<string>(initialData?.resolutionTime?.toString() || "");
    const [isBusinessHours, setIsBusinessHours] = useState(initialData?.isBusinessHours || false);
    const [scheduleId, setScheduleId] = useState<string>(initialData?.scheduleId?.toString() || "");
    const [active, setActive] = useState(initialData?.active ?? true);

    const [conditions, setConditions] = useState<Condition[]>([]);

    useEffect(() => {
        if (initialData?.conditions) {
            try {
                const parsed = JSON.parse(initialData.conditions as string);
                setConditions(Array.isArray(parsed) ? parsed : (parsed.all || []));
            } catch (e) {
                console.error("Failed to parse conditions", e);
            }
        }
    }, [initialData]);

    const { data: forms } = useQuery<any[]>({ queryKey: [api.forms.list.path] });
    const { data: schedules } = useQuery<Schedule[]>({ queryKey: [api.schedules.list.path] });

    const saveMutation = useMutation({
        mutationFn: async (data: InsertSlaPolicy) => {
            const method = initialData ? "PATCH" : "POST";
            const url = initialData
                ? buildUrl(api.sla.update.path, { id: initialData.id })
                : api.sla.create.path;

            const res = await apiRequest(method, url, data);
            return res.json();
        },
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: [api.sla.list.path] });
            toast({ title: "Sucesso", description: "Política de SLA salva com sucesso" });
            onSave(saved);
            onClose();
        },
        onError: (error: Error) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    });

    const handleSubmit = () => {
        if (!name) {
            toast({ title: "Erro", description: "O nome da política é obrigatório", variant: "destructive" });
            return;
        }
        if (isBusinessHours && !scheduleId) {
            toast({ title: "Erro", description: "Selecione uma escala de trabalho", variant: "destructive" });
            return;
        }

        const payload: InsertSlaPolicy = {
            name,
            description,
            conditions: JSON.stringify(conditions),
            responseTime: responseTime ? parseInt(responseTime) : null,
            resolutionTime: resolutionTime ? parseInt(resolutionTime) : null,
            isBusinessHours,
            scheduleId: scheduleId ? parseInt(scheduleId) : null,
            active,
        };

        saveMutation.mutate(payload);
    };

    const addCondition = () => {
        setConditions([...conditions, { id: crypto.randomUUID(), field: "form", operator: "equals", value: "" }]);
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    const updateCondition = (index: number, updates: Partial<Condition>) => {
        const newConditions = [...conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        setConditions(newConditions);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50/50 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h3 className="font-semibold text-lg">{initialData ? "Editar Política de SLA" : "Nova Política de SLA"}</h3>
                        <p className="text-xs text-muted-foreground">Defina metas de tempo baseadas em condições.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-sm text-muted-foreground">{active ? "Ativa" : "Inativa"}</span>
                        <Switch checked={active} onCheckedChange={setActive} />
                    </div>
                    <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="gap-2">
                        <Save className="h-4 w-4" />
                        {saveMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Política</Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Ex: SLA TI - Prioridade Alta"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input 
                            id="description" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            placeholder="Breve descrição da aplicação desta regra"
                        />
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Conditions Section */}
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold flex items-center gap-2">
                            Condições de Aplicação
                            <Badge variant="secondary" className="font-normal">{conditions.length}</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">Esta política será aplicada se todas as condições abaixo forem atendidas.</p>
                    </div>

                    <div className="space-y-3">
                        {conditions.map((condition, index) => (
                            <div key={condition.id} className="flex items-center gap-2 group animate-in fade-in slide-in-from-top-1">
                                <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 flex-1">
                                    <Select value={condition.field} onValueChange={(val) => updateCondition(index, { field: val, value: "" })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="form">Formulário</SelectItem>
                                            <SelectItem value="priority">Prioridade</SelectItem>
                                            <SelectItem value="category">Categoria</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={condition.operator} onValueChange={(val) => updateCondition(index, { operator: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals">É igual a</SelectItem>
                                            <SelectItem value="not_equals">Não é igual a</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div>
                                        {condition.field === "form" ? (
                                            <Select value={condition.value} onValueChange={(val) => updateCondition(index, { value: val })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {forms?.map(f => (
                                                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : condition.field === "priority" ? (
                                            <Select value={condition.value} onValueChange={(val) => updateCondition(index, { value: val })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="baixa">Baixa</SelectItem>
                                                    <SelectItem value="media">Média</SelectItem>
                                                    <SelectItem value="alta">Alta</SelectItem>
                                                    <SelectItem value="critica">Crítica</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input 
                                                value={condition.value} 
                                                onChange={e => updateCondition(index, { value: e.target.value })}
                                                placeholder="Valor..."
                                            />
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeCondition(index)} className="text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addCondition} className="w-full border-dashed">
                            <Plus className="h-3 w-3 mr-2" /> Adicionar Condição
                        </Button>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Times and Calendar */}
                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold">Prazos e Calendário</h4>
                        <p className="text-sm text-muted-foreground">Configure os tempos alvo e como eles serão calculados.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Target Times */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    Tempo para Primeira Resposta (minutos)
                                </Label>
                                <Input 
                                    type="number" 
                                    value={responseTime} 
                                    onChange={e => setResponseTime(e.target.value)}
                                    placeholder="Ex: 60"
                                />
                                <p className="text-[10px] text-muted-foreground">Tempo máximo para o primeiro contato do agente.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    Tempo para Resolução (minutos)
                                </Label>
                                <Input 
                                    type="number" 
                                    value={resolutionTime} 
                                    onChange={e => setResolutionTime(e.target.value)}
                                    placeholder="Ex: 480"
                                />
                                <p className="text-[10px] text-muted-foreground">Tempo máximo para finalizar o ticket.</p>
                            </div>
                        </div>

                        {/* Calendar Config */}
                        <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Usar Escala de Trabalho</Label>
                                    <p className="text-xs text-muted-foreground">Considerar apenas o horário de expediente.</p>
                                </div>
                                <Switch checked={isBusinessHours} onCheckedChange={setIsBusinessHours} />
                            </div>

                            {isBusinessHours ? (
                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selecionar Escala</Label>
                                    <Select value={scheduleId} onValueChange={setScheduleId}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Escolha uma escala..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {schedules?.map(s => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            ))}
                                            {schedules?.length === 0 && (
                                                <SelectItem value="none" disabled>Nenhuma escala cadastrada</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {!schedules?.length && (
                                        <div className="flex items-start gap-2 text-[10px] text-orange-600 bg-orange-50 p-2 rounded-md border border-orange-100 mt-2">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            Você precisa cadastrar uma escala no módulo "Escala" antes de selecioná-la aqui.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                                    <Calendar className="h-5 w-5" />
                                    <p className="text-xs font-medium">Calculando em <strong>Dias Corridos</strong> (24 horas por dia, 7 dias por semana).</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
