type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "outline";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  outline: "border border-gray-300 text-gray-600 bg-transparent",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Convenience mapping for shift/callout statuses
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    scheduled: { label: "Scheduled", variant: "info" },
    confirmed: { label: "Confirmed", variant: "success" },
    open: { label: "Open", variant: "warning" },
    filled: { label: "Filled", variant: "success" },
    pending: { label: "Pending", variant: "warning" },
    escalated: { label: "Escalated", variant: "error" },
    approved: { label: "Approved", variant: "success" },
    denied: { label: "Denied", variant: "error" },
  };

  const { label, variant } = config[status] ?? {
    label: status,
    variant: "default" as BadgeVariant,
  };

  return <Badge variant={variant}>{label}</Badge>;
}

// Role color badges
export function RoleBadge({ role }: { role: string }) {
  const config: Record<string, BadgeVariant> = {
    Cook: "error",
    Server: "info",
    Bartender: "purple",
    Manager: "success",
  };

  return <Badge variant={config[role] ?? "default"}>{role}</Badge>;
}
