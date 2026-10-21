export type OcrProgress = "unknown" | "pending" | "in_progress" | "blocked" | "done";
export type OcrChecklistStatus = OcrProgress | "not_applicable";
export type OcrTestStatus = "unknown" | "pending" | "approved" | "rejected";
export type OcrTriState = "unknown" | "yes" | "no";
export type OcrIssueStatus = "pending" | "in_progress" | "blocked" | "resolved" | "waived";
export type OcrStage = 1 | 2 | 3 | 4;
export type OcrIssueKind = "missing_field" | "regex" | "configuration" | "category" | "partner" | "purchase_order" | "tax_values" | "payment_line" | "system" | "review";
export type OcrAuditRow = { id: string; user_id: string; created_at: string; updated_at: string };

export type OcrItem = OcrAuditRow & {
  source_key: string; supplier: string; filename: string; layout_id: string;
  sub_layout_id: string; category: string; category_description: string; category_id: string;
  subcategory: string; environment: string; tenant: string; assignee: string; next_action: string;
  international: OcrTriState; boleto: OcrTriState; notes: string; source_notes: string;
  source_record: Record<string, string>; source_match: string; archived_at: string | null;
};
export type OcrChecklist = OcrAuditRow & {
  item_id: string; key: string; stage: OcrStage; label: string; conditional: boolean;
  status: OcrChecklistStatus; evidence: string; confirmed_by: string; confirmed_on: string | null;
};
export type OcrField = OcrAuditRow & {
  item_id: string; key: string; label: string; required: boolean; applicability: OcrTriState;
  availability: "unknown" | "present" | "absent" | "incomplete"; regex: string; expected_value: string;
  configuration: "unknown" | "pending" | "configured";
  magnifier_status: OcrTestStatus; triage_status: OcrTestStatus;
  magnifier_value: string; triage_value: string; evidence: string; notes: string;
  waiver_reason: string; waiver_by: string; waiver_on: string | null;
};
export type OcrIssue = OcrAuditRow & {
  item_id: string; field_id: string | null; stage: OcrStage; kind: OcrIssueKind;
  description: string; assignee: string; next_action: string; status: OcrIssueStatus;
  resolution: string; authorized_by: string; authorized_on: string | null;
};
export type OcrEvent = {
  id: string; user_id: string; item_id: string; entity: string; operation: string;
  old_record: Record<string, unknown> | null; new_record: Record<string, unknown> | null;
  created_at: string;
};
export type OcrWorkspace = { items: OcrItem[]; checklist: OcrChecklist[]; fields: OcrField[]; issues: OcrIssue[] };
export type OcrInput<T> = Omit<T, keyof OcrAuditRow | "item_id">;
export type OcrSeed = {
  item: OcrInput<OcrItem>; checklist: OcrInput<OcrChecklist>[];
  fields: OcrInput<OcrField>[]; issues: OcrInput<OcrIssue>[];
};
export type OcrReport = {
  status: OcrProgress; stages: Record<OcrStage, OcrProgress>; approved: number; waived: number;
  unvalidated: number; missing: number; openIssues: number; completedStages: number;
  reasons: string[]; requiredLabel: string;
};
