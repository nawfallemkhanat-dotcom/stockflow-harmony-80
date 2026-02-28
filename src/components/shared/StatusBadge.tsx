import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  "in-stock": "bg-success/10 text-success border-success/20",
  received: "bg-success/10 text-success border-success/20",
  paid: "bg-success/10 text-success border-success/20",
  shipped: "bg-success/10 text-success border-success/20",
  "low-stock": "bg-warning/10 text-warning border-warning/20",
  draft: "bg-muted text-muted-foreground border-border",
  ordered: "bg-primary/10 text-primary border-primary/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  "out-of-stock": "bg-destructive/10 text-destructive border-destructive/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const key = status.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium capitalize",
        statusStyles[key] || "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {status}
    </Badge>
  );
};

export default StatusBadge;
