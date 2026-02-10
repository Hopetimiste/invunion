import { useState } from "react";
import { initBankConnection } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Building2, CheckCircle2, ArrowRight, MapPin } from "lucide-react";

// Supported bank markets (countries where Tink supports banks)
const SUPPORTED_MARKETS = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
];

export default function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const { locale } = useLanguage();

  const handleConnectBank = async () => {
    if (!selectedMarket) {
      setError("Please select the country where your bank is located.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { redirectUrl } = await initBankConnection('tink', selectedMarket, locale);
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message || "Unable to connect to bank service. Please try again later.");
      setLoading(false);
    }
  };

  const selectedMarketInfo = SUPPORTED_MARKETS.find(m => m.code === selectedMarket);

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-soft animate-scale-in">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-accent-foreground" />
            </div>
            <CardTitle className="text-2xl">Connect your bank account</CardTitle>
            <CardDescription className="text-base mt-2">
              Securely link your bank to start viewing your transactions and financial data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Country Selector */}
            <div className="space-y-3">
              <Label htmlFor="market" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Where is your bank located?
              </Label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger id="market" className="w-full h-12">
                  <SelectValue placeholder="Select your bank's country" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {SUPPORTED_MARKETS.map((market) => (
                    <SelectItem key={market.code} value={market.code}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{market.flag}</span>
                        <span>{market.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMarketInfo && (
                <p className="text-sm text-muted-foreground">
                  You'll see banks available in {selectedMarketInfo.flag} {selectedMarketInfo.name}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Bank-grade security</p>
                  <p className="text-xs text-muted-foreground">Your credentials are encrypted and never stored</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Read-only access</p>
                  <p className="text-xs text-muted-foreground">We can only view your transactions, not make transfers</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Disconnect anytime</p>
                  <p className="text-xs text-muted-foreground">You can revoke access at any time from settings</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleConnectBank}
              className="w-full gradient-primary h-12 text-base"
              disabled={loading || !selectedMarket}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect bank
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {!selectedMarket && (
              <p className="text-center text-xs text-secondary">
                Please select your bank's country to continue
              </p>
            )}

            <p className="text-center text-xs text-muted-foreground">
              By connecting, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
