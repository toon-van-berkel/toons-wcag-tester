import { performance } from "node:perf_hooks";

import type {
    WCAGCategory,
    WCAGConfig,
    TestContext,
    CategoryResult,
    CriterionResult
} from "../types/index.js";

import {
    getCriteriaByCategory
} from "../registry/index.js";

import { runCriterion } from "./criterion-runner.js";
import { aggregateStatus } from "./status.js";

export async function runCategory(
    category: WCAGCategory,
    context: TestContext,
    config: WCAGConfig
): Promise<CategoryResult> {
    const start = performance.now();

    const criteria = getCriteriaByCategory(category);
    const results: CriterionResult[] = [];

    for (const criterion of criteria) {
        results.push(
            await runCriterion(
                criterion,
                context,
                config
            )
        );
    }

    const targetCriteria = results.filter(result => {
        const criterion = criteria.find(
            item => item.id === result.criterionId
        );

        if (!criterion) {
            return false;
        }

        const levels = ["A", "AA", "AAA"];

        return (
            levels.indexOf(criterion.level) <=
            levels.indexOf(config.target ?? "AAA")
        );
    });

    return {
        category,
        status: targetCriteria.length === 0
            ? "not_applicable"
            : aggregateStatus(
                targetCriteria.map(result => result.status)
            ),
        criteria: results,
        durationMs: performance.now() - start
    };
}