import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  LogOut,
  Settings,
  Menu,
  ListOrdered,
  Home,
  MessageSquare,
  BookOpen,
  Headset,
  Activity,
  ChevronDown,
  Bot,
  Database,
  Share2,
  BarChart,
  Settings2,
  Terminal,
  MessageCircle,
  Link2
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AiWidget } from "./AiWidget";

interface SidebarProps {
  isMobile?: boolean;
  user: any; // Using any for brevity in fast mode, ideally use a proper type
  logout: () => void;
  location: string;
  setMobileMenuOpen: (open: boolean) => void;
}

const SidebarContent = ({
  isMobile = false,
  user,
  logout,
  location,
  setMobileMenuOpen
}: SidebarProps) => {
  const isResolver = user.role === "resolver" || user.role === "admin";
  const isAdmin = user.role === "admin";
  
  let currentModule = "admin";
  if (location.startsWith("/portal")) {
    if (location.startsWith("/portal/ticket") && isResolver) {
      currentModule = "admin";
    } else {
      currentModule = "portal";
    }
  }
  if (location.startsWith("/ai")) currentModule = "ai";

  const navItems = currentModule === "admin" && isResolver ? [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/queues", label: "Filas", icon: ListOrdered },
    ...(isAdmin ? [
      { href: "/settings", label: "Configurações", icon: Settings },
    ] : [])
  ] : currentModule === "portal" ? [
    { href: "/portal", label: "Início", icon: Home },
    { href: "/portal/new", label: "Abrir Solicitação", icon: PlusCircle },
    { href: "/portal/tickets", label: "Meus Chamados", icon: MessageSquare },
    { href: "/portal/knowledge", label: "Base de Conhecimento", icon: BookOpen },
    ...(isAdmin ? [
      { href: "/settings", label: "Configurações", icon: Settings },
    ] : [])
  ] : [
    // AI Module Navigation
    { href: "/ai/dashboard", label: "Dashboard", icon: BarChart },
    { href: "/ai/assistants", label: "Assistentes", icon: Bot },
    { href: "/ai/connections", label: "Conexões", icon: Link2 },
    { href: "/ai/channels", label: "Canais", icon: Share2 },
    { href: "/ai/logs", label: "Monitoramento", icon: Activity },
  ];

  return (
    <div className={`flex flex-col h-[calc(100vh-2rem)] my-4 ml-4 bg-white rounded-3xl shadow-sm border border-sidebar-border text-sidebar-foreground transition-all duration-300 ${isMobile ? "w-64" : "w-28"}`}>
      <div className={`pt-8 pb-4 flex flex-col items-center justify-center gap-2`}>
        {isResolver ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex flex-col items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/30 relative">
                  {currentModule === 'admin' ? <Activity className="w-7 h-7" /> : currentModule === 'ai' ? <Bot className="w-7 h-7" /> : <Home className="w-7 h-7" />}
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-sidebar-border text-primary shadow-sm">
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
                {isMobile && (
                  <h1 className="text-xl font-bold tracking-tight text-primary mt-2 flex items-center gap-1">
                    {currentModule === 'admin' ? 'NexDesk' : currentModule === 'ai' ? 'NexAI' : 'Portal'} <ChevronDown className="w-4 h-4" />
                  </h1>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMobile ? "center" : "start"} side={isMobile ? "bottom" : "right"} className="w-56" sideOffset={18}>
              <DropdownMenuLabel>Alternar Módulo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/dashboard">
                <DropdownMenuItem className="cursor-pointer">
                  <Activity className="w-4 h-4 mr-2" />
                  Service Desk
                </DropdownMenuItem>
              </Link>
              <Link href="/ai/dashboard">
                <DropdownMenuItem className="cursor-pointer">
                  <Bot className="w-4 h-4 mr-2" />
                  Assistentes Digitais
                </DropdownMenuItem>
              </Link>
              <Link href="/portal">
                <DropdownMenuItem className="cursor-pointer">
                  <Home className="w-4 h-4 mr-2" />
                  Portal do Cliente
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <Home className="w-7 h-7" />
            </div>
            {isMobile && (
              <h1 className="text-xl font-bold tracking-tight text-primary mt-2">
                Portal
              </h1>
            )}
          </>
        )}
      </div>

      <div className={`p-4 border-b border-sidebar-border ${isMobile ? "block" : "hidden"}`}>
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-8 w-8 border border-border shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user.fullName}</span>
            <span className="text-xs text-muted-foreground capitalize truncate">{user.role}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto mt-4">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer rounded-xl mx-2 ${isMobile ? "p-3 flex-row justify-start gap-4" : "py-3 px-1 gap-1.5"
                  } ${isActive
                    ? "text-primary relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary before:rounded-r-md bg-primary/5"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-medium text-center ${isMobile ? "text-sm" : "text-[10px] leading-tight"}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ${isMobile ? "justify-start gap-3" : "flex-col h-auto py-3 gap-1.5"
                  }`}
                onClick={() => logout()}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className={isMobile ? "text-sm font-medium" : "text-[10px] leading-tight font-medium"}>
                  Sair
                </span>
              </Button>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent side="right">
                Encerrar sessão
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isResolver = user?.role === "resolver" || user?.role === "admin";
  const currentModule = (location.startsWith("/portal") && !(location.startsWith("/portal/ticket") && isResolver)) ? "portal" : "other";

  if (!user) return <div className="min-h-screen flex items-center justify-center">{children}</div>;

  return (
    <div className="flex min-h-screen bg-[#f4f7f9]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 z-20">
        <SidebarContent
          user={user}
          logout={logout}
          location={location}
          setMobileMenuOpen={setMobileMenuOpen}
        />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-30 flex items-center px-4 justify-between">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
          HelpDesk
        </h1>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent
              isMobile
              user={user}
              logout={logout}
              location={location}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-36 p-4 md:p-6 md:pt-6 pt-20 animate-enter transition-all duration-300">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
      {currentModule === "portal" && <AiWidget />}
    </div>
  );
}
