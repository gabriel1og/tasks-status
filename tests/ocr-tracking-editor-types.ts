import type { OcrEditorTarget } from "@/components/ocr-tracking/workspace-editors";
import type { OcrChecklist, OcrField, OcrIssue, OcrItem } from "@/types/ocr-tracking";

type AssertEditorType<Condition extends true> = Condition;
type SameEditorType<Left, Right> =
  [Left] extends [Right] ? [Right] extends [Left] ? true : false : false;

// A grouped `kind` union would make a single-kind Extract resolve to never.
// These assertions are checked by TypeScript and the Next.js build, without runtime I/O.
export type OcrEditorVariantRegression = [
  AssertEditorType<SameEditorType<Extract<OcrEditorTarget, { kind: "item" }>["row"], OcrItem>>,
  AssertEditorType<SameEditorType<Extract<OcrEditorTarget, { kind: "newItem" }>["row"], OcrItem>>,
  AssertEditorType<SameEditorType<Extract<OcrEditorTarget, { kind: "checklist" }>["row"], OcrChecklist>>,
  AssertEditorType<SameEditorType<Extract<OcrEditorTarget, { kind: "field" }>["row"], OcrField>>,
  AssertEditorType<SameEditorType<Extract<OcrEditorTarget, { kind: "newField" }>["row"], OcrField>>,
  AssertEditorType<SameEditorType<Extract<OcrEditorTarget, { kind: "issue" }>["row"], OcrIssue>>,
  AssertEditorType<SameEditorType<Extract<OcrEditorTarget, { kind: "newIssue" }>["row"], OcrIssue>>,
];
