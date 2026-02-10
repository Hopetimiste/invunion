import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = on ne sait pas encore

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        // 1. On récupère le "Bulletin de note" (Token) de l'utilisateur
        // 'true' force le rafraîchissement pour être sûr d'avoir les derniers rôles
        const tokenResult = await user.getIdTokenResult(true);

        // 2. On regarde s'il a le rôle admin (donné par Cloud Run)
        // OU s'il a l'email maître (sécurité de secours)
        const hasAdminRole = tokenResult.claims.role === "admin";
        const isMasterEmail = user.email === "francoissuretpro@gmail.com";

        setIsAdmin(hasAdminRole || isMasterEmail);
      } catch (error) {
        console.error("Erreur vérification admin:", error);
        setIsAdmin(false);
      }
    };

    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

  // Pendant qu'on vérifie le token...
  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si pas connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si pas admin -> On renvoie au Dashboard (PAS à l'Onboarding pour éviter la boucle !)
  if (!isAdmin) {
    return <Navigate to="/app/transactions" replace />;
  }

  // C'est gagné, bienvenue Monsieur l'Administrateur
  return <>{children}</>;
}
