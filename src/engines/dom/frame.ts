import type {
    Frame,
    Page
} from "playwright";

import { DOMQueryEngine } from "./query.js";

import type {
    DOMQueryResult
} from "./types.js";

export type DOMFrameStatus =
    | "available"
    | "detached"
    | "error";

export interface DOMFrameOptions {
    includeMainFrame?: boolean;

    maxDepth?: number;
    maxFrames?: number;
}

export interface DOMFrameReference {
    id: string;

    parentId: string | null;

    path: number[];

    depth: number;
    index: number;

    url: string;
    name: string;
    title: string | null;

    origin: string | null;
    crossOrigin: boolean | null;

    isMainFrame: boolean;

    status: DOMFrameStatus;

    error: string | null;
}

export interface DOMFrameEntry {
    frame: Frame;

    reference: DOMFrameReference;
}

export interface DOMFrameDiscoveryResult {
    frames: DOMFrameEntry[];

    totalDiscovered: number;
    returnedCount: number;

    availableCount: number;
    detachedCount: number;
    errorCount: number;

    skippedByDepth: number;
    skippedByLimit: number;

    truncated: boolean;
}

export interface DOMFrameQueryResult {
    reference: DOMFrameReference;

    result: DOMQueryResult | null;

    error: string | null;
}

export interface DOMFrameQueryOptions
    extends DOMFrameOptions {
    limitPerFrame?: number;
}

export interface DOMMultiFrameQueryResult {
    selector: string;

    discovery: DOMFrameDiscoveryResult;

    results: DOMFrameQueryResult[];

    totalMatches: number;
    returnedMatches: number;

    incomplete: boolean;
}

export class DOMFrameEngine {
    constructor(
        private readonly page: Page
    ) {}

    private validateLimit(
        name: string,
        value: number | undefined
    ): void {
        if (value === undefined) {
            return;
        }

        if (
            !Number.isSafeInteger(value) ||
            value < 0
        ) {
            throw new Error(
                `${name} must be a non-negative safe integer.`
            );
        }
    }

    private getFrameId(
        path: readonly number[]
    ): string {
        if (path.length === 0) {
            return "main";
        }

        return `main.${path.join(".")}`;
    }

    private async inspectFrame(
        frame: Frame,
        path: number[],
        parentOrigin: string | null
    ): Promise<DOMFrameReference> {
        const isMainFrame =
            path.length === 0;

        const parentId =
            isMainFrame
                ? null
                : this.getFrameId(
                    path.slice(0, -1)
                );

        const reference: DOMFrameReference = {
            id: this.getFrameId(path),

            parentId,

            path: [...path],

            depth: path.length,

            index:
                path[path.length - 1] ?? 0,

            url: frame.url(),
            name: frame.name(),
            title: null,

            origin: null,
            crossOrigin: null,

            isMainFrame,

            status: "available",

            error: null
        };

        if (frame.isDetached()) {
            reference.status = "detached";

            reference.error =
                "Frame was detached before inspection.";

            return reference;
        }

        try {
            const metadata = await frame.evaluate(
                () => ({
                    url: document.URL,
                    title: document.title,

                    origin:
                        window.origin === "null"
                            ? null
                            : window.origin
                })
            );

            reference.url = metadata.url;
            reference.title = metadata.title;
            reference.origin = metadata.origin;

            reference.crossOrigin =
                isMainFrame
                    ? false
                    : parentOrigin !== null &&
                        metadata.origin !== null
                        ? parentOrigin !== metadata.origin
                        : null;

            if (frame.isDetached()) {
                reference.status = "detached";

                reference.error =
                    "Frame was detached during inspection.";
            }

        } catch (error) {
            reference.status =
                frame.isDetached()
                    ? "detached"
                    : "error";

            reference.error =
                error instanceof Error
                    ? error.message
                    : String(error);
        }

        return reference;
    }

    async discover(
        options: DOMFrameOptions = {}
    ): Promise<DOMFrameDiscoveryResult> {
        this.validateLimit(
            "maxDepth",
            options.maxDepth
        );

        this.validateLimit(
            "maxFrames",
            options.maxFrames
        );

        const includeMainFrame =
            options.includeMainFrame ?? true;

        const maxDepth =
            options.maxDepth ??
            Number.MAX_SAFE_INTEGER;

        const maxFrames =
            options.maxFrames ??
            Number.MAX_SAFE_INTEGER;

        // Capture the currently attached frame tree.

        const captured: {
            frame: Frame;
            path: number[];
        }[] = [];

        const visited = new Set<Frame>();

        function capture(
            frame: Frame,
            path: number[]
        ): void {
            if (visited.has(frame)) {
                return;
            }

            visited.add(frame);

            captured.push({
                frame,
                path
            });

            const children =
                frame.childFrames();

            children.forEach(
                (child, index) => {
                    capture(
                        child,
                        [...path, index]
                    );
                }
            );
        }

        capture(
            this.page.mainFrame(),
            []
        );

        const entries: DOMFrameEntry[] = [];

        const origins =
            new Map<string, string | null>();

        let skippedByDepth = 0;
        let skippedByLimit = 0;

        const selected = captured.filter(
            item =>
                includeMainFrame ||
                item.path.length > 0
        );

        for (const item of captured) {
            const isMainFrame =
                item.path.length === 0;

            // Inspect the main frame for parent-origin
            // metadata even when it is not returned.

            if (
                isMainFrame &&
                !includeMainFrame
            ) {
                const reference =
                    await this.inspectFrame(
                        item.frame,
                        item.path,
                        null
                    );

                origins.set(
                    reference.id,
                    reference.origin
                );

                continue;
            }

            if (item.path.length > maxDepth) {
                skippedByDepth++;
                continue;
            }

            if (entries.length >= maxFrames) {
                skippedByLimit++;
                continue;
            }

            const parentId =
                this.getFrameId(
                    item.path.slice(0, -1)
                );

            const parentOrigin =
                isMainFrame
                    ? null
                    : origins.get(parentId) ?? null;

            const reference =
                await this.inspectFrame(
                    item.frame,
                    item.path,
                    parentOrigin
                );

            origins.set(
                reference.id,
                reference.origin
            );

            entries.push({
                frame: item.frame,
                reference
            });
        }

        const availableCount =
            entries.filter(
                entry =>
                    entry.reference.status ===
                    "available"
            ).length;

        const detachedCount =
            entries.filter(
                entry =>
                    entry.reference.status ===
                    "detached"
            ).length;

        const errorCount =
            entries.filter(
                entry =>
                    entry.reference.status ===
                    "error"
            ).length;

        return {
            frames: entries,

            totalDiscovered: selected.length,
            returnedCount: entries.length,

            availableCount,
            detachedCount,
            errorCount,

            skippedByDepth,
            skippedByLimit,

            truncated:
                skippedByDepth > 0 ||
                skippedByLimit > 0
        };
    }

    async queryAll(
        selector: string,
        options: DOMFrameQueryOptions = {}
    ): Promise<DOMMultiFrameQueryResult> {
        if (selector.trim().length === 0) {
            throw new Error(
                "DOM query selector cannot be empty."
            );
        }

        this.validateLimit(
            "limitPerFrame",
            options.limitPerFrame
        );

        const discovery =
            await this.discover(options);

        const results: DOMFrameQueryResult[] = [];

        let totalMatches = 0;
        let returnedMatches = 0;

        let incomplete =
            discovery.truncated ||
            discovery.detachedCount > 0 ||
            discovery.errorCount > 0;

        for (const entry of discovery.frames) {
            if (
                entry.reference.status !==
                "available"
            ) {
                results.push({
                    reference: entry.reference,
                    result: null,
                    error: entry.reference.error
                });

                incomplete = true;

                continue;
            }

            try {
                const query =
                    new DOMQueryEngine(entry.frame);

                const result = await query.query(
                    selector,
                    options.limitPerFrame === undefined
                        ? {}
                        : {
                            limit:
                                options.limitPerFrame
                        }
                );

                totalMatches += result.totalCount;

                returnedMatches +=
                    result.returnedCount;

                if (result.truncated) {
                    incomplete = true;
                }

                results.push({
                    reference: entry.reference,
                    result,
                    error: null
                });

            } catch (error) {
                incomplete = true;

                results.push({
                    reference: entry.reference,

                    result: null,

                    error:
                        error instanceof Error
                            ? error.message
                            : String(error)
                });
            }
        }

        return {
            selector,

            discovery,

            results,

            totalMatches,
            returnedMatches,

            incomplete
        };
    }

    getReferences(
        discovery: DOMFrameDiscoveryResult
    ): DOMFrameReference[] {
        return discovery.frames.map(
            entry => ({
                ...entry.reference,

                path: [...entry.reference.path]
            })
        );
    }
}