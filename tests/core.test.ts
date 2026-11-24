import { describe, expect, it } from "vitest";

import {
    aggregateStatus,
    runRule
} from "../src/core/index.js";

import type { TestRule } from "../src/types/index.js";

const mockRule: TestRule = {
    id: "mock-rule",
    criterionId: "1.1.1",
    name: "Mock Rule",
    description: "Tests the rule runner.",
    mode: "automated",

    async execute() {
        return {
            ruleId: "mock-rule",
            criterionId: "1.1.1",
            mode: "automated",
            status: "pass",
            message: "Mock rule passed.",
            evidence: [],
            durationMs: 0
        };
    }
};

const context = {
    url: "https://example.com"
};

describe("Status Aggregation", () => {
    it("handles empty results", () => {
        expect(aggregateStatus([]))
            .toBe("not_tested");
    });

    it("aggregates passed results", () => {
        expect(aggregateStatus(["pass", "pass"]))
            .toBe("pass");
    });

    it("prioritizes failures", () => {
        expect(aggregateStatus(["pass", "fail"]))
            .toBe("fail");
    });

    it("prioritizes technical errors", () => {
        expect(aggregateStatus(["pass", "error"]))
            .toBe("error");
    });

    it("prioritizes manual reviews", () => {
        expect(
            aggregateStatus(["pass", "review_required"])
        ).toBe("review_required");
    });

    it("does not pass incomplete criteria", () => {
        expect(
            aggregateStatus(["pass", "not_tested"])
        ).toBe("not_tested");
    });

    it("does not pass disabled criteria", () => {
        expect(
            aggregateStatus(["pass", "disabled"])
        ).toBe("disabled");
    });

    it("handles non-applicable results", () => {
        expect(
            aggregateStatus(["not_applicable"])
        ).toBe("not_applicable");
    });
});

describe("Rule Runner", () => {
    it("executes enabled rules", async () => {
        const result = await runRule(
            mockRule,
            context,
            {}
        );

        expect(result.status).toBe("pass");
    });

    it("skips disabled rules", async () => {
        const result = await runRule(
            mockRule,
            context,
            {
                rules: {
                    "mock-rule": false
                }
            }
        );

        expect(result.status).toBe("disabled");
    });

    it("handles execution errors", async () => {
        const brokenRule: TestRule = {
            ...mockRule,

            async execute() {
                throw new Error("Test execution failed");
            }
        };

        const result = await runRule(
            brokenRule,
            context,
            {}
        );

        expect(result.status).toBe("error");
        expect(result.message)
            .toBe("Test execution failed");
    });

    it("records execution duration", async () => {
        const result = await runRule(
            mockRule,
            context,
            {}
        );

        expect(result.durationMs)
            .toBeGreaterThanOrEqual(0);
    });
});