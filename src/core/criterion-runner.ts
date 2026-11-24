import { performance } from "node:perf_hooks";

import type {
    WCAGCriterion,
    WCAGConfig,
    TestContext,
    CriterionResult,
    RuleResult
} from "../types/index.js";

import {
    getRulesByCriterion
} from "../registry/index.js";

import {
    isCriterionEnabled
} from "../config/index.js";

import { runRule } from "./rule-runner.js";
import { aggregateStatus } from "./status.js";

export async function runCriterion(
    criterion: WCAGCriterion,
    context: TestContext,
    config: WCAGConfig
): Promise<CriterionResult> {
    const start = performance.now();

    if (!isCriterionEnabled(criterion, config)) {
        return {
            criterionId: criterion.id,
            status: "disabled",
            rules: [],
            durationMs: performance.now() - start
        };
    }

    const rules = getRulesByCriterion(criterion.id);

    const results: RuleResult[] = [];

    for (const rule of rules) {
        results.push(
            await runRule(rule, context, config)
        );
    }

    return {
        criterionId: criterion.id,
        status: aggregateStatus(
            results.map(result => result.status)
        ),
        rules: results,
        durationMs: performance.now() - start
    };
}