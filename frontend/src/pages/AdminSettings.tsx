import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl, isConfigLoaded } from "@/lib/runtimeConfig";
import { getFirebaseAuth } from "@/lib/firebase";
import { CheckCircle, XCircle, Server, Copy } from "lucide-react";
import { toast } from "sonner";
import { Auth } from "firebase/auth";

const AdminSettings = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    // Check config status after a short delay to ensure it's loaded
    const check = () => {
      setApiBaseUrl(getApiBaseUrl());
      setLoaded(isConfigLoaded());
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const firebaseAuth = await getFirebaseAuth();
        setAuth(firebaseAuth);
      } catch (err) {
        console.error("Failed to initialize Firebase Auth:", err);
      }
    };
    initAuth();
  }, []);

  const isConfigured = loaded && Boolean(apiBaseUrl);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            System configuration and diagnostics
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Firebase Configuration
            </CardTitle>
            <CardDescription>
              Current Firebase project settings (from config.json)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg border">
              <p className="text-sm font-mono break-all">
                <span className="font-semibold">Status:</span>{" "}
                <span className="text-primary">{auth ? "Initialized" : "Loading..."}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Backend API connection status (runtime config)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {isConfigured ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {loaded ? "Not Configured" : "Loading..."}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">apiBaseUrl (from /config.json)</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                {apiBaseUrl || "(empty)"}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Debug Tools
            </CardTitle>
            <CardDescription>
              Developer utilities for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  if (!auth) {
                    toast.error("Firebase Auth not initialized");
                    return;
                  }
                  const user = auth.currentUser;
                  if (!user) {
                    toast.error("No user signed in");
                    return;
                  }
                  const token = await user.getIdToken();
                  await navigator.clipboard.writeText(token);
                  console.log("[Debug] Firebase ID Token:", token);
                  toast.success("ID Token copied to clipboard");
                } catch (err) {
                  console.error("[Debug] Failed to get token:", err);
                  toast.error("Failed to get token");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Firebase ID Token
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminSettings;
