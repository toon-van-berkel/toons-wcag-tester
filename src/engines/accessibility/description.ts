import type {
    Locator,
    Page
} from "playwright";

import {
    AccessibilityElementEngine
} from "./element.js";

import type {
    AXElementOptions,
    AXElementResult
} from "./element.js";

import type {
    AXRelatedNode,
    AXValue
} from "./types.js";

import {
    computeAXText,
    normalizeAXText,
    deduplicateAXReferences
} from "./computation.js";

import type {
    AXTextState,
    AXComputationSource,
    AXComputationSourceStatus
} from "./computation.js";

export type AccessibleDescriptionState =
    AXTextState;

export type AccessibleDescriptionSourceStatus =
    AXComputationSourceStatus;

export type AccessibleDescriptionSource =
    AXComputationSource;

export type AXSourceAvailability =
    | "reported"
    | "not_reported"
    | "unavailable";

export interface AccessibleDescriptionResult {
    state: AccessibleDescriptionState;

    rawDescription: string | null;

    normalizedDescription: string | null;

    hasDescription: boolean | null;

    role: string | null;

    ignored: boolean | null;

    sourceAvailability: AXSourceAvailability;

    sources: AccessibleDescriptionSource[];

    contributingSources:
        AccessibleDescriptionSource[];

    referencedNodes: AXRelatedNode[];

    describedByNodes: AXRelatedNode[];

    describedByProperty: AXValue | null;

    computation: AXValue | null;

    inspection: AXElementResult;
}

export class AccessibleDescriptionEngine {
    private readonly elements:
        AccessibilityElementEngine;

    constructor(page: Page) {
        this.elements =
            new AccessibilityElementEngine(page);
    }

    normalize(description: string): string {
        return normalizeAXText(description);
    }

    fromInspection(
        inspection: AXElementResult
    ): AccessibleDescriptionResult {
        if (
            inspection.status === "error" ||
            inspection.consistency !== "verified" ||
            !inspection.node
        ) {
            return {
                state: "unavailable",

                rawDescription: null,

                normalizedDescription: null,

                hasDescription: null,

                role: null,

                ignored: null,

                sourceAvailability:
                    "unavailable",

                sources: [],

                contributingSources: [],

                referencedNodes: [],

                describedByNodes: [],

                describedByProperty: null,

                computation: null,

                inspection
            };
        }

        const node = inspection.node;

        const computation =
            computeAXText(
                node.description
            );

        const describedByProperty =
            node.properties.find(
                property =>
                    property.name ===
                    "describedby"
            )?.value ?? null;

        const describedByNodes =
            deduplicateAXReferences(
                describedByProperty?.relatedNodes ?? []
            );

        return {
            state: computation.state,

            rawDescription:
                computation.rawText,

            normalizedDescription:
                computation.normalizedText,

            hasDescription:
                computation.hasText,

            role: node.role,

            ignored: node.ignored,

            sourceAvailability:
                computation.sources.length > 0
                    ? "reported"
                    : "not_reported",

            sources:
                computation.sources,

            contributingSources:
                computation.contributingSources,

            referencedNodes:
                computation.referencedNodes,

            describedByNodes,

            describedByProperty,

            computation:
                computation.computation,

            inspection
        };
    }

    async inspect(
        locator: Locator,
        options: AXElementOptions = {}
    ): Promise<AccessibleDescriptionResult> {
        const inspection =
            await this.elements.inspect(
                locator,
                options
            );

        return this.fromInspection(
            inspection
        );
    }
}