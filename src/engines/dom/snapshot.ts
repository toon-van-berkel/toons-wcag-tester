import type {
    Locator,
    Page
} from "playwright";

import {
    DOMAttributeEngine
} from "./attributes.js";

import type {
    DOMAttributeResult
} from "./attributes.js";

import {
    DOMSelectorEngine
} from "./selector.js";

import type {
    DOMSelectorResult
} from "./selector.js";

import {
    DOMVisibilityEngine
} from "./visibility.js";

import type {
    DOMVisibilityResult
} from "./visibility.js";

import {
    DOMStyleEngine
} from "./styles.js";

import type {
    DOMStyleOptions,
    DOMStyleResult
} from "./styles.js";

import {
    DOMContextEngine
} from "./context.js";

import type {
    DOMContextOptions,
    DOMContextResult
} from "./context.js";

import {
    DOMFrameEngine
} from "./frame.js";

import type {
    DOMFrameReference
} from "./frame.js";

import {
    DOMShadowEngine
} from "./shadow.js";

import type {
    DOMShadowElementReference
} from "./shadow.js";

export type DOMSnapshotStatus =
    | "complete"
    | "partial"
    | "error";

export type DOMSnapshotConsistency =
    | "verified"
    | "changed"
    | "unknown";

export type DOMSnapshotSection =
    | "identity"
    | "frame"
    | "attributes"
    | "visibility"
    | "styles"
    | "context";

export interface DOMSnapshotOptions {
    attributes?: boolean;
    visibility?: boolean;
    styles?: boolean;
    context?: boolean;

    styleOptions?: DOMStyleOptions;
    contextOptions?: DOMContextOptions;

    targetTimeoutMs?: number;
}

export interface DOMSnapshotError {
    section:
        | DOMSnapshotSection
        | "target"
        | "consistency";

    message: string;
}

export interface DOMSnapshotIdentity {
    selector: DOMSelectorResult;

    shadow: DOMShadowElementReference;
}

export interface DOMElementSnapshot {
    status: DOMSnapshotStatus;

    consistency: DOMSnapshotConsistency;

    capturedAt: string;
    finishedAt: string;

    durationMs: number;

    requestedSections: DOMSnapshotSection[];
    completedSections: DOMSnapshotSection[];

    identity: DOMSnapshotIdentity | null;

    frame: DOMFrameReference | null;

    attributes: DOMAttributeResult | null;

    visibility: DOMVisibilityResult | null;

    styles: DOMStyleResult | null;

    context: DOMContextResult | null;

    errors: DOMSnapshotError[];
}

export interface DOMSnapshotBatchResult {
    snapshots: DOMElementSnapshot[];

    totalCount: number;

    completeCount: number;
    partialCount: number;
    errorCount: number;

    incomplete: boolean;

    durationMs: number;
}

export class DOMSnapshotEngine {
    private readonly selectors =
        new DOMSelectorEngine();

    private readonly attributes =
        new DOMAttributeEngine();

    private readonly visibility =
        new DOMVisibilityEngine();

    private readonly styles =
        new DOMStyleEngine();

    private readonly context =
        new DOMContextEngine();

    private readonly frames: DOMFrameEngine;

    private readonly shadow: DOMShadowEngine;

    constructor(page: Page) {
        this.frames = new DOMFrameEngine(page);

        this.shadow = new DOMShadowEngine(page);
    }

    private getErrorMessage(
        error: unknown
    ): string {
        return error instanceof Error
            ? error.message
            : String(error);
    }

    private getRequestedSections(
        options: DOMSnapshotOptions
    ): DOMSnapshotSection[] {
        const sections: DOMSnapshotSection[] = [
            "identity",
            "frame"
        ];

        if (options.attributes ?? true) {
            sections.push("attributes");
        }

        if (options.visibility ?? true) {
            sections.push("visibility");
        }

        if (options.styles ?? true) {
            sections.push("styles");
        }

        if (options.context ?? true) {
            sections.push("context");
        }

        return sections;
    }

    private validateOptions(
        options: DOMSnapshotOptions
    ): void {
        const timeout = options.targetTimeoutMs;

        if (
            timeout !== undefined &&
            (
                !Number.isSafeInteger(timeout) ||
                timeout <= 0
            )
        ) {
            throw new Error(
                "targetTimeoutMs must be a positive safe integer."
            );
        }
    }

    async capture(
        locator: Locator,
        options: DOMSnapshotOptions = {}
    ): Promise<DOMElementSnapshot> {
        this.validateOptions(options);

        const startedAt = performance.now();

        const timeout =
            options.targetTimeoutMs ?? 10_000;

        const requestedSections =
            this.getRequestedSections(options);

        const snapshot: DOMElementSnapshot = {
            status: "error",

            consistency: "unknown",

            capturedAt:
                new Date().toISOString(),

            finishedAt: "",

            durationMs: 0,

            requestedSections,
            completedSections: [],

            identity: null,

            frame: null,

            attributes: null,

            visibility: null,

            styles: null,

            context: null,

            errors: []
        };

        function finish(): DOMElementSnapshot {
            snapshot.finishedAt =
                new Date().toISOString();

            snapshot.durationMs =
                performance.now() - startedAt;

            return snapshot;
        }

        // Resolve the initial target element.
        //
        // The element handle is used to verify that
        // subsequent locator operations still refer
        // to the same DOM element.

        let handle: Awaited<
            ReturnType<Locator["elementHandle"]>
        >;

        try {
            handle = await locator.elementHandle({
                timeout
            });

        } catch (error) {
            snapshot.errors.push({
                section: "target",

                message:
                    this.getErrorMessage(error)
            });

            return finish();
        }

        try {
            snapshot.status = "partial";

            // Verify target identity before and after
            // each requested inspection.

            const verifyTarget =
                async (): Promise<boolean> => {
                    try {
                        const connected =
                            await handle.evaluate(
                                element =>
                                    element.isConnected
                            );

                        if (!connected) {
                            snapshot.consistency =
                                "changed";

                            snapshot.errors.push({
                                section: "consistency",

                                message:
                                    "Target element was detached during capture."
                            });

                            return false;
                        }

                        const sameElement =
                            await locator.evaluate(
                                (element, original) =>
                                    element === original,

                                handle,

                                { timeout }
                            );

                        if (!sameElement) {
                            snapshot.consistency =
                                "changed";

                            snapshot.errors.push({
                                section: "consistency",

                                message:
                                    "Locator resolved to a different element during capture."
                            });

                            return false;
                        }

                        snapshot.consistency =
                            "verified";

                        return true;

                    } catch (error) {
                        snapshot.consistency =
                            "unknown";

                        snapshot.errors.push({
                            section: "consistency",

                            message:
                                this.getErrorMessage(error)
                        });

                        return false;
                    }
                };

            let canContinue = true;

            const captureSection = async <T>(
                section: DOMSnapshotSection,

                execute: () => Promise<T>,

                assign: (value: T) => void
            ): Promise<void> => {
                if (
                    !canContinue ||
                    !requestedSections.includes(section)
                ) {
                    return;
                }

                if (!(await verifyTarget())) {
                    canContinue = false;
                    return;
                }

                try {
                    const result = await execute();

                    if (!(await verifyTarget())) {
                        canContinue = false;

                        return;
                    }

                    assign(result);

                    snapshot.completedSections.push(
                        section
                    );

                } catch (error) {
                    snapshot.errors.push({
                        section,

                        message:
                            this.getErrorMessage(error)
                    });

                    // An individual inspection failure
                    // does not prevent other sections
                    // from being captured if the target
                    // remains valid.

                    if (!(await verifyTarget())) {
                        canContinue = false;
                    }
                }
            };

            // Element identity.

            await captureSection(
                "identity",

                async () => {
                    const selector =
                        await this.selectors.generate(
                            locator
                        );

                    const shadow =
                        await this.shadow.identify(
                            locator
                        );

                    return {
                        selector,
                        shadow
                    };
                },

                result => {
                    snapshot.identity = result;
                }
            );

            // Frame identification.

            await captureSection(
                "frame",

                async () => {
                    const ownerFrame =
                        await handle.ownerFrame();

                    if (!ownerFrame) {
                        throw new Error(
                            "Unable to identify the element's owner frame."
                        );
                    }

                    const discovery =
                        await this.frames.discover();

                    const entry =
                        discovery.frames.find(
                            candidate =>
                                candidate.frame === ownerFrame
                        );

                    if (!entry) {
                        throw new Error(
                            "Owner frame was not found in the discovered frame tree."
                        );
                    }

                    if (
                        entry.reference.status !==
                        "available"
                    ) {
                        throw new Error(
                            entry.reference.error ??
                            "Owner frame is unavailable."
                        );
                    }

                    return {
                        ...entry.reference,

                        path: [
                            ...entry.reference.path
                        ]
                    };
                },

                result => {
                    snapshot.frame = result;
                }
            );

            // Attribute extraction.

            await captureSection(
                "attributes",

                () => this.attributes.getAttributes(
                    locator
                ),

                result => {
                    snapshot.attributes = result;
                }
            );

            // Visibility extraction.

            await captureSection(
                "visibility",

                () => this.visibility.inspect(
                    locator
                ),

                result => {
                    snapshot.visibility = result;
                }
            );

            // Computed CSS extraction.

            await captureSection(
                "styles",

                () => this.styles.inspect(
                    locator,

                    options.styleOptions
                ),

                result => {
                    snapshot.styles = result;
                }
            );

            // Structural context extraction.

            await captureSection(
                "context",

                () => this.context.inspect(
                    locator,

                    options.contextOptions
                ),

                result => {
                    snapshot.context = result;
                }
            );

            // Final consistency verification.

            if (canContinue) {
                canContinue =
                    await verifyTarget();
            }

            const allSectionsCompleted =
                snapshot.completedSections.length ===
                snapshot.requestedSections.length;

            snapshot.status =
                allSectionsCompleted &&
                snapshot.errors.length === 0 &&
                snapshot.consistency === "verified" &&
                canContinue
                    ? "complete"
                    : "partial";

        } finally {
            try {
                await handle.dispose();

            } catch (error) {
                snapshot.errors.push({
                    section: "target",

                    message:
                        "Unable to release target handle: " +
                        this.getErrorMessage(error)
                });

                snapshot.status = "partial";
            }
        }

        return finish();
    }

    async captureAll(
        locators: readonly Locator[],
        options: DOMSnapshotOptions = {}
    ): Promise<DOMSnapshotBatchResult> {
        this.validateOptions(options);

        const startedAt = performance.now();

        const snapshots: DOMElementSnapshot[] = [];

        // Sequential capture limits browser load
        // and preserves the input order.

        for (const locator of locators) {
            const snapshot = await this.capture(
                locator,
                options
            );

            snapshots.push(snapshot);
        }

        const completeCount =
            snapshots.filter(
                snapshot =>
                    snapshot.status === "complete"
            ).length;

        const partialCount =
            snapshots.filter(
                snapshot =>
                    snapshot.status === "partial"
            ).length;

        const errorCount =
            snapshots.filter(
                snapshot =>
                    snapshot.status === "error"
            ).length;

        return {
            snapshots,

            totalCount: snapshots.length,

            completeCount,
            partialCount,
            errorCount,

            incomplete:
                partialCount > 0 ||
                errorCount > 0,

            durationMs:
                performance.now() - startedAt
        };
    }
}