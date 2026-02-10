import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface MatchingStat {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}

const matchingStats: MatchingStat[] = [
  {
    label: "Fully Matched",
    count: 142,
    total: 200,
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-600",
  },
  {
    label: "Partially Matched",
    count: 28,
    total: 200,
    icon: <Clock className="h-4 w-4" />,
    color: "text-blue-600",
  },
  {
    label: "Unmatched",
    count: 30,
    total: 200,
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-yellow-600",
  },
];

export function InvoiceMatchingStats() {
  const totalInvoices = 200;
  const matchedInvoices = 142;
  const matchRate = Math.round((matchedInvoices / totalInvoices) * 100);

  return (
    <Card className="shadow-soft border-border/50 animate-slide-up" style={{ animationDelay: "100ms" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Invoice Matching
          </CardTitle>
          <span className="text-2xl font-bold text-primary">{matchRate}%</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {matchedInvoices} of {totalInvoices} invoices matched with transactions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={matchRate} className="h-2" />
        
        <div className="grid grid-cols-3 gap-4">
          {matchingStats.map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/50">
              <div className={`flex justify-center mb-1 ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="text-xl font-bold">{stat.count}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount Matched</span>
            <span className="font-semibold">€284,520.00</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Pending Amount</span>
            <span className="font-semibold text-yellow-600">€42,180.00</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
