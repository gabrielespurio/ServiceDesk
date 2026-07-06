import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Schedule, type InsertSchedule } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft, Save, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleBuilderProps {
    initialData?: Schedule;
    onClose: () => void;
    onSave: (schedule?: Schedule) => void;
}

interface Rule {
    day: number; // 0-6
    slots: { start: string, end: string }[];
}

const DAYS = [
    { id: 0, label: "Domingo" },
    { id: 1, label: "Segunda" },
    { id: 2, label: "Terça" },
    { id: 3, label: "Quarta" },
    { id: 4, label: "Quinta" },
    { id: 5, label: "Sexta" },
    { id: 6, label: "Sábado" },
];

export default function ScheduleBuilder({ initialData, onClose, onSave }: ScheduleBuilderProps) {
    const { toast } = useToast();
    const [name, setName] = useState(initialData?.name || "");
    const [timezone, setTimezone] = useState(initialData?.timezone || "America/Sao_Paulo");
    const [rules, setRules] = useState<Rule[]>(
        initialData?.rules ? JSON.parse(initialData.rules as string) : [
            { day: 1, slots: [{ start: "08:00", end: "18:00" }] },
            { day: 2, slots: [{ start: "08:00", end: "18:00" }] },
            { day: 3, slots: [{ start: "08:00", end: "18:00" }] },
            { day: 4, slots: [{ start: "08:00", end: "18:00" }] },
            { day: 5, slots: [{ start: "08:00", end: "18:00" }] },
        ]
    );

    const saveMutation = useMutation({
        mutationFn: async (data: InsertSchedule) => {
            const method = initialData ? "PATCH" : "POST";
            const url = initialData
                ? buildUrl(api.schedules.update.path, { id: initialData.id })
                : api.schedules.create.path;

            const res = await apiRequest(method, url, data);
            return res.json();
        },
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] });
            toast({ title: "Sucesso", description: "Escala salva com sucesso" });
            onSave(saved);
            onClose();
        },
        onError: (error: Error) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    });

    const handleSubmit = () => {
        if (!name) {
            toast({ title: "Erro", description: "O nome da escala é obrigatório", variant: "destructive" });
            return;
        }

        saveMutation.mutate({
            name,
            timezone,
            rules: JSON.stringify(rules),
        });
    };

    const toggleDay = (dayId: number) => {
        if (rules.some(r => r.day === dayId)) {
            setRules(rules.filter(r => r.day !== dayId));
        } else {
            setRules([...rules, { day: dayId, slots: [{ start: "08:00", end: "18:00" }] }].sort((a, b) => a.day - b.day));
        }
    };

    const updateSlot = (dayId: number, slotIndex: number, field: 'start' | 'end', value: string) => {
        setRules(rules.map(r => {
            if (r.day === dayId) {
                const newSlots = [...r.slots];
                newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
                return { ...r, slots: newSlots };
            }
            return r;
        }));
    };

    const addSlot = (dayId: number) => {
        setRules(rules.map(r => {
            if (r.day === dayId) {
                return { ...r, slots: [...r.slots, { start: "08:00", end: "18:00" }] };
            }
            return r;
        }));
    };

    const removeSlot = (dayId: number, slotIndex: number) => {
        setRules(rules.map(r => {
            if (r.day === dayId) {
                return { ...r, slots: r.slots.filter((_, i) => i !== slotIndex) };
            }
            return r;
        }).filter(r => r.slots.length > 0));
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50/50 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h3 className="font-semibold text-lg">{initialData ? "Editar Escala" : "Nova Escala"}</h3>
                        <p className="text-xs text-muted-foreground">Configure os horários de expediente.</p>
                    </div>
                </div>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Escala</Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Ex: Comercial 08-18h"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone">Fuso Horário</Label>
                        <Input 
                            id="timezone" 
                            value={timezone} 
                            onChange={e => setTimezone(e.target.value)} 
                            placeholder="Ex: America/Sao_Paulo"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-base font-semibold">Configuração dos Dias</Label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map(day => (
                            <Button
                                key={day.id}
                                variant={rules.some(r => r.day === day.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleDay(day.id)}
                                className="rounded-full"
                            >
                                {day.label}
                            </Button>
                        ))}
                    </div>

                    <div className="grid gap-3 mt-6">
                        {rules.map(rule => (
                            <div key={rule.day} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border bg-gray-50/50">
                                <div className="w-24 font-semibold text-sm">
                                    {DAYS.find(d => d.id === rule.day)?.label}
                                </div>
                                <div className="flex-1 space-y-2">
                                    {rule.slots.map((slot, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                                <Input 
                                                    type="time" 
                                                    value={slot.start} 
                                                    onChange={e => updateSlot(rule.day, index, 'start', e.target.value)}
                                                    className="border-0 h-8 w-24 p-0 px-2 shadow-none focus-visible:ring-0"
                                                />
                                                <span className="text-muted-foreground text-xs font-bold px-1">ATÉ</span>
                                                <Input 
                                                    type="time" 
                                                    value={slot.end} 
                                                    onChange={e => updateSlot(rule.day, index, 'end', e.target.value)}
                                                    className="border-0 h-8 w-24 p-0 px-2 shadow-none focus-visible:ring-0"
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeSlot(rule.day, index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={() => addSlot(rule.day)} className="text-xs h-8 text-primary hover:bg-primary/5">
                                        <Plus className="h-3 w-3 mr-1" /> Adicionar intervalo
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
