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
    normalizeAXText
} from "./computation.js";

import type {
    AXTextState,
    AXComputationSource,
    AXComputationSourceStatus
} from "./computation.js";

export type AccessibleNameState =
    AXTextState;

export type AccessibleNameSourceStatus =
    AXComputationSourceStatus;

export type AccessibleNameSource =
    AXComputationSource;

export interface AccessibleNameResult {
    state: AccessibleNameState;

    rawName: string | null;

    normalizedName: string | null;

    hasName: boolean | null;

    role: string | null;

    ignored: boolean | null;

    sources: AccessibleNameSource[];

    contributingSources:
        AccessibleNameSource[];

    referencedNodes: AXRelatedNode[];

    computation: AXValue | null;

    inspection: AXElementResult;
}

export class AccessibleNameEngine {
    private readonly elements:
        AccessibilityElementEngine;

    constructor(page: Page) {
        this.elements =
            new AccessibilityElementEngine(page);
    }

    normalize(name: string): string {
        return normalizeAXText(name);
    }

    fromInspection(
        inspection: AXElementResult
    ): AccessibleNameResult {
        if (
            inspection.status === "error" ||
            inspection.consistency !== "verified" ||
            !inspection.node
        ) {
            return {
                state: "unavailable",

                rawName: null,

                normalizedName: null,

                hasName: null,

                role: null,

                ignored: null,

                sources: [],

                contributingSources: [],

                referencedNodes: [],

                computation: null,

                inspection
            };
        }

        const node = inspection.node;

        const computation =
            computeAXText(node.name);

        return {
            state: computation.state,

            rawName:
                computation.rawText,

            normalizedName:
                computation.normalizedText,

            hasName:
                computation.hasText,

            role: node.role,

            ignored: node.ignored,

            sources:
                computation.sources,

            contributingSources:
                computation.contributingSources,

            referencedNodes:
                computation.referencedNodes,

            computation:
                computation.computation,

            inspection
        };
    }

    async inspect(
        locator: Locator,
        options: AXElementOptions = {}
    ): Promise<AccessibleNameResult> {
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