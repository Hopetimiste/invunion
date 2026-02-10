import { ArrowUpRight, ArrowDownRight, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "income" | "expense" | "pending";
  title: string;
  description: string;
  amount: string;
  time: string;
  avatar?: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "income",
    title: "Payment received",
    description: "Sarah Johnson - Invoice #1234",
    amount: "+$2,450.00",
    time: "2 min ago",
  },
  {
    id: "2",
    type: "expense",
    title: "Subscription payment",
    description: "AWS Services - Monthly",
    amount: "-$499.00",
    time: "15 min ago",
  },
  {
    id: "3",
    type: "pending",
    title: "Pending transfer",
    description: "To: Marketing Team Budget",
    amount: "$8,200.00",
    time: "1 hour ago",
  },
  {
    id: "4",
    type: "income",
    title: "Payment received",
    description: "Michael Chen - Invoice #1235",
    amount: "+$1,890.00",
    time: "3 hours ago",
  },
  {
    id: "5",
    type: "expense",
    title: "Software license",
    description: "Figma Enterprise - Annual",
    amount: "-$1,200.00",
    time: "5 hours ago",
  },
];

const typeConfig = {
  income: {
    icon: ArrowDownRight,
    iconClass: "text-success bg-success/10",
  },
  expense: {
    icon: ArrowUpRight,
    iconClass: "text-destructive bg-destructive/10",
  },
  pending: {
    icon: RefreshCw,
    iconClass: "text-warning bg-warning/10",
  },
};

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Latest transactions</p>
        </div>
        <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;
          
          return (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
              style={{ animationDelay: `${400 + index * 50}ms` }}
            >
              <div className={cn("p-2 rounded-lg", config.iconClass)}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className={cn(
                  "text-sm font-semibold",
                  activity.type === "income" && "text-success",
                  activity.type === "expense" && "text-destructive",
                  activity.type === "pending" && "text-foreground"
                )}>
                  {activity.amount}
                </p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
