import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  LogOut, 
  Settings,
  Menu
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return <div className="min-h-screen flex items-center justify-center">{children}</div>;

  const isResolver = user.role === "resolver" || user.role === "admin";
  const isAdmin = user.role === "admin";

  const navItems = [
    ...(isResolver ? [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ] : [
      { href: "/portal", label: "My Tickets", icon: Ticket },
      { href: "/portal/new", label: "New Ticket", icon: PlusCircle },
    ]),
    ...(isAdmin ? [
      { href: "/admin", label: "Admin Stats", icon: Settings },
    ] : [])
  ];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-all duration-300 ${isMobile ? "w-64" : "w-20 group-hover:w-64"}`}>
      <div className={`p-4 border-b border-sidebar-border flex items-center ${isMobile ? "gap-3" : "justify-center group-hover:justify-start group-hover:gap-3"}`}>
        <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
          <Ticket className="w-6 h-6" />
        </div>
        <h1 className={`text-xl font-bold tracking-tight text-primary transition-opacity duration-300 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 hidden group-hover:block"}`}>
          HelpDesk
        </h1>
      </div>

      <div className={`p-4 border-b border-sidebar-border transition-all duration-300 ${isMobile ? "block" : "hidden group-hover:block"}`}>
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-8 w-8 border border-border shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user.fullName}</span>
            <span className="text-xs text-muted-foreground capitalize truncate">{user.role}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <div
                      className={`flex items-center transition-all duration-200 cursor-pointer rounded-lg ${
                        isMobile ? "px-3 py-2.5 gap-3" : "p-2.5 justify-center group-hover:justify-start group-hover:px-3 group-hover:gap-3"
                      } ${
                        isActive 
                          ? "bg-primary text-white shadow-md shadow-primary/20" 
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium transition-opacity duration-300 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 hidden group-hover:block"}`}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </TooltipTrigger>
                {!isMobile && (
                  <TooltipContent side="right" className="group-hover:hidden">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                className={`w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all ${
                  isMobile ? "justify-start gap-2" : "justify-center p-0 h-10 group-hover:justify-start group-hover:px-3 group-hover:gap-2"
                }`}
                onClick={() => logout()}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className={`transition-opacity duration-300 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 hidden group-hover:block"}`}>
                  Sign Out
                </span>
              </Button>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent side="right" className="group-hover:hidden">
                Sign Out
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 z-20 group">
        <SidebarContent />
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
             <SidebarContent isMobile />
           </SheetContent>
         </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-20 p-4 md:p-8 pt-20 md:pt-8 animate-enter transition-all duration-300">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
