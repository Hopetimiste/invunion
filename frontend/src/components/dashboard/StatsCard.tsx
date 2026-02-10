import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  delay?: number;
}

export function StatsCard({ title, value, change, changeLabel, icon, delay = 0 }: StatsCardProps) {
  const isPositive = change >= 0;

  return (
    <div 
      className="bg-card rounded-xl p-6 shadow-soft border border-border/50 hover:shadow-glow hover:border-primary/20 transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full",
                isPositive 
                  ? "text-success bg-success/10" 
                  : "text-destructive bg-destructive/10"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-accent text-accent-foreground">
          {icon}
        </div>
      </div>
    </div>
  );
}
