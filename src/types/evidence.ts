import type { ElementReference } from "./element.js";
import type { PageReference } from "./page.js";

export type EvidenceType =
    | "element"
    | "html"
    | "text"
    | "image"
    | "screenshot"
    | "recording"
    | "measurement"
    | "comparison"
    | "accessibility_tree"
    | "interaction"
    | "metadata";

export interface EvidenceAsset {
    path: string;
    mimeType: string;

    filename?: string;
    sizeBytes?: number;
    contentHash?: string;

    width?: number;
    height?: number;

    durationMs?: number;
}

export interface EvidenceMeasurement {
    name: string;

    actual: number | string;
    expected?: number | string;

    unit?: string;
}

export interface TestEvidence {
    id?: string;
    type?: EvidenceType;

    title?: string;
    description?: string;

    page?: PageReference;
    element?: ElementReference;

    asset?: EvidenceAsset;
    measurements?: EvidenceMeasurement[];

    relatedEvidenceIds?: string[];

    metadata?: Record<
        string,
        string | number | boolean | null
    >;

    capturedAt?: string;

    // Existing fields retained for compatibility.

    url?: string;
    selector?: string;
    html?: string;
    screenshot?: string;
    expected?: string;
    actual?: string;
}