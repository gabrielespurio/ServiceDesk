import { useState } from "react";
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function UserManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Gerenciamento de Usuários</h3>
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
            <Button size="sm" className="gap-2">
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
                {/* Nome Completo - Full Width */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Nome Completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: João da Silva"
                          className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Usuário e Email - Two Column Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Usuário</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="usuario.login"
                            className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg"
                            {...field}
                            disabled={!!editingUser}
                          />
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
                          <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Senha e Perfil - Two Column Grid */}
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
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg"
                            {...field}
                          />
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
                            <SelectTrigger className="h-11 border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg">
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

                {/* Footer com botões */}
                <DialogFooter className="pt-4 border-t border-gray-100 mt-6 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 h-11 rounded-lg border-gray-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="flex-1 h-11 rounded-lg"
                  >
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
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
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
