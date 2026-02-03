import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ 
  children, 
  allowedRoles = [] 
}: { 
  children: React.ReactNode; 
  allowedRoles?: string[] 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on role if unauthorized
    if (user.role === 'user') return <Redirect to="/portal" />;
    if (user.role === 'resolver') return <Redirect to="/dashboard" />;
    if (user.role === 'admin') return <Redirect to="/admin" />;
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}
