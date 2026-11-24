import { describe, expect, it } from "vitest";

import {
    evaluateCoverage,
    applyCoverageStatus
} from "../src/core/coverage.js";

import type {
    WCAGCriterion,
    RuleResult,
    TestStatus
} from "../src/types/index.js";

const criterion: WCAGCriterion = {
    id: "1.1.1",
    name: "Non-text Content",
    level: "A",
    principle: "perceivable",
    category: "text-alternatives",
    description: "Test criterion",
    reference: "https://www.w3.org/TR/WCAG22/#non-text-content"
};

const plannedCriterion: WCAGCriterion = {
    ...criterion,
    coveragePlan: {
        version: "1",
        requiredRuleIds: [
            "rule-one",
            "rule-two"
        ]
    }
};

function createResult(
    ruleId: string,
    status: TestStatus
): RuleResult {
    return {
        ruleId,
        criterionId: "1.1.1",
        mode: "automated",
        status,
        message: "Test result",
        evidence: [],
        durationMs: 0
    };
}

describe("Criterion coverage", () => {
    it("reports missing coverage plans", () => {
        const coverage = evaluateCoverage(criterion, []);

        expect(coverage.status).toBe("not_implemented");
    });

    it("rejects empty coverage plans", () => {
        const coverage = evaluateCoverage(
            {
                ...criterion,
                coveragePlan: {
                    version: "1",
                    requiredRuleIds: []
                }
            },
            []
        );

        expect(coverage.status).toBe("not_implemented");
    });

    it("detects missing required rules", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "pass")
            ]
        );

        expect(coverage.status).toBe("partial");
        expect(coverage.missingRuleIds).toEqual(["rule-two"]);
    });

    it("detects complete coverage", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "pass"),
                createResult("rule-two", "pass")
            ]
        );

        expect(coverage.status).toBe("complete");
        expect(coverage.resolvedRules).toBe(2);
        expect(coverage.passingRules).toBe(2);
    });

    it("counts failed rules as resolved evaluations", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "pass"),
                createResult("rule-two", "fail")
            ]
        );

        expect(coverage.status).toBe("complete");
        expect(coverage.failingRules).toBe(1);
    });

    it("counts inapplicable rules as resolved", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "pass"),
                createResult("rule-two", "not_applicable")
            ]
        );

        expect(coverage.status).toBe("complete");
    });

    it.each([
        "review_required",
        "warning",
        "not_tested",
        "disabled",
        "error"
    ] satisfies TestStatus[])(
        "treats %s as unresolved",
        status => {
            const coverage = evaluateCoverage(
                plannedCriterion,
                [
                    createResult("rule-one", "pass"),
                    createResult("rule-two", status)
                ]
            );

            expect(coverage.status).toBe("partial");
            expect(coverage.unresolvedRuleIds).toEqual(["rule-two"]);
        }
    );

    it("ignores unrelated rules for coverage", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("unrelated-rule", "pass")
            ]
        );

        expect(coverage.resolvedRules).toBe(0);
        expect(coverage.missingRuleIds).toHaveLength(2);
    });

    it("prevents passing without a coverage plan", () => {
        const coverage = evaluateCoverage(
            criterion,
            [
                createResult("rule-one", "pass")
            ]
        );

        expect(
            applyCoverageStatus("pass", coverage)
        ).toBe("not_tested");
    });

    it("prevents passing with partial coverage", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "pass")
            ]
        );

        expect(
            applyCoverageStatus("pass", coverage)
        ).toBe("not_tested");
    });

    it("prevents inapplicable results with partial coverage", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            []
        );

        expect(
            applyCoverageStatus("not_applicable", coverage)
        ).toBe("not_tested");
    });

    it("preserves confirmed failures", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "fail")
            ]
        );

        expect(
            applyCoverageStatus("fail", coverage)
        ).toBe("fail");
    });

    it("preserves required reviews", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "review_required")
            ]
        );

        expect(
            applyCoverageStatus("review_required", coverage)
        ).toBe("review_required");
    });

    it("allows passing with complete coverage", () => {
        const coverage = evaluateCoverage(
            plannedCriterion,
            [
                createResult("rule-one", "pass"),
                createResult("rule-two", "pass")
            ]
        );

        expect(
            applyCoverageStatus("pass", coverage)
        ).toBe("pass");
    });
});