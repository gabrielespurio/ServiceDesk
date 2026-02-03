import { useCreateTicket } from "@/hooks/use-tickets";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const ticketFormSchema = z.object({
  title: z.string().min(5, "Título deve ter pelo menos 5 caracteres"),
  category: z.string().min(1, "Por favor selecione uma categoria"),
  priority: z.enum(["baixa", "media", "alta", "critica"]),
  description: z.string().min(10, "Por favor forneça mais detalhes"),
});

export default function NewTicket() {
  const [, setLocation] = useLocation();
  const createTicket = useCreateTicket();

  const form = useForm<z.infer<typeof ticketFormSchema>>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: "",
      category: "",
      priority: "media",
      description: "",
    },
  });

  function onSubmit(values: z.infer<typeof ticketFormSchema>) {
    createTicket.mutate(values, {
      onSuccess: (data) => {
        setLocation(`/portal/ticket/${data.id}`);
      },
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button 
        variant="ghost" 
        className="pl-0 hover:bg-transparent hover:text-primary transition-colors"
        onClick={() => setLocation("/portal")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Chamados
      </Button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Criar Solicitação</h1>
        <p className="text-muted-foreground">Descreva seu problema e ajudaremos a resolvê-lo.</p>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input placeholder="Resumo breve do problema" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hardware">Hardware</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="acesso">Acesso / Login</SelectItem>
                          <SelectItem value="financeiro">Financeiro</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="critica">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Por favor, detalhe os passos para reproduzir o problema..." 
                        className="min-h-[150px] resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Inclua mensagens de erro ou capturas de tela, se aplicável.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full sm:w-auto min-w-[150px]"
                  disabled={createTicket.isPending}
                >
                  {createTicket.isPending ? "Enviando..." : "Enviar Chamado"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
