import type {
    AuditResult,
    CategoryResult
} from "../types/index.js";

import {
    categories,
    getCriterion
} from "../registry/index.js";

export function printCategoryResult(
    result: CategoryResult
): void {
    const category = categories[result.category];

    console.log("");
    console.log(`${category.id} — ${category.name}`);
    console.log("-----------------------------------------");

    for (const criterion of result.criteria) {
        const metadata = getCriterion(
            criterion.criterionId
        );

        console.log(
            `[${criterion.status.toUpperCase()}] ` +
            `${criterion.criterionId} — ` +
            `${metadata?.name ?? "Unknown criterion"}`
        );
    }

    console.log(`Status: ${result.status.toUpperCase()}`);
    console.log(`Duration: ${result.durationMs.toFixed(2)} ms`);
}

export function printAuditResult(
    result: AuditResult
): void {
    console.log("");
    console.log("WCAG 2.2 Accessibility Audit");
    console.log("=========================================");
    console.log(`URL: ${result.url}`);
    console.log(`Target: ${result.target}`);

    for (const category of result.categories) {
        printCategoryResult(category);
    }

    console.log("");
    console.log("=========================================");
    console.log(`Audit status: ${result.status.toUpperCase()}`);
    console.log(`Duration: ${result.durationMs.toFixed(2)} ms`);
}