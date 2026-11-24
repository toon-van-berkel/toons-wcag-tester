import type {
    CDPSession,
    Page
} from "playwright";

import type {
    AXNode,
    AXProperty,
    AXTreeError,
    AXTreeOptions,
    AXTreeResult,
    AXValue
} from "./types.js";

interface ProtocolAXRelatedNode {
    backendDOMNodeId: number;

    idref?: string;
    text?: string;
}

interface ProtocolAXValue {
    type: string;

    value?: unknown;

    relatedNodes?: ProtocolAXRelatedNode[];

    sources?: unknown[];
}

interface ProtocolAXProperty {
    name: string;

    value: ProtocolAXValue;
}

interface ProtocolAXNode {
    nodeId: string;

    parentId?: string;
    childIds?: string[];

    backendDOMNodeId?: number;

    frameId?: string;

    ignored: boolean;

    ignoredReasons?: ProtocolAXProperty[];

    role?: ProtocolAXValue;
    chromeRole?: ProtocolAXValue;

    name?: ProtocolAXValue;
    description?: ProtocolAXValue;

    value?: ProtocolAXValue;

    properties?: ProtocolAXProperty[];
}

export class AccessibilityTreeEngine {
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

    private getErrorMessage(
        error: unknown
    ): string {
        return error instanceof Error
            ? error.message
            : String(error);
    }

    private normalizeValue(
        value: ProtocolAXValue
    ): AXValue {
        return {
            type: value.type,

            value: value.value ?? null,

            relatedNodes: (
                value.relatedNodes ?? []
            ).map(node => ({
                backendDOMNodeId:
                    node.backendDOMNodeId,

                idref:
                    node.idref ?? null,

                text:
                    node.text ?? null
            })),

            sources:
                value.sources ?? []
        };
    }

    private normalizeProperties(
        properties: readonly ProtocolAXProperty[]
    ): AXProperty[] {
        return properties.map(
            property => ({
                name: property.name,

                value:
                    this.normalizeValue(
                        property.value
                    )
            })
        );
    }

    private getStringValue(
        value: ProtocolAXValue | undefined
    ): string | null {
        return typeof value?.value === "string"
            ? value.value
            : null;
    }

    private getChromeRole(
        value: ProtocolAXValue | undefined
    ): string | number | null {
        const role = value?.value;

        return typeof role === "string" ||
            typeof role === "number"
            ? role
            : null;
    }

    private normalizeNode(
        node: ProtocolAXNode
    ): AXNode {
        return {
            id: node.nodeId,

            parentId:
                node.parentId ?? null,

            childIds: [
                ...(node.childIds ?? [])
            ],

            backendDOMNodeId:
                node.backendDOMNodeId ?? null,

            frameId:
                node.frameId ?? null,

            ignored:
                node.ignored,

            ignoredReasons:
                this.normalizeProperties(
                    node.ignoredReasons ?? []
                ),

            role:
                this.getStringValue(node.role),

            chromeRole:
                this.getChromeRole(node.chromeRole),

            name:
                this.getStringValue(node.name),

            description:
                this.getStringValue(node.description),

            value:
                node.value
                    ? this.normalizeValue(node.value)
                    : null,

            nameDetails:
                node.name
                    ? this.normalizeValue(node.name)
                    : null,

            descriptionDetails:
                node.description
                    ? this.normalizeValue(
                        node.description
                    )
                    : null,

            properties:
                this.normalizeProperties(
                    node.properties ?? []
                )
        };
    }

    async capture(
        options: AXTreeOptions = {}
    ): Promise<AXTreeResult> {
        this.validateLimit(
            "maxDepth",
            options.maxDepth
        );

        this.validateLimit(
            "maxNodes",
            options.maxNodes
        );

        const startedAt = performance.now();

        const initialFrameCount =
            this.page.frames().length;

        const result: AXTreeResult = {
            status: "error",

            browser: "chromium",

            source: "cdp",

            url: this.page.url(),

            frameId: null,

            rootNodeIds: [],

            nodes: [],

            totalNodes: 0,
            returnedNodes: 0,

            exposedNodes: 0,
            ignoredNodes: 0,

            coverage: {
                scope: "main_document",

                discoveredFrameCount:
                    initialFrameCount,

                requestedFrameCount: 1,

                capturedFrameCount: 0,

                uninspectedFrameCount:
                    initialFrameCount,

                depthLimited:
                    options.maxDepth !== undefined,

                nodeLimited: false,

                completeDocumentTree: false,

                completePageTree: false
            },

            errors: [],

            capturedAt:
                new Date().toISOString(),

            finishedAt: "",

            durationMs: 0
        };

        let session: CDPSession | null = null;

        let accessibilityEnabled = false;

        let captureSucceeded = false;

        let stage: AXTreeError["stage"] =
            "session";

        try {
            // Create a Chromium DevTools session.

            session = await this.page
                .context()
                .newCDPSession(this.page);

            // Enable the accessibility domain.

            stage = "enable";

            await session.send(
                "Accessibility.enable"
            );

            accessibilityEnabled = true;

            // Identify the main document.

            stage = "capture";

            const frameTree =
                await session.send(
                    "Page.getFrameTree"
                );

            const mainFrame =
                frameTree.frameTree.frame;

            result.frameId =
                mainFrame.id;

            result.url =
                mainFrame.url;

            // Request the browser-computed
            // accessibility tree.

            const response =
                await session.send(
                    "Accessibility.getFullAXTree",
                    {
                        frameId: mainFrame.id,

                        ...(options.maxDepth !== undefined
                            ? {
                                depth:
                                    options.maxDepth
                            }
                            : {})
                    }
                );

            const nodes = response.nodes.map(
                node => this.normalizeNode(node)
            );

            if (nodes.length === 0) {
                throw new Error(
                    "Chromium returned an empty accessibility tree."
                );
            }

            result.totalNodes =
                nodes.length;

            // Preserve the root identifiers even
            // when returned nodes are limited.

            const allNodeIds = new Set(
                nodes.map(node => node.id)
            );

            result.rootNodeIds = nodes
                .filter(
                    node =>
                        node.parentId === null ||
                        !allNodeIds.has(node.parentId)
                )
                .map(node => node.id);

            result.nodes = nodes.slice(
                0,
                options.maxNodes ??
                    nodes.length
            );

            result.returnedNodes =
                result.nodes.length;

            result.ignoredNodes =
                result.nodes.filter(
                    node => node.ignored
                ).length;

            result.exposedNodes =
                result.nodes.filter(
                    node => !node.ignored
                ).length;

            result.coverage.nodeLimited =
                result.returnedNodes <
                result.totalNodes;

            result.coverage.capturedFrameCount = 1;

            captureSucceeded = true;

        } catch (error) {
            result.errors.push({
                stage,

                message:
                    this.getErrorMessage(error)
            });

        } finally {
            // Release the accessibility domain
            // and DevTools session after capture.

            if (session) {
                if (accessibilityEnabled) {
                    try {
                        await session.send(
                            "Accessibility.disable"
                        );

                    } catch (error) {
                        result.errors.push({
                            stage: "cleanup",

                            message:
                                this.getErrorMessage(error)
                        });
                    }
                }

                try {
                    await session.detach();

                } catch (error) {
                    result.errors.push({
                        stage: "cleanup",

                        message:
                            this.getErrorMessage(error)
                    });
                }
            }
        }

        // Account for frames attached during capture.

        const finalFrameCount =
            this.page.frames().length;

        result.coverage.discoveredFrameCount =
            Math.max(
                initialFrameCount,
                finalFrameCount
            );

        result.coverage.uninspectedFrameCount =
            Math.max(
                0,

                result.coverage.discoveredFrameCount -
                result.coverage.capturedFrameCount
            );

        result.coverage.completeDocumentTree =
            captureSucceeded &&
            !result.coverage.depthLimited &&
            !result.coverage.nodeLimited &&
            result.errors.length === 0;

        result.coverage.completePageTree =
            result.coverage.completeDocumentTree &&
            result.coverage.uninspectedFrameCount === 0;

        result.status =
            !captureSucceeded
                ? "error"
                : result.coverage.completePageTree
                    ? "complete"
                    : "partial";

        result.finishedAt =
            new Date().toISOString();

        result.durationMs =
            performance.now() - startedAt;

        return result;
    }

    getNode(
        tree: AXTreeResult,
        id: string
    ): AXNode | null {
        return tree.nodes.find(
            node => node.id === id
        ) ?? null;
    }

    getRoots(
        tree: AXTreeResult
    ): AXNode[] {
        const rootIds =
            new Set(tree.rootNodeIds);

        return tree.nodes.filter(
            node => rootIds.has(node.id)
        );
    }

    getChildren(
        tree: AXTreeResult,
        nodeId: string
    ): AXNode[] {
        const node = this.getNode(
            tree,
            nodeId
        );

        if (!node) {
            return [];
        }

        const nodesById = new Map(
            tree.nodes.map(
                child => [child.id, child]
            )
        );

        const children: AXNode[] = [];

        for (const childId of node.childIds) {
            const child =
                nodesById.get(childId);

            if (child) {
                children.push(child);
            }
        }

        return children;
    }

    getParent(
        tree: AXTreeResult,
        nodeId: string
    ): AXNode | null {
        const node = this.getNode(
            tree,
            nodeId
        );

        if (!node || node.parentId === null) {
            return null;
        }

        return this.getNode(
            tree,
            node.parentId
        );
    }

    getByRole(
        tree: AXTreeResult,
        role: string
    ): AXNode[] {
        return tree.nodes.filter(
            node => node.role === role
        );
    }

    getByName(
        tree: AXTreeResult,
        name: string
    ): AXNode[] {
        return tree.nodes.filter(
            node => node.name === name
        );
    }

    getByBackendDOMNodeId(
        tree: AXTreeResult,
        backendDOMNodeId: number
    ): AXNode[] {
        return tree.nodes.filter(
            node =>
                node.backendDOMNodeId ===
                backendDOMNodeId
        );
    }

    getExposedNodes(
        tree: AXTreeResult
    ): AXNode[] {
        return tree.nodes.filter(
            node => !node.ignored
        );
    }

    getIgnoredNodes(
        tree: AXTreeResult
    ): AXNode[] {
        return tree.nodes.filter(
            node => node.ignored
        );
    }

    getProperty(
        node: AXNode,
        name: string
    ): AXValue | null {
        return node.properties.find(
            property => property.name === name
        )?.value ?? null;
    }
}