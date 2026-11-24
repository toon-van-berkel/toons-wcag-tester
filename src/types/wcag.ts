import type { CriterionCoveragePlan } from "./coverage.js";

export type WCAGVersion = "2.2";

export type WCAGLevel =
    | "A"
    | "AA"
    | "AAA";

export type WCAGPrinciple =
    | "perceivable"
    | "operable"
    | "understandable"
    | "robust";

export type WCAGCategory =
    | "text-alternatives"
    | "time-based-media"
    | "adaptable"
    | "distinguishable"
    | "keyboard-accessible"
    | "enough-time"
    | "seizures-and-physical-reactions"
    | "navigable"
    | "input-modalities"
    | "readable"
    | "predictable"
    | "input-assistance"
    | "compatible";

export type WCAGCriterionId =
    `${number}.${number}.${number}`;

export interface WCAGCriterion {
    id: WCAGCriterionId;
    name: string;
    level: WCAGLevel;
    principle: WCAGPrinciple;
    category: WCAGCategory;
    description: string;
    reference: string;

    coveragePlan?: CriterionCoveragePlan;
}