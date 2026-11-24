import type {
    WCAGConfig,
    WCAGCriterion,
    WCAGCategory,
    WCAGLevel
} from "../types/index.js";

import { criteria } from "../registry/index.js";

const levelRank: Record<WCAGLevel, number> = {
    A: 1,
    AA: 2,
    AAA: 3
};

export function isCriterionEnabled(
    criterion: WCAGCriterion,
    config: WCAGConfig
): boolean {
    if (config.enabled === false) {
        return false;
    }

    if (
        levelRank[criterion.level] >
        levelRank[config.target ?? "AAA"]
    ) {
        return false;
    }

    if (config.principles?.[criterion.principle] === false) {
        return false;
    }

    if (config.categories?.[criterion.category] === false) {
        return false;
    }

    if (config.criteria?.[criterion.id] === false) {
        return false;
    }

    return true;
}

export function getEnabledCriteria(
    config: WCAGConfig
): WCAGCriterion[] {
    return criteria.filter(
        criterion => isCriterionEnabled(criterion, config)
    );
}

export function getDisabledCriteria(
    config: WCAGConfig
): WCAGCriterion[] {
    return criteria.filter(
        criterion => !isCriterionEnabled(criterion, config)
    );
}

export function getEnabledCategories(
    config: WCAGConfig
): WCAGCategory[] {
    return [
        ...new Set(
            getEnabledCriteria(config).map(
                criterion => criterion.category
            )
        )
    ];
}

export function isRuleEnabled(
    ruleId: string,
    criterion: WCAGCriterion,
    config: WCAGConfig
): boolean {
    return (
        isCriterionEnabled(criterion, config) &&
        config.rules?.[ruleId] !== false
    );
}