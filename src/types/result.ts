import type {
    WCAGCriterionId,
    WCAGCategory
} from "./wcag.js";

import type {
    TestMode,
    TestStatus,
    TestSeverity
} from "./testing.js";

import type { TestEvidence } from "./evidence.js";
import type { ReviewItem } from "./review.js";
import type { CriterionCoverage } from "./coverage.js";

export type { TestEvidence } from "./evidence.js";

export interface TestFinding {
    id: string;
    status: TestStatus;
    severity?: TestSeverity;
    message: string;
    evidence: TestEvidence[];
    reviewIds?: string[];
    recommendation?: string;
}

export interface RuleResult {
    ruleId: string;
    criterionId: WCAGCriterionId;

    mode: TestMode;
    status: TestStatus;

    severity?: TestSeverity;
    message: string;

    evidence: TestEvidence[];

    findings?: TestFinding[];
    reviews?: ReviewItem[];

    durationMs: number;
}

export interface CriterionResult {
    criterionId: WCAGCriterionId;
    status: TestStatus;
    rules: RuleResult[];

    coverage?: CriterionCoverage;

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