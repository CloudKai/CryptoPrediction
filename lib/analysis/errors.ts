import type { AnalysisIssue } from "@/lib/discover/contract";

/** Only prewritten public messages cross the API boundary; never provider bodies or keys. */
export class AnalysisError extends Error {
  constructor(readonly issue: AnalysisIssue) {
    super(issue.message);
    this.name = "AnalysisError";
  }
}
