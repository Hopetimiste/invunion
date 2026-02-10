import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, ShieldCheck, KeyRound, Check, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const languages: { code: Language; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

export default function UserSettings() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode);
    toast({ title: t("common.success"), description: t("settings.languageDescription") });
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({ 
        title: t("common.error"), 
        description: "No email address found for your account", 
        variant: "destructive" 
      });
      return;
    }

    setIsSendingReset(true);
    try {
      const auth = await getFirebaseAuth();
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      toast({ 
        title: t("common.success"), 
        description: t("settings.passwordResetSent") 
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send password reset email";
      if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      }
      toast({ 
        title: t("common.error"), 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("settings.description")}</p>
        </div>

        <div className="space-y-6">
          {/* Language Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>{t("settings.language")}</CardTitle>
              </div>
              <CardDescription>{t("settings.languageDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-colors",
                      language === lang.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                    </div>
                    {language === lang.code && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <CardTitle>{t("settings.password")}</CardTitle>
              </div>
              <CardDescription>{t("settings.passwordDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {resetEmailSent ? (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    {t("settings.passwordResetSent")} <strong>{user?.email}</strong>. 
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("settings.passwordResetInstruction")}
                    </p>
                    <p className="text-sm font-medium">{user?.email}</p>
                  </div>
                  
                  <Button 
                    onClick={handlePasswordReset} 
                    disabled={isSendingReset}
                    variant="outline"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isSendingReset ? t("common.sending") : t("settings.sendResetEmail")}
                  </Button>
                </>
              )}
              
              {resetEmailSent && (
                <Button 
                  variant="ghost" 
                  onClick={() => setResetEmailSent(false)}
                  className="text-sm"
                >
                  {t("settings.sendAnotherEmail")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* MFA Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>{t("settings.mfa")}</CardTitle>
              </div>
              <CardDescription>{t("settings.mfaDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t("settings.mfaComingSoon")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
