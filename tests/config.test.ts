import { describe, expect, it } from "vitest";

import {
    getDefaultConfig,
    validateConfig,
    mergeConfig,
    getEnabledCriteria,
    getDisabledCriteria,
    getEnabledCategories,
    isRuleEnabled
} from "../src/config/index.js";

import { getCriterion } from "../src/registry/index.js";

describe("WCAG Configuration Engine", () => {
    it("loads valid defaults", () => {
        expect(() => {
            validateConfig(getDefaultConfig());
        }).not.toThrow();
    });

    it("enables all 86 criteria by default", () => {
        expect(
            getEnabledCriteria(getDefaultConfig())
        ).toHaveLength(86);
    });

    it("supports target A", () => {
        expect(
            getEnabledCriteria({ target: "A" })
        ).toHaveLength(31);
    });

    it("supports target AA", () => {
        expect(
            getEnabledCriteria({ target: "AA" })
        ).toHaveLength(55);
    });

    it("supports target AAA", () => {
        expect(
            getEnabledCriteria({ target: "AAA" })
        ).toHaveLength(86);
    });

    it("disables the entire audit", () => {
        expect(
            getEnabledCriteria({ enabled: false })
        ).toHaveLength(0);
    });

    it("disables principles", () => {
        expect(
            getEnabledCriteria({
                principles: {
                    perceivable: false
                }
            })
        ).toHaveLength(57);
    });

    it("disables categories", () => {
        expect(
            getEnabledCriteria({
                categories: {
                    "time-based-media": false
                }
            })
        ).toHaveLength(77);
    });

    it("disables individual criteria", () => {
        expect(
            getEnabledCriteria({
                criteria: {
                    "1.1.1": false
                }
            })
        ).toHaveLength(85);
    });

    it("supports all 13 categories", () => {
        expect(
            getEnabledCategories({})
        ).toHaveLength(13);
    });

    it("reports disabled criteria", () => {
        expect(
            getDisabledCriteria({ target: "A" })
        ).toHaveLength(55);
    });

    it("respects configuration hierarchy", () => {
        expect(
            getEnabledCriteria({
                principles: {
                    perceivable: false
                },
                categories: {
                    "text-alternatives": true
                },
                criteria: {
                    "1.1.1": true
                }
            }).some(criterion => criterion.id === "1.1.1")
        ).toBe(false);
    });

    it("rejects invalid targets", () => {
        expect(() => {
            validateConfig({ target: "AAAA" });
        }).toThrow();
    });

    it("rejects unknown criteria", () => {
        expect(() => {
            validateConfig({
                criteria: {
                    "9.9.9": true
                }
            });
        }).toThrow();
    });

    it("rejects unknown categories", () => {
        expect(() => {
            validateConfig({
                categories: {
                    unknown: true
                }
            });
        }).toThrow();
    });

    it("merges custom configuration with defaults", () => {
        const config = mergeConfig(
            getDefaultConfig(),
            {
                target: "AA",
                categories: {
                    "text-alternatives": false
                }
            }
        );

        expect(config.target).toBe("AA");

        expect(
            config.categories?.["text-alternatives"]
        ).toBe(false);

        expect(
            config.categories?.["time-based-media"]
        ).toBe(true);
    });

    it("supports individual rule toggles", () => {
        const criterion = getCriterion("1.1.1")!;

        expect(
            isRuleEnabled("img-alt-missing", criterion, {
                rules: {
                    "img-alt-missing": false
                }
            })
        ).toBe(false);
    });
});