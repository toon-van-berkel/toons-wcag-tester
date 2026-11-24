import type {
    WCAGLevel,
    WCAGPrinciple,
    WCAGCategory,
    WCAGCriterionId
} from "./wcag.js";

export interface WCAGConfig {
    $schema?: string;
    version?: 1;
    enabled?: boolean;
    target?: WCAGLevel;

    principles?: Partial<Record<WCAGPrinciple, boolean>>;
    categories?: Partial<Record<WCAGCategory, boolean>>;
    criteria?: Partial<Record<WCAGCriterionId, boolean>>;
    rules?: Record<string, boolean>;
}