import { criteria } from "./criteria.js";

import type {
    WCAGCategory,
    WCAGCriterionId,
    WCAGLevel,
    WCAGPrinciple
} from "../types/index.js";

export * from "./principles.js";
export * from "./categories.js";
export * from "./criteria.js";

const levelRank: Record<WCAGLevel, number> = {
    A: 1,
    AA: 2,
    AAA: 3
};

export function getCriterion(id: WCAGCriterionId) {
    return criteria.find(criterion => criterion.id === id);
}

export function getCriteriaByPrinciple(
    principle: WCAGPrinciple
) {
    return criteria.filter(
        criterion => criterion.principle === principle
    );
}

export function getCriteriaByCategory(
    category: WCAGCategory
) {
    return criteria.filter(
        criterion => criterion.category === category
    );
}

export function getCriteriaByLevel(level: WCAGLevel) {
    return criteria.filter(
        criterion => criterion.level === level
    );
}

export function getCriteriaByTarget(target: WCAGLevel) {
    return criteria.filter(
        criterion => levelRank[criterion.level] <= levelRank[target]
    );
}

export * from "./rules.js";