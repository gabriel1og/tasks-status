import { cn } from "@/lib/utils";

export type TimeTrackingFeedbackValue = {
  message: string;
  type: "error" | "success";
};

export function TimeTrackingFeedback({
  feedback,
}: {
  feedback: TimeTrackingFeedbackValue | null;
}) {
  if (!feedback) return null;

  return (
    <p
      role={feedback.type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        feedback.type === "error"
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      )}
    >
      {feedback.message}
    </p>
  );
}
