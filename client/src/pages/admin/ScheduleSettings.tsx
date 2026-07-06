import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Schedule } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ScheduleBuilder from "@/components/ScheduleBuilder";

export default function ScheduleSettings() {
    const { toast } = useToast();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: schedules, isLoading } = useQuery<Schedule[]>({
        queryKey: [api.schedules.list.path],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", buildUrl(api.schedules.delete.path, { id }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] });
            toast({ title: "Sucesso", description: "Escala excluída com sucesso" });
        },
    });

    const filteredSchedules = schedules?.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (isBuilderOpen) {
        return (
            <ScheduleBuilder
                initialData={editingSchedule || undefined}
                onClose={() => {
                    setIsBuilderOpen(false);
                    setEditingSchedule(null);
                }}
                onSave={() => {
                    queryClient.invalidateQueries({ queryKey: [api.schedules.list.path] });
                    setIsBuilderOpen(false);
                    setEditingSchedule(null);
                }}
            />
        );
    }

    if (isLoading) return <div className="flex justify-center p-8 text-muted-foreground">Carregando escalas...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h3 className="text-lg font-semibold">Escalas de Trabalho</h3>
                    <p className="text-sm text-muted-foreground">Configure os horários de atendimento para cálculos de SLA.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsBuilderOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Nova Escala
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar escalas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="font-semibold">Nome</TableHead>
                            <TableHead className="font-semibold">Fuso Horário</TableHead>
                            <TableHead className="text-center font-semibold">Regras</TableHead>
                            <TableHead className="text-right font-semibold">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSchedules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {searchTerm ? "Nenhuma escala encontrada." : "Nenhuma escala cadastrada."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSchedules.map((schedule) => {
                                const rules = JSON.parse(schedule.rules || "[]");
                                
                                return (
                                    <TableRow key={schedule.id} className="group">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-primary" />
                                                <span className="font-medium text-gray-900">{schedule.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {schedule.timezone}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-normal">
                                                {rules.length} {rules.length === 1 ? "dia" : "dias"} configurados
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingSchedule(schedule); setIsBuilderOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(schedule.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
