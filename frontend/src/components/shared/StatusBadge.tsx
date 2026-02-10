/**
 * StatusBadge - Consistent status display across the app
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatusConfig {
  label: string;
  className: string;
}

export interface StatusBadgeProps<T extends string> {
  status: T;
  config: Record<T, StatusConfig>;
  className?: string;
}

export function StatusBadge<T extends string>({ status, config, className }: StatusBadgeProps<T>) {
  const statusConfig = config[status];
  
  if (!statusConfig) {
    return <Badge className={className}>{status}</Badge>;
  }
  
  return (
    <Badge className={cn(statusConfig.className, className)}>
      {statusConfig.label}
    </Badge>
  );
}

// Pre-configured status configs for common entities
export const transactionStatusConfig: Record<string, StatusConfig> = {
  unconsidered: { label: "À traiter", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  unmatched: { label: "Non rapproché", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  matched: { label: "Rapproché", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  ignored: { label: "Ignoré", className: "bg-slate-100 text-slate-800 hover:bg-slate-100" },
  pending: { label: "En attente", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
};

export const invoiceStatusConfig: Record<string, StatusConfig> = {
  unpaid: { label: "Impayée", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  partial: { label: "Partiel", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  paid: { label: "Payée", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  cancelled: { label: "Annulée", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  overdue: { label: "En retard", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
};
