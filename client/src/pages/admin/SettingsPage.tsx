import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FileText,
  Zap,
  ListOrdered,
  Users,
  Calendar,
  Clock,
  GitBranch,
  UserCog,
  MessageSquare,
  ChevronRight,
  Plus,
  Trash2,
  Settings,
  X,
  ChevronLeft,
  Search,
  ChevronLeftIcon,
  ChevronRightIcon,
  Pencil,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Form, type Team, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import FormBuilder from "@/components/FormBuilder";
import UserManagement from "./UserManagement";
import TriggersSettings from "./TriggersSettings";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ITEMS_PER_PAGE = 10;

const SETTINGS_SECTIONS = [
  { id: "forms", label: "Formulários", icon: FileText },
  { id: "automations", label: "Gatilhos ou Automações", icon: Zap },
  { id: "queues", label: "Filas de atendimento", icon: ListOrdered },
  { id: "teams", label: "Equipes", icon: Users },
  { id: "roster", label: "Escala", icon: Calendar },
  { id: "sla", label: "SLA", icon: Clock },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "users", label: "Gerenciamento de usuários", icon: UserCog },
  { id: "templates", label: "Templates de respostas", icon: MessageSquare },
];

function TeamsSettings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const { data: teams, isLoading: isLoadingTeams } = useQuery<any[]>({
    queryKey: [api.teams.list.path],
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: [api.users.list.path],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = editingTeam ? "PATCH" : "POST";
      const url = editingTeam
        ? buildUrl(api.teams.update.path, { id: editingTeam.id })
        : api.teams.create.path;

      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.teams.list.path] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Sucesso", description: "Equipe salva com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.teams.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.teams.list.path] });
      toast({ title: "Sucesso", description: "Equipe excluída com sucesso" });
    },
  });

  const resetForm = () => {
    setEditingTeam(null);
    setName("");
    setDescription("");
    setSelectedUserIds([]);
  };

  const handleEdit = (team: any) => {
    setEditingTeam(team);
    setName(team.name);
    setDescription(team.description || "");
    setSelectedUserIds(team.members.map((m: any) => m.userId));
    setIsDialogOpen(true);
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!searchTerm) return teams;
    const lower = searchTerm.toLowerCase();
    return teams.filter((t: any) =>
      t.name.toLowerCase().includes(lower) ||
      (t.description || "").toLowerCase().includes(lower)
    );
  }, [teams, searchTerm]);

  const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoadingTeams || isLoadingUsers) return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Equipes</h3>
          <p className="text-sm text-muted-foreground">Gerencie as equipes de atendimento.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-new-team">
              <Plus className="h-4 w-4" />
              Nova Equipe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {editingTeam ? "Editar Equipe" : "Nova Equipe"}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Preencha os dados da equipe para {editingTeam ? "atualizar" : "cadastrar"} no sistema.
              </p>
            </DialogHeader>
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome da Equipe</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Suporte N1" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-team-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição da equipe" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-team-description" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Membros da Equipe</Label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50/50">
                  {users?.length === 0 && <p className="text-sm text-gray-400 text-center py-2">Nenhum usuário disponível</p>}
                  {users?.map(user => (
                    <div key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white transition-colors">
                      <Checkbox id={`user-${user.id}`} checked={selectedUserIds.includes(user.id)} onCheckedChange={() => toggleUser(user.id)} className="border-gray-300" data-testid={`checkbox-team-member-${user.id}`} />
                      <Label htmlFor={`user-${user.id}`} className="text-sm font-normal cursor-pointer text-gray-700 flex-1">{user.fullName} <span className="text-gray-400">({user.username})</span></Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-11 rounded-lg border-gray-200" data-testid="button-cancel-team">Cancelar</Button>
              <Button onClick={() => saveMutation.mutate({ name, description, memberUserIds: selectedUserIds })} disabled={saveMutation.isPending || !name} className="flex-1 h-11 rounded-lg" data-testid="button-save-team">{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar equipes..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="pl-10"
          data-testid="input-search-teams"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Membros</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {searchTerm ? "Nenhuma equipe encontrada." : "Nenhuma equipe cadastrada."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTeams.map((team: any) => (
                <TableRow key={team.id} data-testid={`row-team-${team.id}`}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="text-muted-foreground">{team.description || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{team.members.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(team)} data-testid={`button-edit-team-${team.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(team.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-team-${team.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTeams.length)} de {filteredTeams.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-teams">
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-teams">
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QueuesSettings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const { data: queues, isLoading: isLoadingQueues } = useQuery<any[]>({
    queryKey: [api.queues.list.path],
  });

  const { data: teams, isLoading: isLoadingTeams } = useQuery<any[]>({
    queryKey: [api.teams.list.path],
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: [api.users.list.path],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = editingQueue ? "PATCH" : "POST";
      const url = editingQueue
        ? buildUrl(api.queues.update.path, { id: editingQueue.id })
        : api.queues.create.path;

      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queues.list.path] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Sucesso", description: "Fila salva com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.queues.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.queues.list.path] });
      toast({ title: "Sucesso", description: "Fila excluída com sucesso" });
    },
  });

  const resetForm = () => {
    setEditingQueue(null);
    setName("");
    setDescription("");
    setSelectedTeamIds([]);
    setSelectedUserIds([]);
  };

  const handleEdit = (queue: any) => {
    setEditingQueue(queue);
    setName(queue.name);
    setDescription(queue.description || "");
    setSelectedTeamIds(queue.teams?.map((t: any) => t.id) || []);
    setSelectedUserIds(queue.users?.map((u: any) => u.id) || []);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      name,
      description,
      teamIds: selectedTeamIds,
      userIds: selectedUserIds,
      active: true,
    });
  };

  const getAssignmentLabel = (queue: any) => {
    const teamCount = queue.teams?.length || 0;
    const userCount = queue.users?.length || 0;

    if (teamCount === 0 && userCount === 0) return "Não atribuída";

    const parts = [];
    if (teamCount > 0) parts.push(`${teamCount} ${teamCount === 1 ? 'equipe' : 'equipes'}`);
    if (userCount > 0) parts.push(`${userCount} ${userCount === 1 ? 'usuário' : 'usuários'}`);

    return `Atribuída a: ${parts.join(" e ")}`;
  };

  const toggleTeam = (teamId: number) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredQueues = useMemo(() => {
    if (!queues) return [];
    if (!searchTerm) return queues;
    const lower = searchTerm.toLowerCase();
    return queues.filter((q: any) =>
      q.name.toLowerCase().includes(lower) ||
      (q.description || "").toLowerCase().includes(lower)
    );
  }, [queues, searchTerm]);

  const totalPages = Math.ceil(filteredQueues.length / ITEMS_PER_PAGE);
  const paginatedQueues = filteredQueues.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoadingQueues || isLoadingTeams || isLoadingUsers) return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Filas de Atendimento</h3>
          <p className="text-sm text-muted-foreground">Gerencie as filas e defina quem terá acesso a cada uma.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-new-queue">
              <Plus className="h-4 w-4" />
              Nova Fila
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {editingQueue ? "Editar Fila" : "Nova Fila"}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Preencha os dados da fila e defina quem terá acesso.</p>
            </DialogHeader>
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="queue-name" className="text-sm font-medium text-gray-700">Nome da Fila</Label>
                <Input id="queue-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Suporte Técnico N1" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-queue-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="queue-description" className="text-sm font-medium text-gray-700">Descrição <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input id="queue-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição da fila" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-queue-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Equipes</Label>
                  <div className="border border-gray-200 rounded-lg p-3 h-[200px] overflow-y-auto space-y-2 bg-gray-50/50">
                    {teams?.map(team => (
                      <div key={team.id} className="flex items-center space-x-2">
                        <Checkbox id={`qteam-${team.id}`} checked={selectedTeamIds.includes(team.id)} onCheckedChange={() => toggleTeam(team.id)} />
                        <Label htmlFor={`qteam-${team.id}`} className="text-xs font-normal cursor-pointer flex-1 truncate">{team.name}</Label>
                      </div>
                    ))}
                    {teams?.length === 0 && <p className="text-xs text-gray-400">Nenhuma equipe</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Usuários</Label>
                  <div className="border border-gray-200 rounded-lg p-3 h-[200px] overflow-y-auto space-y-2 bg-gray-50/50">
                    {users?.map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox id={`quser-${user.id}`} checked={selectedUserIds.includes(user.id)} onCheckedChange={() => toggleUser(user.id)} />
                        <Label htmlFor={`quser-${user.id}`} className="text-xs font-normal cursor-pointer flex-1 truncate">{user.fullName}</Label>
                      </div>
                    ))}
                    {users?.length === 0 && <p className="text-xs text-gray-400">Nenhum usuário</p>}
                  </div>
                </div>
              </div>
              {(selectedTeamIds.length > 0 || selectedUserIds.length > 0) && (
                <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <Label className="text-xs font-semibold text-primary uppercase tracking-wider">Acesso concedido a:</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTeamIds.map(id => {
                      const team = teams?.find(t => t.id === id);
                      return team ? (
                        <Badge key={`bteam-${id}`} variant="secondary" className="bg-white text-gray-700 border-gray-200 pr-1 py-0.5">
                          {team.name}
                          <button onClick={() => toggleTeam(id)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ) : null;
                    })}
                    {selectedUserIds.map(id => {
                      const user = users?.find(u => u.id === id);
                      return user ? (
                        <Badge key={`buser-${id}`} variant="secondary" className="bg-white text-gray-700 border-gray-200 pr-1 py-0.5">
                          {user.fullName}
                          <button onClick={() => toggleUser(id)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-11 rounded-lg border-gray-200" data-testid="button-cancel-queue">Cancelar</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending || !name || (selectedTeamIds.length === 0 && selectedUserIds.length === 0)} className="flex-1 h-11 rounded-lg" data-testid="button-save-queue">{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar filas..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="pl-10"
          data-testid="input-search-queues"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Atribuição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQueues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {searchTerm ? "Nenhuma fila encontrada." : "Nenhuma fila cadastrada."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedQueues.map((queue: any) => (
                <TableRow key={queue.id} data-testid={`row-queue-${queue.id}`}>
                  <TableCell className="font-medium">{queue.name}</TableCell>
                  <TableCell className="text-muted-foreground">{queue.description || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getAssignmentLabel(queue)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(queue)} data-testid={`button-edit-queue-${queue.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(queue.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-queue-${queue.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredQueues.length)} de {filteredQueues.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-queues">
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-queues">
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormsSettings() {
  const { toast } = useToast();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);

  const { data: forms, isLoading } = useQuery<Form[]>({
    queryKey: [api.forms.list.path],
  });

  const createFormMutation = useMutation({
    mutationFn: async (form: any) => {
      const res = await apiRequest("POST", api.forms.create.path, {
        ...form,
        active: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.forms.list.path] });
      setIsBuilderOpen(false);
      setEditingForm(null);
      toast({ title: "Sucesso", description: "Formulário salvo com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.forms.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.forms.list.path] });
      toast({ title: "Sucesso", description: "Formulário excluído com sucesso" });
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredForms = useMemo(() => {
    if (!forms) return [];
    if (!searchTerm) return forms;
    const lower = searchTerm.toLowerCase();
    return forms.filter((f) =>
      f.name.toLowerCase().includes(lower) ||
      (f.description || "").toLowerCase().includes(lower)
    );
  }, [forms, searchTerm]);

  const totalPages = Math.ceil(filteredForms.length / ITEMS_PER_PAGE);
  const paginatedForms = filteredForms.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;

  if (isBuilderOpen) {
    const builderData = editingForm ? {
      name: editingForm.name,
      description: editingForm.description || "",
      fields: editingForm.fields,
    } : undefined;

    return (
      <FormBuilder
        initialData={builderData}
        onSave={(data) => createFormMutation.mutate(data)}
        onCancel={() => {
          setIsBuilderOpen(false);
          setEditingForm(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Lista de Formulários</h3>
          <p className="text-sm text-muted-foreground">Gerencie os formulários disponíveis para seus clientes.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsBuilderOpen(true)} data-testid="button-new-form">
          <Plus className="h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar formulários..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="pl-10"
          data-testid="input-search-forms"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Campos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedForms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {searchTerm ? "Nenhum formulário encontrado." : "Nenhum formulário cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedForms.map((form) => (
                <TableRow key={form.id} data-testid={`row-form-${form.id}`}>
                  <TableCell className="font-medium">{form.name}</TableCell>
                  <TableCell className="text-muted-foreground">{form.description || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{Array.isArray(form.fields) ? form.fields.length : 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingForm(form); setIsBuilderOpen(true); }} data-testid={`button-edit-form-${form.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFormMutation.mutate(form.id)} disabled={deleteFormMutation.isPending} data-testid={`button-delete-form-${form.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredForms.length)} de {filteredForms.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-forms">
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-forms">
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("forms");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  console.log("Current activeSection:", activeSection, "Length:", activeSection.length);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
        {/* Settings Navigation */}
        <aside className={`${isSidebarCollapsed ? "w-16" : "w-full md:w-64"} shrink-0 transition-all duration-300 ease-in-out`}>
          <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border overflow-hidden p-2">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="flex items-center justify-center p-2 mb-4 hover:bg-muted rounded-md transition-colors text-muted-foreground"
              title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
            <nav className="flex flex-col space-y-1 overflow-y-auto overflow-x-hidden">
              {SETTINGS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  title={isSidebarCollapsed ? section.label : ""}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all ${activeSection === section.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                >
                  <section.icon className={`shrink-0 ${isSidebarCollapsed ? "h-5 w-5" : "h-4 w-4"}`} />
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{section.label}</span>
                      {activeSection === section.id && <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Settings Content */}
        <main className="flex-1 min-h-0">
          <Card className="border-none shadow-none bg-muted/30 h-full overflow-hidden">
            <CardContent className="p-6 h-full flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                {activeSection === "forms" ? (
                  <FormsSettings />
                ) : activeSection === "users" ? (
                  <UserManagement />
                ) : activeSection === "teams" ? (
                  <TeamsSettings />
                ) : activeSection === "queues" ? (
                  <QueuesSettings />
                ) : activeSection === "automations" ? (
                  <TriggersSettings />
                ) : (
                  <div className="h-full p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2 opacity-60">
                    <p className="text-lg font-medium">Módulo em desenvolvimento</p>
                    <p className="text-sm text-muted-foreground">
                      A configuração de {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label.toLowerCase()} estará disponível em breve.
                      (Debug: activeSection='{activeSection}')
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
