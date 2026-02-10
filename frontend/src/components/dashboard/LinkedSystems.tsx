import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CreditCard, FileSpreadsheet, Link2, CheckCircle2, XCircle } from "lucide-react";

interface LinkedSystem {
  id: string;
  name: string;
  type: "bank" | "erp" | "accounting";
  provider: string;
  status: "connected" | "disconnected" | "syncing";
  lastSync?: string;
  icon: React.ReactNode;
}

const linkedSystems: LinkedSystem[] = [
  {
    id: "1",
    name: "Business Account",
    type: "bank",
    provider: "BNP Paribas",
    status: "connected",
    lastSync: "5 min ago",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: "2",
    name: "Savings Account",
    type: "bank",
    provider: "Société Générale",
    status: "connected",
    lastSync: "12 min ago",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    id: "3",
    name: "ERP System",
    type: "erp",
    provider: "SAP Business One",
    status: "connected",
    lastSync: "1 hour ago",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: "4",
    name: "Accounting Software",
    type: "accounting",
    provider: "QuickBooks",
    status: "disconnected",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
];

const statusConfig = {
  connected: { label: "Connected", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  disconnected: { label: "Disconnected", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  syncing: { label: "Syncing...", color: "bg-blue-100 text-blue-800", icon: null },
};

const typeLabels = {
  bank: "Bank",
  erp: "ERP",
  accounting: "Accounting",
};

export function LinkedSystems() {
  const connectedCount = linkedSystems.filter(s => s.status === "connected").length;

  return (
    <Card className="shadow-soft border-border/50 animate-slide-up" style={{ animationDelay: "150ms" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Linked Systems
          </CardTitle>
          <Badge variant="secondary">
            {connectedCount}/{linkedSystems.length} Active
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Bank accounts, ERPs, and integrations
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {linkedSystems.map((system) => {
          const status = statusConfig[system.status];
          return (
            <div
              key={system.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {system.icon}
                </div>
                <div>
                  <div className="font-medium text-sm">{system.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {system.provider} • {typeLabels[system.type]}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`${status.color} font-normal text-xs flex items-center gap-1`}>
                  {status.icon}
                  {status.label}
                </Badge>
                {system.lastSync && (
                  <span className="text-xs text-muted-foreground">
                    Synced {system.lastSync}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
