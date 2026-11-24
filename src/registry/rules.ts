import type {
    TestRule,
    WCAGCriterionId
} from "../types/index.js";

import { getCriterion } from "./index.js";

const rules = new Map<string, TestRule>();

export function registerRule(rule: TestRule): void {
    if (rules.has(rule.id)) {
        throw new Error(
            `Duplicate rule ID: ${rule.id}`
        );
    }

    if (!getCriterion(rule.criterionId)) {
        throw new Error(
            `Unknown WCAG criterion: ${rule.criterionId}`
        );
    }

    rules.set(rule.id, rule);
}

export function getRule(
    id: string
): TestRule | undefined {
    return rules.get(id);
}

export function getRules(): TestRule[] {
    return [...rules.values()];
}

export function getRulesByCriterion(
    criterionId: WCAGCriterionId
): TestRule[] {
    return getRules().filter(
        rule => rule.criterionId === criterionId
    );
}