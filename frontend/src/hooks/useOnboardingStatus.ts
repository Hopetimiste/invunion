import { useState, useEffect } from "react";
import { doc, getDoc, Firestore } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingStatus {
  isOnboarded: boolean;
  loading: boolean;
  error: string | null;
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user, loading: authLoading } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      if (!user) {
        setLoading(false);
        setIsOnboarded(false);
        return;
      }

      try {
        const db = await getFirebaseDb();
        // Check if user profile exists in the named Firestore database
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          // User is onboarded if they have a profile with bank connected or onboarding complete flag
          // setIsOnboarded(data?.onboardingComplete === true || data?.bankConnected === true);
          setIsOnboarded(true);
        } else {
          setIsOnboarded(false);
        }
      } catch (err) {
        console.error("Failed to check onboarding status:", err);
        setError("Failed to check onboarding status");
        // On error, assume not onboarded to be safe
        setIsOnboarded(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading]);

  return { isOnboarded, loading, error };
}

export async function checkUserOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const db = await getFirebaseDb();
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      //return data?.onboardingComplete === true || data?.bankConnected === true;
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to check onboarding status:", err);
    return false;
  }
}
