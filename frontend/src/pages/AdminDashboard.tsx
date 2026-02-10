import { useState, useEffect } from "react";
import { getAdminSummary, AdminSummary } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Building2, Users, Link2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await getAdminSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Unable to load summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const syncFailures = summary ? parseInt(summary.sync_failures_last_24h || "0", 10) : 0;

  const stats = summary
    ? [
        {
          title: "Total Tenants",
          value: summary.total_tenants,
          icon: Building2,
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          title: "Active Tenants",
          value: summary.active_tenants,
          icon: Users,
          color: "text-success",
          bgColor: "bg-success/10",
        },
        {
          title: "Bank Connections",
          value: summary.connected_connections,
          icon: Link2,
          color: "text-secondary",
          bgColor: "bg-secondary/10",
        },
        {
          title: "24h Sync Failures",
          value: summary.sync_failures_last_24h,
          icon: AlertTriangle,
          color: syncFailures > 0 ? "text-destructive" : "text-muted-foreground",
          bgColor: syncFailures > 0 ? "bg-destructive/10" : "bg-muted",
        },
      ]
    : [];

  return (
    <AppLayout showAdminNav>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and statistics</p>
          </div>
          <Button variant="outline" onClick={fetchSummary} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
