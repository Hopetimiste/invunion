import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  companyName: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  companyName: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        const auth = await getFirebaseAuth();
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          setUser(currentUser);
          
          // Fetch company name from Firestore if user is logged in
          if (currentUser) {
            try {
              const db = await getFirebaseDb();
              const userDoc = await getDoc(doc(db, "tenant_users", currentUser.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                // Try to get company name from tenant
                if (userData?.tenant_id) {
                  const tenantDoc = await getDoc(doc(db, "tenants", userData.tenant_id));
                  if (tenantDoc.exists()) {
                    setCompanyName(tenantDoc.data()?.name || null);
                  }
                }
              }
            } catch (err) {
              console.error("Failed to fetch company name:", err);
            }
          } else {
            setCompanyName(null);
          }
          
          setLoading(false);
        });
      } catch (error) {
        console.error("Failed to initialize Firebase Auth:", error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, companyName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
