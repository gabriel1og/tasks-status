import { CheckCircle2, CircleAlert, CircleHelp, Clock3, ListTodo } from "lucide-react";
import { progressLabels } from "@/lib/ocr-tracking/definitions";
import type { OcrProgress } from "@/types/ocr-tracking";

const appearance = { done: "text-emerald-700 dark:text-emerald-400", blocked: "text-destructive", unknown: "text-muted-foreground", pending: "text-amber-700 dark:text-amber-400", in_progress: "text-blue-700 dark:text-blue-400" };
const icons = { done: CheckCircle2, blocked: CircleAlert, unknown: CircleHelp, pending: ListTodo, in_progress: Clock3 };

/** Status com texto e ícone além da cor. Ex.: <OcrStatusBadge status="unknown" />. */
export function OcrStatusBadge({ status }: { status: OcrProgress }) {
  const Icon = icons[status];
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${appearance[status]}`}><Icon className="h-4 w-4 shrink-0" />{progressLabels[status]}</span>;
}
