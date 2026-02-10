import { MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Customer {
  id: string;
  name: string;
  email: string;
  revenue: number;
  orders: number;
  growth: number;
}

const customers: Customer[] = [
  { id: "1", name: "Sarah Johnson", email: "sarah@company.com", revenue: 48200, orders: 156, growth: 24 },
  { id: "2", name: "Michael Chen", email: "m.chen@startup.io", revenue: 42100, orders: 132, growth: 18 },
  { id: "3", name: "Emma Williams", email: "emma.w@design.co", revenue: 38900, orders: 98, growth: 32 },
  { id: "4", name: "James Rodriguez", email: "james@tech.dev", revenue: 31500, orders: 87, growth: -5 },
  { id: "5", name: "Lisa Anderson", email: "lisa.a@corp.com", revenue: 28400, orders: 76, growth: 12 },
];

const maxRevenue = Math.max(...customers.map(c => c.revenue));

export function TopCustomers() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50 animate-slide-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Top Customers</h3>
          <p className="text-sm text-muted-foreground">By total revenue</p>
        </div>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-5">
        {customers.map((customer, index) => (
          <div key={customer.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-chart-2/80 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary-foreground">
                    {customer.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  ${customer.revenue.toLocaleString()}
                </p>
                <p className={`text-xs ${customer.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {customer.growth >= 0 ? '+' : ''}{customer.growth}%
                </p>
              </div>
            </div>
            <Progress 
              value={(customer.revenue / maxRevenue) * 100} 
              className="h-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
