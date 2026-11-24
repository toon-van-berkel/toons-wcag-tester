import type { WCAGCriterionId } from "./wcag.js";
import type { TestMode } from "./testing.js";
import type { RuleResult } from "./result.js";
import type { Page } from "playwright";

export interface TestContext {
    url: string;
    page?: Page;
}

export function requirePage(context: TestContext): Page {
    if (!context.page) {
        throw new Error(
            "This rule requires an active browser page."
        );
    }

    return context.page;
}

export interface TestRule {
    id: string;
    criterionId: WCAGCriterionId;
    name: string;
    description: string;
    mode: TestMode;

    execute(context: TestContext): Promise<RuleResult>;
}