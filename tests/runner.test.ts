import { describe, expect, it } from "vitest";

import {
    runCriterion,
    runCategory,
    runAudit
} from "../src/core/index.js";

import {
    getCriterion
} from "../src/registry/index.js";

const context = {
    url: "https://example.com"
};

describe("Criterion Runner", () => {
    it("reports unimplemented criteria", async () => {
        const result = await runCriterion(
            getCriterion("1.1.1")!,
            context,
            {}
        );

        expect(result.status).toBe("not_tested");
        expect(result.rules).toHaveLength(0);
    });

    it("respects disabled criteria", async () => {
        const result = await runCriterion(
            getCriterion("1.1.1")!,
            context,
            {
                criteria: {
                    "1.1.1": false
                }
            }
        );

        expect(result.status).toBe("disabled");
    });

    it("respects conformance targets", async () => {
        const result = await runCriterion(
            getCriterion("1.4.6")!,
            context,
            {
                target: "AA"
            }
        );

        expect(result.status).toBe("disabled");
    });
});

describe("Category Runner", () => {
    it("runs text alternative criteria", async () => {
        const result = await runCategory(
            "text-alternatives",
            context,
            {}
        );

        expect(result.criteria).toHaveLength(1);
        expect(result.status).toBe("not_tested");
    });

    it("runs all navigable criteria", async () => {
        const result = await runCategory(
            "navigable",
            context,
            {}
        );

        expect(result.criteria).toHaveLength(13);
    });

    it("respects disabled categories", async () => {
        const result = await runCategory(
            "text-alternatives",
            context,
            {
                categories: {
                    "text-alternatives": false
                }
            }
        );

        expect(result.status).toBe("disabled");
    });
});

describe("Audit Runner", () => {
    it("contains all 13 categories", async () => {
        const result = await runAudit(
            context,
            {}
        );

        expect(result.categories).toHaveLength(13);
    });

    it("contains all 86 criteria", async () => {
        const result = await runAudit(
            context,
            {}
        );

        const criteria = result.categories.flatMap(
            category => category.criteria
        );

        expect(criteria).toHaveLength(86);
    });

    it("reports incomplete audits", async () => {
        const result = await runAudit(
            context,
            {}
        );

        expect(result.status).toBe("not_tested");
    });

    it("respects global disable", async () => {
        const result = await runAudit(
            context,
            {
                enabled: false
            }
        );

        expect(result.status).toBe("disabled");
    });

    it("records audit metadata", async () => {
        const result = await runAudit(
            context,
            {
                target: "AAA"
            }
        );

        expect(result.version).toBe("2.2");
        expect(result.target).toBe("AAA");
        expect(result.url).toBe(context.url);
        expect(result.durationMs)
            .toBeGreaterThanOrEqual(0);
    });
});