import { useTickets } from "@/hooks/use-tickets";
import { Link } from "wouter";
import { Search, Send, MessageSquare, BookOpen, Users, HelpCircle, Lightbulb, PlayCircle, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

export default function PortalHome() {
  const { data: tickets, isLoading } = useTickets();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-muted/20 animate-pulse rounded-3xl" />
        <div className="h-32 bg-muted/20 animate-pulse rounded-3xl" />
      </div>
    );
  }

  const myTickets = tickets || [];
  const recentTickets = myTickets.slice(0, 5);

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-indigo-950 text-white shadow-xl min-h-[320px] flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop" 
            alt="Support" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-indigo-900/90 to-transparent" />
        </div>

        <div className="relative z-10 w-full px-8 md:px-12 py-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="max-w-2xl flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sm font-medium">
              <span>Olá, {user?.fullName.split(' ')[0]}! 👋</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Como podemos<br />te ajudar hoje?
            </h1>
            
            <p className="text-lg text-indigo-100 opacity-90 max-w-md">
              Encontre soluções, abra solicitações ou consulte a base de conhecimento.
            </p>

            <div className="relative max-w-lg mt-4">
              <Input 
                type="text" 
                placeholder="Buscar por soluções, serviços ou dúvidas..." 
                className="w-full pl-6 pr-14 py-7 text-base rounded-full bg-white text-foreground border-0 shadow-lg placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-primary/20"
              />
              <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-white shadow-md">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Business Hours Widget */}
          <div className="hidden md:block w-72 shrink-0 bg-indigo-950/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                  <Clock className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Horário de atendimento</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">Segunda a Sexta<br/>08h às 18h</p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <a href="#" className="text-sm font-medium text-indigo-300 hover:text-white transition-colors flex items-center gap-2">
                  Ver canais de atendimento <span className="text-lg leading-none">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground/80 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full"></span>
          Acesso rápido
        </h2>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${user?.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          <Link href="/portal/new">
            <Card className="hover:shadow-md transition-all cursor-pointer border-transparent hover:border-primary/20 group h-full">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                    <Send className="w-6 h-6" />
                  </div>
                  <span className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all text-xl leading-none">→</span>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">Abrir solicitação</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Precisa de ajuda? Abra uma solicitação para nossa equipe.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal">
            <Card className="hover:shadow-md transition-all cursor-pointer border-transparent hover:border-primary/20 group h-full">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all text-xl leading-none">→</span>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">Meus chamados</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Acompanhe o status de todas as suas solicitações.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal">
            <Card className="hover:shadow-md transition-all cursor-pointer border-transparent hover:border-primary/20 group h-full">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all text-xl leading-none">→</span>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">Base de conhecimento</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Encontre respostas rápidas para as principais dúvidas.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {user?.role === 'admin' && (
            <Link href="/settings">
              <Card className="hover:shadow-md transition-all cursor-pointer border-transparent hover:border-primary/20 group h-full">
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-110 group-hover:bg-slate-600 group-hover:text-white transition-all duration-300">
                      <Settings className="w-6 h-6" />
                    </div>
                    <span className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all text-xl leading-none">→</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">Configurações</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Gerencie formulários, automações, filas, SLA e usuários.</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Main Content Area - Recent Tickets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-lg font-semibold text-foreground">Meus chamados recentes</h2>
            <Link href="/portal">
              <Button variant="ghost" className="text-primary hover:text-primary/80 px-0 h-auto font-medium">
                Ver todos os chamados <span className="text-lg leading-none ml-1">→</span>
              </Button>
            </Link>
          </div>
          
          <Card className="border-transparent shadow-sm overflow-hidden bg-white">
            <div className="divide-y divide-border/50">
              {recentTickets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Você ainda não possui chamados recentes.
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/portal/ticket/${ticket.id}`} className="block">
                    <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          ticket.status === 'resolvido' ? 'bg-emerald-50 text-emerald-600' :
                          ticket.status === 'aberto' ? 'bg-purple-50 text-purple-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {ticket.status === 'resolvido' ? <BookOpen className="w-5 h-5" /> : 
                           <MessageSquare className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{ticket.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">#ND-2024-{ticket.id + 1500}</span>
                            <span className="text-muted-foreground/30 text-xs">•</span>
                            <StatusBadge status={ticket.status} />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground md:ml-auto">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          Há {formatDistanceToNow(new Date(ticket.createdAt!), { locale: ptBR })}
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary text-xl leading-none">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
          
          {/* Feedback Banner */}
          <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900">Sua opinião é muito importante!</h4>
                <p className="text-sm text-indigo-700/80">Responda nossa pesquisa rápida e nos ajude a melhorar cada vez mais.</p>
              </div>
            </div>
            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
              Responder pesquisa
            </Button>
          </div>
        </div>

        {/* Sidebar Highlights */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg bg-primary overflow-hidden relative group rounded-2xl">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
              <HelpCircle className="w-32 h-32 text-white" />
            </div>
            <CardContent className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Precisa de ajuda agora?</h3>
                <p className="text-primary-foreground/90 text-sm leading-relaxed max-w-[90%]">
                  Abra uma nova solicitação e nossa equipe de suporte irá te ajudar o mais rápido possível.
                </p>
              </div>
              <Link href="/portal/new" className="w-full">
                <Button variant="secondary" className="w-full justify-between items-center rounded-xl bg-white text-primary hover:bg-white/90">
                  Abrir solicitação
                  <span className="text-xl leading-none">→</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Destaques para você</h3>
            <div className="space-y-3">
              {[
                { icon: Lightbulb, title: "Novidades da plataforma", desc: "Confira as últimas atualizações e melhorias.", color: "text-blue-500", bg: "bg-blue-50" },
                { icon: Users, title: "Dicas e boas práticas", desc: "Aprenda a usar o NexDesk da melhor forma.", color: "text-indigo-500", bg: "bg-indigo-50" },
                { icon: PlayCircle, title: "Tutoriais em vídeo", desc: "Vídeos rápidos para te ajudar no dia a dia.", color: "text-emerald-500", bg: "bg-emerald-50" }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-border/50 transition-all cursor-pointer group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-xl leading-none">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
