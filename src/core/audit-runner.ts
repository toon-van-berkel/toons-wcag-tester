import { performance } from "node:perf_hooks";

import type {
    WCAGCategory,
    WCAGConfig,
    TestContext,
    AuditResult,
    CategoryResult
} from "../types/index.js";

import { categories } from "../registry/index.js";

import { runCategory } from "./category-runner.js";
import { aggregateStatus } from "./status.js";

export async function runAudit(
    context: TestContext,
    config: WCAGConfig
): Promise<AuditResult> {
    const start = performance.now();
    const startedAt = new Date().toISOString();

    const results: CategoryResult[] = [];

    const categoryIds = Object.keys(
        categories
    ) as WCAGCategory[];

    for (const category of categoryIds) {
        results.push(
            await runCategory(
                category,
                context,
                config
            )
        );
    }

    return {
        version: "2.2",
        target: config.target ?? "AAA",
        url: context.url,

        status: config.enabled === false
            ? "disabled"
            : aggregateStatus(
                results.map(result => result.status)
            ),

        categories: results,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: performance.now() - start
    };
}