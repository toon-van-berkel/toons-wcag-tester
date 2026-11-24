import type {
    CDPSession,
    ElementHandle,
    Frame,
    Locator,
    Page
} from "playwright";

import type {
    AXProperty,
    AXValue
} from "./types.js";

export type AXElementStatus =
    | "complete"
    | "partial"
    | "error";

export type AXElementStage =
    | "target"
    | "identity"
    | "session"
    | "dom"
    | "accessibility"
    | "consistency"
    | "cleanup";

export interface AXElementOptions {
    targetTimeoutMs?: number;
}

export interface AXElementError {
    stage: AXElementStage;
    message: string;
}

export interface AXElementNode {
    id: string;

    backendDOMNodeId: number | null;

    ignored: boolean;
    ignoredReasons: AXProperty[];

    role: string | null;

    name: AXValue | null;
    description: AXValue | null;
    value: AXValue | null;

    properties: AXProperty[];
}

export interface AXElementResult {
    status: AXElementStatus;

    consistency:
        | "verified"
        | "changed"
        | "unknown";

    browser: "chromium";
    source: "cdp";

    url: string | null;

    backendDOMNodeId: number | null;

    node: AXElementNode | null;

    errors: AXElementError[];

    capturedAt: string;
    finishedAt: string;
    durationMs: number;
}

interface ProtocolValue {
    type: string;
    value?: unknown;

    relatedNodes?: {
        backendDOMNodeId: number;
        idref?: string;
        text?: string;
    }[];

    sources?: unknown[];
}

interface ProtocolProperty {
    name: string;
    value: ProtocolValue;
}

interface ProtocolNode {
    nodeId: string;

    backendDOMNodeId?: number;

    ignored: boolean;

    ignoredReasons?: ProtocolProperty[];

    role?: ProtocolValue;
    name?: ProtocolValue;
    description?: ProtocolValue;
    value?: ProtocolValue;

    properties?: ProtocolProperty[];
}

interface ProtocolDOMNode {
    nodeType: number;
    nodeName: string;
    backendNodeId: number;

    children?: ProtocolDOMNode[];

    shadowRoots?: ProtocolDOMNode[];

    shadowRootType?: string;

    contentDocument?: ProtocolDOMNode;
}

type DOMPathStep =
    | {
        type: "element";
        index: number;
        tagName: string;
    }
    | {
        type: "shadow";
    };

interface SessionScope {
    session: CDPSession;
    frame: Frame;
}

export class AccessibilityElementEngine {
    constructor(
        private readonly page: Page
    ) {}

    private getErrorMessage(
        error: unknown
    ): string {
        return error instanceof Error
            ? error.message
            : String(error);
    }

    private normalizeValue(
        value: ProtocolValue
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

            sources: value.sources ?? []
        };
    }

    private normalizeProperties(
        properties: readonly ProtocolProperty[]
    ): AXProperty[] {
        return properties.map(property => ({
            name: property.name,

            value: this.normalizeValue(
                property.value
            )
        }));
    }

    private normalizeNode(
        node: ProtocolNode
    ): AXElementNode {
        return {
            id: node.nodeId,

            backendDOMNodeId:
                node.backendDOMNodeId ?? null,

            ignored: node.ignored,

            ignoredReasons:
                this.normalizeProperties(
                    node.ignoredReasons ?? []
                ),

            role:
                typeof node.role?.value === "string"
                    ? node.role.value
                    : null,

            name:
                node.name
                    ? this.normalizeValue(node.name)
                    : null,

            description:
                node.description
                    ? this.normalizeValue(
                        node.description
                    )
                    : null,

            value:
                node.value
                    ? this.normalizeValue(node.value)
                    : null,

            properties:
                this.normalizeProperties(
                    node.properties ?? []
                )
        };
    }

    private async getDOMPath(
        handle: ElementHandle
    ): Promise<DOMPathStep[]> {
        return handle.evaluate(
            (element): DOMPathStep[] => {
                if (!element.isConnected) {
                    throw new Error(
                        "Target element is detached."
                    );
                }

                const steps: DOMPathStep[] = [];

                let current: Node = element;

                while (
                    current.nodeType !==
                    Node.DOCUMENT_NODE
                ) {
                    if (current instanceof ShadowRoot) {
                        if (current.mode !== "open") {
                            throw new Error(
                                "Closed shadow roots cannot be resolved through this DOM path."
                            );
                        }

                        steps.unshift({
                            type: "shadow"
                        });

                        current = current.host;

                        continue;
                    }

                    if (!(current instanceof Element)) {
                        throw new Error(
                            "Unexpected node in element path."
                        );
                    }

                    const parent = current.parentNode;

                    if (
                        !parent ||
                        !(
                            parent instanceof Element ||
                            parent instanceof Document ||
                            parent instanceof ShadowRoot
                        )
                    ) {
                        throw new Error(
                            "Unable to resolve parent node."
                        );
                    }

                    const index = Array.from(
                        parent.children
                    ).indexOf(current);

                    if (index < 0) {
                        throw new Error(
                            "Unable to resolve element index."
                        );
                    }

                    steps.unshift({
                        type: "element",

                        index,

                        tagName:
                            current.localName
                    });

                    current = parent;
                }

                return steps;
            }
        );
    }

    private async openSession(
        ownerFrame: Frame
    ): Promise<SessionScope> {
        let current: Frame | null =
            ownerFrame;

        while (current) {
            if (
                current === this.page.mainFrame()
            ) {
                return {
                    session:
                        await this.page
                            .context()
                            .newCDPSession(this.page),

                    frame: current
                };
            }

            try {
                return {
                    session:
                        await this.page
                            .context()
                            .newCDPSession(current),

                    frame: current
                };

            } catch (error) {
                const message =
                    this.getErrorMessage(error);

                if (
                    !message.includes(
                        "does not have a separate CDP session"
                    )
                ) {
                    throw error;
                }

                current =
                    current.parentFrame();
            }
        }

        throw new Error(
            "Unable to establish a CDP session for the target frame."
        );
    }

    private async getFramePaths(
        ownerFrame: Frame,
        sessionFrame: Frame
    ): Promise<DOMPathStep[][]> {
        const paths: DOMPathStep[][] = [];

        let current: Frame | null =
            ownerFrame;

        while (current !== sessionFrame) {
            if (!current) {
                throw new Error(
                    "Target frame is outside the session frame hierarchy."
                );
            }

            const handle =
                await current.frameElement();

            try {
                const path =
                    await this.getDOMPath(handle);

                paths.unshift(path);

            } finally {
                await handle.dispose();
            }

            current =
                current.parentFrame();
        }

        return paths;
    }

    private resolvePath(
        root: ProtocolDOMNode,
        path: readonly DOMPathStep[]
    ): ProtocolDOMNode {
        let current = root;

        for (const step of path) {
            if (step.type === "shadow") {
                const shadowRoot =
                    current.shadowRoots?.find(
                        root =>
                            root.shadowRootType ===
                            "open"
                    );

                if (!shadowRoot) {
                    throw new Error(
                        "Unable to resolve open shadow root."
                    );
                }

                current = shadowRoot;

                continue;
            }

            const children = (
                current.children ?? []
            ).filter(
                child => child.nodeType === 1
            );

            const child =
                children[step.index];

            if (
                !child ||
                child.nodeName.toLowerCase() !==
                    step.tagName.toLowerCase()
            ) {
                throw new Error(
                    `DOM path mismatch at ${step.tagName}[${step.index}].`
                );
            }

            current = child;
        }

        return current;
    }

    private resolveDocument(
        root: ProtocolDOMNode,
        framePaths: readonly DOMPathStep[][]
    ): ProtocolDOMNode {
        let current = root;

        for (const path of framePaths) {
            const iframe =
                this.resolvePath(current, path);

            if (!iframe.contentDocument) {
                throw new Error(
                    "Unable to resolve embedded document in CDP session."
                );
            }

            current =
                iframe.contentDocument;
        }

        return current;
    }

    async inspect(
        locator: Locator,
        options: AXElementOptions = {}
    ): Promise<AXElementResult> {
        const timeout =
            options.targetTimeoutMs ?? 10_000;

        if (
            !Number.isSafeInteger(timeout) ||
            timeout <= 0
        ) {
            throw new Error(
                "targetTimeoutMs must be a positive safe integer."
            );
        }

        const startedAt = performance.now();

        const result: AXElementResult = {
            status: "error",

            consistency: "unknown",

            browser: "chromium",

            source: "cdp",

            url: null,

            backendDOMNodeId: null,

            node: null,

            errors: [],

            capturedAt:
                new Date().toISOString(),

            finishedAt: "",

            durationMs: 0
        };

        let handle: ElementHandle | null = null;

        let session: CDPSession | null = null;

        let accessibilityEnabled = false;

        let stage: AXElementStage = "target";

        try {
            handle = await locator.elementHandle({
                timeout
            });

            stage = "identity";

            const ownerFrame =
                await handle.ownerFrame();

            if (!ownerFrame) {
                throw new Error(
                    "Unable to identify target owner frame."
                );
            }

            if (
                ownerFrame.page() !== this.page
            ) {
                throw new Error(
                    "Target belongs to a different page."
                );
            }

            result.url = ownerFrame.url();

            const initialPath =
                await this.getDOMPath(handle);

            stage = "session";

            const scope =
                await this.openSession(ownerFrame);

            session = scope.session;

            const initialFramePaths =
                await this.getFramePaths(
                    ownerFrame,
                    scope.frame
                );

            stage = "dom";

            const document =
                await session.send(
                    "DOM.getDocument",
                    {
                        depth: -1,
                        pierce: true
                    }
                );

            const ownerDocument =
                this.resolveDocument(
                    document.root,
                    initialFramePaths
                );

            const target =
                this.resolvePath(
                    ownerDocument,
                    initialPath
                );

            result.backendDOMNodeId =
                target.backendNodeId;

            stage = "accessibility";

            await session.send(
                "Accessibility.enable"
            );

            accessibilityEnabled = true;

            const response =
                await session.send(
                    "Accessibility.getPartialAXTree",
                    {
                        backendNodeId:
                            target.backendNodeId,

                        fetchRelatives: false
                    }
                );

            const node = response.nodes.find(
                candidate =>
                    candidate.backendDOMNodeId ===
                    target.backendNodeId
            );

            if (node) {
                result.node =
                    this.normalizeNode(node);
            }

            stage = "consistency";

            const connected =
                await handle.evaluate(
                    element => element.isConnected
                );

            if (!connected) {
                result.consistency = "changed";

                throw new Error(
                    "Target was detached during accessibility inspection."
                );
            }

            const sameElement =
                await locator.evaluate(
                    (element, original) =>
                        element === original,

                    handle,

                    { timeout }
                );

            const finalPath =
                await this.getDOMPath(handle);

            const finalFramePaths =
                await this.getFramePaths(
                    ownerFrame,
                    scope.frame
                );

            const samePath =
                JSON.stringify(initialPath) ===
                JSON.stringify(finalPath);

            const sameFramePaths =
                JSON.stringify(initialFramePaths) ===
                JSON.stringify(finalFramePaths);

            const sameOwnerFrame =
                await handle.ownerFrame() ===
                ownerFrame;

            if (
                !sameElement ||
                !samePath ||
                !sameFramePaths ||
                !sameOwnerFrame
            ) {
                result.consistency = "changed";

                throw new Error(
                    "Target identity changed during accessibility inspection."
                );
            }

            result.consistency = "verified";

            if (!result.node) {
                result.errors.push({
                    stage: "accessibility",

                    message:
                        "No matching accessibility node was returned."
                });

                result.status = "partial";

            } else {
                result.status = "complete";
            }

        } catch (error) {
            result.errors.push({
                stage,

                message:
                    this.getErrorMessage(error)
            });

            // Never use captured AX data as verified
            // evidence if target identity is uncertain.

            result.node = null;

            result.status = "error";

        } finally {
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

            if (handle) {
                try {
                    await handle.dispose();

                } catch (error) {
                    result.errors.push({
                        stage: "cleanup",

                        message:
                            this.getErrorMessage(error)
                    });
                }
            }
        }

        if (
            result.status === "complete" &&
            result.errors.length > 0
        ) {
            result.status = "partial";
        }

        result.finishedAt =
            new Date().toISOString();

        result.durationMs =
            performance.now() - startedAt;

        return result;
    }
}