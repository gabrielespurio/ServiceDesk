import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  LogOut, 
  User, 
  Settings,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
          HelpDesk
        </h1>
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user.fullName}</span>
            <span className="text-xs text-muted-foreground capitalize truncate">{user.role}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-30 flex items-center px-4 justify-between">
         <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            HelpDesk
         </h1>
         <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
           <SheetTrigger asChild>
             <Button variant="ghost" size="icon">
               <Menu className="w-5 h-5" />
             </Button>
           </SheetTrigger>
           <SheetContent side="left" className="p-0 w-64">
             <SidebarContent />
           </SheetContent>
         </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 animate-enter">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
