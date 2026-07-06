import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type SlaPolicy, type Schedule } from "@shared/schema";
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
import { Plus, Pencil, Trash2, Search, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import SlaBuilder from "@/components/SlaBuilder";

export default function SlaSettings() {
    const { toast } = useToast();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: policies, isLoading } = useQuery<SlaPolicy[]>({
        queryKey: [api.sla.list.path],
    });

    const { data: schedules } = useQuery<Schedule[]>({
        queryKey: [api.schedules.list.path],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", buildUrl(api.sla.delete.path, { id }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.sla.list.path] });
            toast({ title: "Sucesso", description: "Política de SLA excluída com sucesso" });
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
            await apiRequest("PATCH", buildUrl(api.sla.update.path, { id }), { active });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.sla.list.path] });
            toast({ title: "Sucesso", description: "Status atualizado" });
        }
    });

    const filteredPolicies = policies?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (isBuilderOpen) {
        return (
            <SlaBuilder
                initialData={editingPolicy || undefined}
                onClose={() => {
                    setIsBuilderOpen(false);
                    setEditingPolicy(null);
                }}
                onSave={() => {
                    queryClient.invalidateQueries({ queryKey: [api.sla.list.path] });
                    setIsBuilderOpen(false);
                    setEditingPolicy(null);
                }}
            />
        );
    }

    if (isLoading) return <div className="flex justify-center p-8 text-muted-foreground">Carregando políticas...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h3 className="text-lg font-semibold">Configurações de SLA</h3>
                    <p className="text-sm text-muted-foreground">Defina prazos de atendimento e resolução baseados em condições.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsBuilderOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Nova Regra de SLA
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar políticas..."
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
                            <TableHead className="text-center font-semibold">Tempo Resposta</TableHead>
                            <TableHead className="text-center font-semibold">Tempo Resolução</TableHead>
                            <TableHead className="text-center font-semibold">Calendário</TableHead>
                            <TableHead className="text-center font-semibold">Status</TableHead>
                            <TableHead className="text-right font-semibold">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPolicies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    {searchTerm ? "Nenhuma política encontrada." : "Nenhuma política de SLA cadastrada."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPolicies.map((policy) => {
                                const schedule = schedules?.find(s => s.id === policy.scheduleId);
                                
                                return (
                                    <TableRow key={policy.id} className="group">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{policy.name}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">{policy.description || "Sem descrição"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Clock className="h-3 w-3 text-blue-500" />
                                                <span className="text-sm">{policy.responseTime ? `${policy.responseTime} min` : "—"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Clock className="h-3 w-3 text-orange-500" />
                                                <span className="text-sm">{policy.resolutionTime ? `${policy.resolutionTime} min` : "—"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {policy.isBusinessHours ? (
                                                    <Badge variant="secondary" className="font-normal gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {schedule?.name || "Escala de Trabalho"}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="font-normal">Dias Corridos (24/7)</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={policy.active}
                                                onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: policy.id, active: checked })}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingPolicy(policy); setIsBuilderOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(policy.id)}>
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
