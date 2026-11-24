import type { WCAGCriterionId } from "./wcag.js";
import type { TestEvidence } from "./evidence.js";
import type { ElementReference } from "./element.js";
import type { PageReference } from "./page.js";

export type ReviewStatus =
    | "pending"
    | "pass"
    | "fail"
    | "not_applicable"
    | "insufficient_evidence";

export type ReviewType =
    | "image"
    | "text"
    | "media"
    | "structure"
    | "layout"
    | "keyboard"
    | "interaction"
    | "form"
    | "comparison"
    | "general";

export type ReviewQuestionType =
    | "boolean"
    | "single_choice"
    | "multiple_choice"
    | "text";

export type ReviewAnswer =
    | boolean
    | string
    | string[];

export interface ReviewOption {
    value: string;
    label: string;
    description?: string;
}

export interface ReviewQuestion {
    id: string;

    question: string;
    description?: string;

    type: ReviewQuestionType;
    required: boolean;

    options?: ReviewOption[];
}

export interface ReviewConditions {
    pass: string[];
    fail: string[];
    notApplicable?: string[];
}

export interface ReviewOccurrence {
    id: string;

    page: PageReference;
    element?: ElementReference;

    evidenceIds?: string[];
}

export interface ReviewDecision {
    reviewId: string;
    fingerprint?: string;

    status: Exclude<ReviewStatus, "pending">;

    answers: Record<string, ReviewAnswer>;

    reviewedBy: string;
    reviewedAt: string;

    notes?: string;
}

export interface ReviewItem {
    id: string;

    criterionId: WCAGCriterionId;

    ruleId: string;
    ruleVersion: string;

    type: ReviewType;
    status: ReviewStatus;

    title: string;
    description: string;

    instructions: string[];

    questions: ReviewQuestion[];
    conditions: ReviewConditions;

    evidence: TestEvidence[];

    occurrences: ReviewOccurrence[];

    fingerprint?: string;

    reference: string;

    decision?: ReviewDecision;
}