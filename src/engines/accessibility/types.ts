export type AXTreeStatus =
    | "complete"
    | "partial"
    | "error";

export interface AXRelatedNode {
    backendDOMNodeId: number;

    idref: string | null;
    text: string | null;
}

export interface AXValue {
    type: string;

    value: unknown;

    relatedNodes: AXRelatedNode[];

    sources: unknown[];
}

export interface AXProperty {
    name: string;

    value: AXValue;
}

export interface AXNode {
    id: string;

    parentId: string | null;
    childIds: string[];

    backendDOMNodeId: number | null;

    frameId: string | null;

    ignored: boolean;
    ignoredReasons: AXProperty[];

    role: string | null;
    chromeRole: string | number | null;

    name: string | null;
    description: string | null;

    value: AXValue | null;

    nameDetails: AXValue | null;
    descriptionDetails: AXValue | null;

    properties: AXProperty[];
}

export interface AXTreeOptions {
    maxDepth?: number;
    maxNodes?: number;
}

export interface AXTreeError {
    stage:
        | "session"
        | "enable"
        | "capture"
        | "cleanup";

    message: string;
}

export interface AXTreeCoverage {
    scope: "main_document";

    discoveredFrameCount: number;

    requestedFrameCount: number;

    capturedFrameCount: number;

    uninspectedFrameCount: number;

    depthLimited: boolean;
    nodeLimited: boolean;

    completeDocumentTree: boolean;

    completePageTree: boolean;
}

export interface AXTreeResult {
    status: AXTreeStatus;

    browser: "chromium";

    source: "cdp";

    url: string;

    frameId: string | null;

    rootNodeIds: string[];

    nodes: AXNode[];

    totalNodes: number;
    returnedNodes: number;

    exposedNodes: number;
    ignoredNodes: number;

    coverage: AXTreeCoverage;

    errors: AXTreeError[];

    capturedAt: string;
    finishedAt: string;

    durationMs: number;
}