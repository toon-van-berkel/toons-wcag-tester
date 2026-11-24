import type { WCAGCriterionId } from "./wcag.js";
import type { TestMode } from "./testing.js";
import type { RuleResult } from "./result.js";

export interface TestContext {
    url: string;
}

export interface TestRule {
    id: string;
    criterionId: WCAGCriterionId;
    name: string;
    description: string;
    mode: TestMode;

    execute(context: TestContext): Promise<RuleResult>;
}