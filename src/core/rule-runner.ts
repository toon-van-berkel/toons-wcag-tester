import { performance } from "node:perf_hooks";

import type {
    TestRule,
    TestContext,
    RuleResult,
    WCAGConfig
} from "../types/index.js";

import { getCriterion } from "../registry/index.js";
import { isRuleEnabled } from "../config/index.js";

export async function runRule(
    rule: TestRule,
    context: TestContext,
    config: WCAGConfig
): Promise<RuleResult> {
    const start = performance.now();

    const base = {
        ruleId: rule.id,
        criterionId: rule.criterionId,
        mode: rule.mode
    };

    const criterion = getCriterion(rule.criterionId);

    if (!criterion) {
        return {
            ...base,
            status: "error",
            message: "Unknown WCAG criterion.",
            evidence: [],
            durationMs: performance.now() - start
        };
    }

    if (!isRuleEnabled(rule.id, criterion, config)) {
        return {
            ...base,
            status: "disabled",
            message: "Rule disabled by configuration.",
            evidence: [],
            durationMs: performance.now() - start
        };
    }

    try {
        const result = await rule.execute(context);

        return {
            ...result,
            ...base,
            durationMs: performance.now() - start
        };
    } catch (error) {
        return {
            ...base,
            status: "error",
            message: error instanceof Error
                ? error.message
                : String(error),
            evidence: [],
            durationMs: performance.now() - start
        };
    }
}