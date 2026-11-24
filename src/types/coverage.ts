export interface CriterionCoveragePlan {
    version: string;
    requiredRuleIds: readonly string[];
}

export type CoverageStatus =
    | "not_implemented"
    | "partial"
    | "complete";

export interface CriterionCoverage {
    status: CoverageStatus;

    planVersion?: string;

    requiredRules: number;
    executedRules: number;
    resolvedRules: number;

    passingRules: number;
    failingRules: number;
    pendingRules: number;

    missingRuleIds: string[];
    unresolvedRuleIds: string[];
}