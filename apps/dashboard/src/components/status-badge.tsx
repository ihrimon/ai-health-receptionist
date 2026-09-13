import { Badge } from "@/components/ui/badge";

const BOOKING_STYLES: Record<string, string> = {
  pending:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed:
    "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:
    "border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const CALL_STYLES: Record<string, string> = {
  ringing:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "in-progress":
    "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:
    "border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  failed:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusBadge({
  status,
  kind = "booking",
}: {
  status: string;
  kind?: "booking" | "call";
}) {
  const styles = kind === "call" ? CALL_STYLES : BOOKING_STYLES;
  return (
    <Badge variant="outline" className={`capitalize ${styles[status] ?? ""}`}>
      {status}
    </Badge>
  );
}
