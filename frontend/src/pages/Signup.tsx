import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, Auth } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name is too long"),
  companyName: z.string().trim().min(1, "Company name is required").max(100, "Company name is too long"),
  country: z.string().min(1, "Please select a country"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email is too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Map country codes to languages
const countryToLanguage: Record<string, Language> = {
  FR: 'fr',
  DE: 'de',
  AT: 'de', // Austria -> German
};

const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
];

export default function Signup() {
  const { setLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    country: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  // Set language based on country selection
  const handleCountryChange = (countryCode: string) => {
    updateField("country", countryCode);
    const language = countryToLanguage[countryCode] || 'en';
    setLanguage(language);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const firebaseAuth = await getFirebaseAuth();
        setAuth(firebaseAuth);
      } catch (err) {
        console.error("Failed to initialize Firebase Auth:", err);
        setError("Failed to initialize authentication. Please refresh the page.");
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  const getErrorMessage = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in or use a different email.";
      case "auth/weak-password":
        return "Password is too weak. Please use a stronger password.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      default:
        return "Unable to create account. Please try again later.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!auth) {
      setError("Authentication not ready. Please wait and try again.");
      return;
    }

    const validation = signupSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Firebase user
      // ON RECUPERE LE RESULTAT DANS UNE VARIABLE (Important !)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        validation.data.email,
        validation.data.password,
      );
      const user = userCredential.user;

      // Step 2: Call Cloud Run API to create tenant
      const token = await user.getIdToken();

      // API v1 endpoint for tenant creation
      const apiUrl = "https://api.invunion.com/api/v1/auth/signup-tenant";

      console.log("Appel du backend Cloud Run...", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: validation.data.companyName,
          firstName: validation.data.firstName,
          lastName: validation.data.lastName,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || result.success === false) {
        console.error("Erreur Backend:", result);
        throw new Error(result.error || "Erreur lors de la création de l'organisation. Veuillez réessayer.");
      }
      
      console.log("Tenant créé:", result.data);

      // Step 3: IMPORTANT - Rafraîchir le token pour récupérer le rôle Admin tout de suite
      await user.getIdToken(true);

      console.log("Succès complet !");
      // New users always go to onboarding since they haven't connected a bank yet
      navigate("/app/onboarding");
    } catch (err: any) {
      console.error(err);
      if (err.code) {
        setError(getErrorMessage(err.code));
      } else {
        setError(err.message || "Unable to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <Card className="w-full max-w-md shadow-soft animate-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-primary-foreground">F</span>
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Get started with your financial dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                placeholder="Acme Inc."
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={handleCountryChange}
                disabled={loading}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <Button type="submit" className="w-full gradient-primary" disabled={loading || !auth}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
