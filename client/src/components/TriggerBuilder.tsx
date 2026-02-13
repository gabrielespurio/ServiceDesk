import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Trigger, type InsertTrigger } from "@shared/schema";
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
import { Plus, Trash2, ArrowLeft, Save, Zap, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TriggerBuilderProps {
    initialData?: Trigger;
    onClose: () => void;
    onSave: (trigger?: Trigger) => void;
}

interface Condition {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface Action {
    id: string;
    type: string;
    value: string;
}

export default function TriggerBuilder({ initialData, onClose, onSave }: TriggerBuilderProps) {
    const { toast } = useToast();
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");

    // Split conditions into 'all' (AND) and 'any' (OR)
    const [conditionsAll, setConditionsAll] = useState<Condition[]>([]);
    const [conditionsAny, setConditionsAny] = useState<Condition[]>([]);

    const [actions, setActions] = useState<Action[]>(
        initialData?.actions ? JSON.parse(initialData.actions as string) : []
    );

    // Initialize conditions from JSON
    useEffect(() => {
        if (initialData?.conditions) {
            try {
                const parsed = JSON.parse(initialData.conditions as string);
                if (Array.isArray(parsed)) {
                    // Legacy format: treat as 'all'
                    setConditionsAll(parsed);
                } else {
                    // New format: { all: [], any: [] }
                    setConditionsAll(parsed.all || []);
                    setConditionsAny(parsed.any || []);
                }
            } catch (e) {
                console.error("Failed to parse conditions", e);
            }
        }
    }, [initialData]);

    const { data: queues } = useQuery<any[]>({ queryKey: [api.queues.list.path] });
    const { data: users } = useQuery<any[]>({ queryKey: [api.users.list.path] });
    const { data: forms } = useQuery<any[]>({ queryKey: [api.forms.list.path] });

    // Filter potential resolvers (users with access)
    const resolvers = users;

    const saveMutation = useMutation({
        mutationFn: async (data: InsertTrigger) => {
            const method = initialData ? "PATCH" : "POST";
            const url = initialData
                ? buildUrl(api.triggers.update.path, { id: initialData.id })
                : api.triggers.create.path;

            const res = await apiRequest(method, url, data);
            return res.json();
        },
        onSuccess: (savedTrigger) => {
            queryClient.invalidateQueries({ queryKey: [api.triggers.list.path] });
            toast({ title: "Sucesso", description: "Gatilho salvo com sucesso" });
            onSave(savedTrigger);
            onClose();
        },
        onError: (error: Error) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    });

    const getPayload = () => {
        // Pack conditions into { all: [], any: [] }
        const conditionsPayload = JSON.stringify({
            all: conditionsAll,
            any: conditionsAny
        });

        // Determine event from "Ticket" condition if present
        let inferredEvent = "ticket.updated"; // Default
        const allConditions = [...conditionsAll, ...conditionsAny];
        const ticketCondition = allConditions.find(c => c.field === "ticket_event");

        if (ticketCondition) {
            if (ticketCondition.value === "created") inferredEvent = "ticket.created";
            else if (ticketCondition.value === "updated") inferredEvent = "ticket.updated";
            else if (ticketCondition.value === "any") inferredEvent = "ticket.any";
        }

        return {
            name,
            description,
            event: inferredEvent,
            conditions: conditionsPayload,
            actions: JSON.stringify(actions),
            active: initialData?.active ?? true,
        };
    };

    const handleSubmit = () => {
        if (!name) {
            toast({ title: "Erro", description: "O nome do gatilho é obrigatório", variant: "destructive" });
            return;
        }
        if (conditionsAll.length === 0 && conditionsAny.length === 0) {
            toast({ title: "Erro", description: "Adicione pelo menos uma condição", variant: "destructive" });
            return;
        }
        if (actions.length === 0) {
            toast({ title: "Erro", description: "Adicione pelo menos uma ação", variant: "destructive" });
            return;
        }
        saveMutation.mutate(getPayload());
    };

    // Helper for adding/removing/updating - Generic for All/Any lists
    const addCondition = (type: 'all' | 'any') => {
        const newCondition: Condition = { id: crypto.randomUUID(), field: "status", operator: "equals", value: "" };
        if (type === 'all') setConditionsAll([...conditionsAll, newCondition]);
        else setConditionsAny([...conditionsAny, newCondition]);
    };

    const removeCondition = (type: 'all' | 'any', index: number) => {
        if (type === 'all') setConditionsAll(conditionsAll.filter((_, i) => i !== index));
        else setConditionsAny(conditionsAny.filter((_, i) => i !== index));
    };

    const updateCondition = (type: 'all' | 'any', index: number, updates: Partial<Condition>) => {
        if (type === 'all') {
            const newConditions = [...conditionsAll];
            newConditions[index] = { ...newConditions[index], ...updates };
            setConditionsAll(newConditions);
        } else {
            const newConditions = [...conditionsAny];
            newConditions[index] = { ...newConditions[index], ...updates };
            setConditionsAny(newConditions);
        }
    };

    const addAction = () => {
        setActions([...actions, { id: crypto.randomUUID(), type: "assign_queue", value: "" }]);
    };

    const removeAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index));
    };

    const updateAction = (index: number, updates: Partial<Action>) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], ...updates };
        setActions(newActions);
    };

    const renderConditionItem = (condition: Condition, index: number, type: 'all' | 'any') => (
        <div key={condition.id} className="flex items-center gap-2 p-0 animate-in fade-in slide-in-from-top-1">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 flex-1 items-center">
                <Select value={condition.field} onValueChange={(val) => updateCondition(type, index, { field: val, value: "" })}>
                    <SelectTrigger className="bg-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ticket_event">Ticket</SelectItem>
                        <SelectItem value="priority">Prioridade</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="queue">Fila</SelectItem>
                        <SelectItem value="form">Formulário</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={condition.operator} onValueChange={(val) => updateCondition(type, index, { operator: val })}>
                    <SelectTrigger className="bg-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="equals">É igual a</SelectItem>
                        <SelectItem value="not_equals">Não é igual a</SelectItem>
                    </SelectContent>
                </Select>

                {/* Value Input depends on field type */}
                <div className="flex-1">
                    {condition.field === "ticket_event" && (
                        <Select value={condition.value} onValueChange={(val) => updateCondition(type, index, { value: val })}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="created">Criado</SelectItem>
                                <SelectItem value="updated">Atualizado</SelectItem>
                                <SelectItem value="any">Criado ou Atualizado</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {condition.field === "priority" && (
                        <Select value={condition.value} onValueChange={(val) => updateCondition(type, index, { value: val })}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="baixa">Baixa</SelectItem>
                                <SelectItem value="media">Média</SelectItem>
                                <SelectItem value="alta">Alta</SelectItem>
                                <SelectItem value="critica">Crítica</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {condition.field === "status" && (
                        <Select value={condition.value} onValueChange={(val) => updateCondition(type, index, { value: val })}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aberto">Aberto</SelectItem>
                                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                <SelectItem value="aguardando_usuario">Aguardando Usuário</SelectItem>
                                <SelectItem value="resolvido">Resolvido</SelectItem>
                                <SelectItem value="fechado">Fechado</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {condition.field === "queue" && (
                        <Select value={condition.value} onValueChange={(val) => updateCondition(type, index, { value: val })}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {queues?.map(q => (
                                    <SelectItem key={q.id} value={String(q.id)}>{q.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {condition.field === "form" && (
                        <Select value={condition.value} onValueChange={(val) => updateCondition(type, index, { value: val })}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {forms?.map(f => (
                                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {/* Fallback input for unexpected fields */}
                    {!["ticket_event", "priority", "status", "queue", "form"].includes(condition.field) && (
                        <Input className="bg-white" value={condition.value} onChange={(e) => updateCondition(type, index, { value: e.target.value })} />
                    )}
                </div>

                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(type, index)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-6 bg-gray-50/30 p-1">
            <div className="flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 border-b -mx-1 -mt-1 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h3 className="text-lg font-semibold">{initialData ? "Editar Gatilho" : "Novo Gatilho"}</h3>
                        <p className="text-sm text-muted-foreground opacity-0 hidden sm:block sm:opacity-100 transition-opacity">Automação de processos</p>
                    </div>
                </div>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="gap-2 shadow-sm">
                    <Save className="h-4 w-4" />
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-8">

                {/* 1. Basic Info */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-base font-medium">Nome do Gatilho</Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Priorizar Tickets VIP"
                            className="text-lg font-medium bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50 shadow-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Descreva o objetivo desta automação"
                            className="resize-none bg-white border-gray-200"
                        />
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* 2. Conditions */}
                <div className="space-y-6">
                    <div>
                        <h4 className="text-lg font-medium mb-1">Condições</h4>
                        <p className="text-sm text-muted-foreground">Defina as regras para execução deste gatilho.</p>
                    </div>

                    {/* Match ALL */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="font-medium text-gray-700">Atende TODAS as condições a seguir:</Label>
                        </div>
                        <div className="space-y-2 ml-1 border-l-2 border-primary/20 pl-4 py-1">
                            {conditionsAll.map((c, i) => renderConditionItem(c, i, 'all'))}
                            <Button variant="outline" size="sm" onClick={() => addCondition('all')} className="mt-2 text-primary border-primary/20 hover:bg-primary/5">
                                <Plus className="h-3 w-3 mr-1" /> Adicionar condição
                            </Button>
                        </div>
                    </div>

                    {/* Match ANY */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="font-medium text-gray-700">Atende QUALQUER condição a seguir:</Label>
                        </div>
                        <div className="space-y-2 ml-1 border-l-2 border-orange-200 pl-4 py-1">
                            {conditionsAny.map((c, i) => renderConditionItem(c, i, 'any'))}
                            <Button variant="outline" size="sm" onClick={() => addCondition('any')} className="mt-2 text-primary border-primary/20 hover:bg-primary/5">
                                <Plus className="h-3 w-3 mr-1" /> Adicionar condição
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* 3. Actions */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-medium mb-1">Ações</h4>
                            <p className="text-sm text-muted-foreground">O que deve acontecer quando as condições forem atendidas.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {actions.map((action, index) => (
                            <div key={action.id} className="flex items-center gap-2 p-0 animate-in fade-in slide-in-from-bottom-1">
                                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 flex-1 items-center bg-white border rounded-lg p-3 shadow-sm">
                                    <span className="text-xs font-bold text-white bg-primary px-2 py-1 rounded">ENTÃO</span>

                                    <Select value={action.type} onValueChange={(val) => updateAction(index, { type: val, value: "" })}>
                                        <SelectTrigger className="border-0 shadow-none focus:ring-0 font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="assign_queue">Atribuir a Fila</SelectItem>
                                            <SelectItem value="assign_resolver">Atribuir a Resolvedor</SelectItem>
                                            <SelectItem value="set_priority">Alterar Prioridade</SelectItem>
                                            <SelectItem value="set_status">Alterar Status</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="flex-1">
                                        {action.type === "assign_queue" && (
                                            <Select value={action.value} onValueChange={(val) => updateAction(index, { value: val })}>
                                                <SelectTrigger className="bg-gray-50 border-0 h-9">
                                                    <SelectValue placeholder="Selecione a fila" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {queues?.map(q => (
                                                        <SelectItem key={q.id} value={String(q.id)}>{q.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {action.type === "assign_resolver" && (
                                            <Select value={action.value} onValueChange={(val) => updateAction(index, { value: val })}>
                                                <SelectTrigger className="bg-gray-50 border-0 h-9">
                                                    <SelectValue placeholder="Selecione o resolvedor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {resolvers?.map(r => (
                                                        <SelectItem key={r.id} value={String(r.id)}>{r.fullName}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {action.type === "set_priority" && (
                                            <Select value={action.value} onValueChange={(val) => updateAction(index, { value: val })}>
                                                <SelectTrigger className="bg-gray-50 border-0 h-9">
                                                    <SelectValue placeholder="Selecione a prioridade" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="baixa">Baixa</SelectItem>
                                                    <SelectItem value="media">Média</SelectItem>
                                                    <SelectItem value="alta">Alta</SelectItem>
                                                    <SelectItem value="critica">Crítica</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {action.type === "set_status" && (
                                            <Select value={action.value} onValueChange={(val) => updateAction(index, { value: val })}>
                                                <SelectTrigger className="bg-gray-50 border-0 h-9">
                                                    <SelectValue placeholder="Selecione o status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="aberto">Aberto</SelectItem>
                                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                                    <SelectItem value="aguardando_usuario">Aguardando Usuário</SelectItem>
                                                    <SelectItem value="resolvido">Resolvido</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeAction(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addAction} className="w-full border-dashed text-muted-foreground hover:bg-muted/50 mt-2">
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Ação
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
