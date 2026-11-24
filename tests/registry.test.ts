import { describe, expect, it } from "vitest";

import {
    principles,
    categories,
    criteria,
    getCriteriaByLevel,
    getCriteriaByTarget,
    getCriteriaByCategory,
    getCriterion
} from "../src/registry/index.js";

describe("WCAG 2.2 Registry", () => {

    it("contains 4 principles", () => {
        expect(Object.keys(principles)).toHaveLength(4);
    });

    it("contains 13 categories", () => {
        expect(Object.keys(categories)).toHaveLength(13);
    });

    it("contains 86 success criteria", () => {
        expect(criteria).toHaveLength(86);
    });

    it("contains unique criterion IDs", () => {
        const ids = criteria.map(criterion => criterion.id);

        expect(new Set(ids).size).toBe(86);
    });

    it("contains the correct level distribution", () => {
        expect(getCriteriaByLevel("A")).toHaveLength(31);
        expect(getCriteriaByLevel("AA")).toHaveLength(24);
        expect(getCriteriaByLevel("AAA")).toHaveLength(31);
    });

    it("supports cumulative conformance targets", () => {
        expect(getCriteriaByTarget("A")).toHaveLength(31);
        expect(getCriteriaByTarget("AA")).toHaveLength(55);
        expect(getCriteriaByTarget("AAA")).toHaveLength(86);
    });

    it("supports category filtering", () => {
        expect(
            getCriteriaByCategory("text-alternatives")
        ).toHaveLength(1);

        expect(
            getCriteriaByCategory("navigable")
        ).toHaveLength(13);
    });

    it("excludes removed criterion 4.1.1", () => {
        expect(getCriterion("4.1.1")).toBeUndefined();
    });

    it("contains consistent principle mappings", () => {
        for (const criterion of criteria) {
            expect(criterion.principle).toBe(
                categories[criterion.category].principle
            );
        }
    });
});