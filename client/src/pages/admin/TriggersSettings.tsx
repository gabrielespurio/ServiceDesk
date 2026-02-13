import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Trigger } from "@shared/schema";
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
import { Plus, Pencil, Trash2, Search, Zap, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TriggerBuilder from "@/components/TriggerBuilder";
import { Switch } from "@/components/ui/switch";

export default function TriggersSettings() {
    const { toast } = useToast();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: triggers, isLoading } = useQuery<Trigger[]>({
        queryKey: [api.triggers.list.path],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", buildUrl(api.triggers.delete.path, { id }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.triggers.list.path] });
            toast({ title: "Sucesso", description: "Gatilho excluído com sucesso" });
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
            await apiRequest("PATCH", buildUrl(api.triggers.update.path, { id }), { active });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.triggers.list.path] });
            toast({ title: "Sucesso", description: "Status atualizado" });
        }
    });

    const filteredTriggers = triggers?.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (isBuilderOpen) {
        return (
            <TriggerBuilder
                initialData={editingTrigger || undefined}
                onClose={() => {
                    setIsBuilderOpen(false);
                    setEditingTrigger(null);
                }}
                onSave={() => {
                    queryClient.invalidateQueries({ queryKey: [api.triggers.list.path] });
                    setIsBuilderOpen(false);
                    setEditingTrigger(null);
                }}
            />
        );
    }

    if (isLoading) return <div className="flex justify-center p-8">Carregando...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h3 className="text-lg font-semibold">Gatilhos e Automações</h3>
                    <p className="text-sm text-muted-foreground">Crie regras para automatizar ações em tickets.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsBuilderOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Novo Gatilho
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar gatilhos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead className="text-center">Condições</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                            <TableHead className="text-center">Ativo</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTriggers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    {searchTerm ? "Nenhum gatilho encontrado." : "Nenhum gatilho cadastrado."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTriggers.map((trigger) => {
                                const conditions = JSON.parse(trigger.conditions || "[]");
                                const actions = JSON.parse(trigger.actions || "[]");

                                return (
                                    <TableRow key={trigger.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{trigger.name}</span>
                                                <span className="text-xs text-muted-foreground">{trigger.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{trigger.event}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{conditions.length}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{actions.length}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={trigger.active}
                                                onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: trigger.id, active: checked })}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingTrigger(trigger); setIsBuilderOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(trigger.id)}>
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
