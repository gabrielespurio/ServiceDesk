import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type User, insertUserSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const ITEMS_PER_PAGE = 10;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  resolver: "Resolvedor",
  user: "Usuário Final",
};

export default function UserManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: [api.users.list.path],
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema.extend({
      password: editingUser ? insertUserSchema.shape.password.optional() : insertUserSchema.shape.password,
    })),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "user",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = editingUser
        ? buildUrl(api.users.update.path, { id: editingUser.id })
        : api.users.create.path;
      const method = editingUser ? "PATCH" : "POST";

      const res = await apiRequest(method, endpoint, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao salvar usuário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ title: "Sucesso", description: "Usuário salvo com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.users.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Sucesso", description: "Usuário excluído com sucesso" });
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role as any,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter((u) =>
      u.fullName.toLowerCase().includes(lower) ||
      u.username.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower) ||
      u.role.toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Gerenciamento de Usuários</h3>
          <p className="text-sm text-muted-foreground">Cadastre e gerencie os usuários do sistema.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingUser(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-new-user">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Preencha os dados do usuário para {editingUser ? "atualizar" : "cadastrar"} no sistema.
              </p>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="px-6 py-5 space-y-5">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João da Silva" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-user-fullname" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario.login" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-user-username" {...field} disabled={!!editingUser} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-user-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Senha {editingUser && <span className="text-gray-400 font-normal">(opcional)</span>}
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="input-user-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Perfil</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg" data-testid="select-user-role">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="resolver">Resolvedor</SelectItem>
                            <SelectItem value="user">Usuário Final</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="pt-4 border-t border-gray-100 mt-6 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-11 rounded-lg border-gray-200" data-testid="button-cancel-user">Cancelar</Button>
                  <Button type="submit" disabled={saveMutation.isPending} className="flex-1 h-11 rounded-lg" data-testid="button-save-user">{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar usuários..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="pl-10"
          data-testid="input-search-users"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {searchTerm ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} data-testid={`button-edit-user-${user.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este usuário?")) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-user-${user.id}`}
                      >
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
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} data-testid="button-prev-users">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} data-testid="button-next-users">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
