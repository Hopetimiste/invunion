/**
 * ActionButton - Consistent action buttons for headers
 */

import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  loading?: boolean;
}

export function ActionButton({ 
  icon: Icon, 
  label, 
  onClick, 
  disabled, 
  variant = "outline",
  loading 
}: ActionButtonProps) {
  return (
    <Button variant={variant} onClick={onClick} disabled={disabled || loading}>
      <Icon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {label}
    </Button>
  );
}

export interface ActionButtonGroupProps {
  children: ReactNode;
}

export function ActionButtonGroup({ children }: ActionButtonGroupProps) {
  return <div className="flex gap-2 flex-wrap">{children}</div>;
}
