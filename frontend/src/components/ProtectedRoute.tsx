import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: onboardingLoading } = useOnboardingStatus();
  const location = useLocation();

  // Show loader while auth or onboarding status is being determined
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect from onboarding page to dashboard (onboarding is no longer mandatory)
  if (location.pathname === "/app/onboarding") {
    return <Navigate to="/app" replace />;
  }

  // If user is on a non-onboarding page and NOT onboarded, redirect to onboarding
  // Exception: dashboard, settings, support, transactions, crypto, and invoices should always be accessible
  const bypassOnboarding = 
    location.pathname === "/app" ||
    location.pathname.startsWith("/app/settings") || 
    location.pathname === "/app/support" ||
    location.pathname === "/app/transactions" ||
    location.pathname.startsWith("/app/crypto") ||
    location.pathname.startsWith("/app/invoices");
  if (location.pathname !== "/app/onboarding" && !bypassOnboarding && !isOnboarded) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
}
