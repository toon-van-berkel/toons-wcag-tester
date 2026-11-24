import type {
    WCAGCriterionId,
    WCAGCategory
} from "./wcag.js";

import type {
    TestStatus,
    TestMode,
    TestSeverity
} from "./testing.js";

export interface TestEvidence {
    url?: string;
    selector?: string;
    html?: string;
    screenshot?: string;
    expected?: string;
    actual?: string;
}

export interface RuleResult {
    ruleId: string;
    criterionId: WCAGCriterionId;
    mode: TestMode;
    status: TestStatus;
    severity?: TestSeverity;
    message: string;
    evidence: TestEvidence[];
    durationMs: number;
}

export interface CriterionResult {
    criterionId: WCAGCriterionId;
    status: TestStatus;
    rules: RuleResult[];
    durationMs: number;
}

export interface CategoryResult {
    category: WCAGCategory;
    status: TestStatus;
    criteria: CriterionResult[];
    durationMs: number;
}

export interface AuditResult {
    version: "2.2";
    target: "A" | "AA" | "AAA";
    url: string;
    status: TestStatus;
    categories: CategoryResult[];
    startedAt: string;
    finishedAt: string;
    durationMs: number;
}