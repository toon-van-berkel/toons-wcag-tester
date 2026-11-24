import type {
    Frame,
    Locator,
    Page
} from "playwright";

export interface DOMShadowOptions {
    maxDepth?: number;
    maxRoots?: number;
}

export interface DOMShadowSlot {
    name: string;

    selector: string;

    assignedElementCount: number;
    assignedNodeCount: number;

    fallbackElementCount: number;
    usingFallback: boolean;

    assignedTags: string[];
}

export interface DOMShadowRootReference {
    id: string;

    parentId: string | null;

    depth: number;

    mode: "open";

    hostTagName: string;
    hostId: string | null;

    hostSelector: string;

    hostPath: string[];

    delegatesFocus: boolean;

    elementCount: number;

    slots: DOMShadowSlot[];
}

export interface DOMShadowDiscoveryResult {
    roots: DOMShadowRootReference[];

    totalDiscovered: number;
    returnedCount: number;

    skippedByDepth: number;
    skippedByLimit: number;

    truncated: boolean;

    closedRootsInspectable: false;
}

export interface DOMShadowElementReference {
    selector: string;

    tagName: string;
    htmlId: string | null;

    hostPath: string[];

    insideShadowRoot: boolean;
}

export interface DOMShadowQueryOptions {
    limit?: number;
}

export interface DOMShadowQueryResult {
    selector: string;

    hostPath: string[];

    elements: DOMShadowElementReference[];

    totalCount: number;
    returnedCount: number;

    truncated: boolean;
}

export class DOMShadowEngine {
    constructor(
        private readonly root: Page | Frame
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

    async discover(
        options: DOMShadowOptions = {}
    ): Promise<DOMShadowDiscoveryResult> {
        this.validateLimit(
            "maxDepth",
            options.maxDepth
        );

        this.validateLimit(
            "maxRoots",
            options.maxRoots
        );

        const maxDepth =
            options.maxDepth ??
            Number.MAX_SAFE_INTEGER;

        const maxRoots =
            options.maxRoots ??
            Number.MAX_SAFE_INTEGER;

        return this.root.evaluate(
            (settings): DOMShadowDiscoveryResult => {
                const roots: DOMShadowRootReference[] = [];

                let totalDiscovered = 0;
                let skippedByDepth = 0;
                let skippedByLimit = 0;

                function getSelector(
                    element: Element,
                    scope: Document | ShadowRoot
                ): string {
                    const id = element.getAttribute("id");

                    if (id) {
                        const selector =
                            "#" + CSS.escape(id);

                        const matches =
                            scope.querySelectorAll(selector);

                        if (
                            matches.length === 1 &&
                            matches.item(0) === element
                        ) {
                            return selector;
                        }
                    }

                    const segments: string[] = [];

                    let current: Element | null = element;

                    while (current) {
                        const tag =
                            CSS.escape(current.localName);

                        const parent =
                            current.parentNode;

                        if (parent) {
                            const siblings = Array.from(
                                parent.children
                            );

                            const index =
                                siblings.indexOf(current) + 1;

                            segments.unshift(
                                tag + ":nth-child(" + index + ")"
                            );
                        } else {
                            segments.unshift(tag);
                        }

                        const selector =
                            segments.join(" > ");

                        const matches =
                            scope.querySelectorAll(selector);

                        if (
                            matches.length === 1 &&
                            matches.item(0) === element
                        ) {
                            return selector;
                        }

                        current = current.parentElement;
                    }

                    throw new Error(
                        "Unable to uniquely identify shadow host."
                    );
                }

                function inspectSlots(
                    shadow: ShadowRoot
                ): DOMShadowSlot[] {
                    const slots =
                        shadow.querySelectorAll("slot");

                    return Array.from(
                        slots,
                        slot => {
                            const assignedNodes =
                                slot.assignedNodes();

                            const assignedElements =
                                slot.assignedElements();

                            return {
                                name: slot.name,

                                selector:
                                    getSelector(slot, shadow),

                                assignedElementCount:
                                    assignedElements.length,

                                assignedNodeCount:
                                    assignedNodes.length,

                                fallbackElementCount:
                                    slot.children.length,

                                usingFallback:
                                    assignedNodes.length === 0,

                                assignedTags:
                                    assignedElements.map(
                                        element =>
                                            element.localName
                                    )
                            };
                        }
                    );
                }

                function traverse(
                    scope: Document | ShadowRoot,
                    parentPath: string[],
                    parentId: string | null
                ): void {
                    const elements =
                        scope.querySelectorAll("*");

                    for (const element of elements) {
                        const shadow =
                            element.shadowRoot;

                        if (!shadow) {
                            continue;
                        }

                        totalDiscovered++;

                        const depth =
                            parentPath.length + 1;

                        const hostSelector =
                            getSelector(element, scope);

                        const hostPath = [
                            ...parentPath,
                            hostSelector
                        ];

                        const id =
                            "shadow:" +
                            JSON.stringify(hostPath);

                        if (depth > settings.maxDepth) {
                            skippedByDepth++;
                        } else if (
                            roots.length >= settings.maxRoots
                        ) {
                            skippedByLimit++;
                        } else {
                            roots.push({
                                id,
                                parentId,

                                depth,

                                mode: "open",

                                hostTagName:
                                    element.localName,

                                hostId:
                                    element.getAttribute("id"),

                                hostSelector,

                                hostPath,

                                delegatesFocus:
                                    shadow.delegatesFocus,

                                elementCount:
                                    shadow.querySelectorAll("*")
                                        .length,

                                slots:
                                    inspectSlots(shadow)
                            });
                        }

                        traverse(
                            shadow,
                            hostPath,
                            id
                        );
                    }
                }

                traverse(document, [], null);

                return {
                    roots,

                    totalDiscovered,

                    returnedCount:
                        roots.length,

                    skippedByDepth,
                    skippedByLimit,

                    truncated:
                        skippedByDepth > 0 ||
                        skippedByLimit > 0,

                    closedRootsInspectable: false
                };
            },
            {
                maxDepth,
                maxRoots
            }
        );
    }

    async identify(
        locator: Locator
    ): Promise<DOMShadowElementReference> {
        return locator.evaluate(
            (element): DOMShadowElementReference => {
                function getSelector(
                    target: Element,
                    scope: Document | ShadowRoot
                ): string {
                    const id = target.getAttribute("id");

                    if (id) {
                        const selector =
                            "#" + CSS.escape(id);

                        const matches =
                            scope.querySelectorAll(selector);

                        if (
                            matches.length === 1 &&
                            matches.item(0) === target
                        ) {
                            return selector;
                        }
                    }

                    const segments: string[] = [];

                    let current: Element | null = target;

                    while (current) {
                        const tag =
                            CSS.escape(current.localName);

                        const parent =
                            current.parentNode;

                        if (parent) {
                            const siblings =
                                Array.from(parent.children);

                            const index =
                                siblings.indexOf(current) + 1;

                            segments.unshift(
                                tag + ":nth-child(" + index + ")"
                            );
                        } else {
                            segments.unshift(tag);
                        }

                        const selector =
                            segments.join(" > ");

                        const matches =
                            scope.querySelectorAll(selector);

                        if (
                            matches.length === 1 &&
                            matches.item(0) === target
                        ) {
                            return selector;
                        }

                        current = current.parentElement;
                    }

                    throw new Error(
                        "Unable to uniquely identify element."
                    );
                }

                const rootNode =
                    element.getRootNode();

                if (
                    !(rootNode instanceof Document) &&
                    !(rootNode instanceof ShadowRoot)
                ) {
                    throw new Error(
                        "Unsupported shadow inspection root."
                    );
                }

                const hostPath: string[] = [];

                let currentRoot:
                    Document | ShadowRoot = rootNode;

                while (
                    currentRoot instanceof ShadowRoot
                ) {
                    const host = currentRoot.host;

                    const parentRoot =
                        host.getRootNode();

                    if (
                        !(parentRoot instanceof Document) &&
                        !(parentRoot instanceof ShadowRoot)
                    ) {
                        throw new Error(
                            "Unsupported shadow host root."
                        );
                    }

                    hostPath.unshift(
                        getSelector(host, parentRoot)
                    );

                    currentRoot = parentRoot;
                }

                return {
                    selector:
                        getSelector(element, rootNode),

                    tagName:
                        element.localName,

                    htmlId:
                        element.getAttribute("id"),

                    hostPath,

                    insideShadowRoot:
                        rootNode instanceof ShadowRoot
                };
            }
        );
    }

    async query(
        hostPath: readonly string[],
        selector: string,
        options: DOMShadowQueryOptions = {}
    ): Promise<DOMShadowQueryResult> {
        this.validateLimit(
            "limit",
            options.limit
        );

        if (selector.trim().length === 0) {
            throw new Error(
                "Shadow DOM selector cannot be empty."
            );
        }

        return this.root.evaluate(
            (settings): DOMShadowQueryResult => {
                let scope: Document | ShadowRoot =
                    document;

                for (const hostSelector of settings.hostPath) {
                    const matches: NodeListOf<Element> =
                        scope.querySelectorAll(hostSelector);

                    if (matches.length !== 1) {
                        throw new Error(
                            "Shadow host path is missing or ambiguous: " +
                            hostSelector
                        );
                    }

                    const host: Element = matches.item(0);

                    const shadow: ShadowRoot | null =
                        host.shadowRoot;

                    if (!shadow) {
                        throw new Error(
                            "Open shadow root unavailable: " +
                            hostSelector
                        );
                    }

                    scope = shadow;
                }

                function getSelector(
                    element: Element,
                    root: Document | ShadowRoot
                ): string {
                    const id =
                        element.getAttribute("id");

                    if (id) {
                        const selector =
                            "#" + CSS.escape(id);

                        const matches =
                            root.querySelectorAll(selector);

                        if (
                            matches.length === 1 &&
                            matches.item(0) === element
                        ) {
                            return selector;
                        }
                    }

                    const segments: string[] = [];

                    let current: Element | null = element;

                    while (current) {
                        const tag =
                            CSS.escape(current.localName);

                        const parent =
                            current.parentNode;

                        if (parent) {
                            const siblings =
                                Array.from(parent.children);

                            const index =
                                siblings.indexOf(current) + 1;

                            segments.unshift(
                                tag + ":nth-child(" + index + ")"
                            );
                        } else {
                            segments.unshift(tag);
                        }

                        const selector =
                            segments.join(" > ");

                        const matches =
                            root.querySelectorAll(selector);

                        if (
                            matches.length === 1 &&
                            matches.item(0) === element
                        ) {
                            return selector;
                        }

                        current = current.parentElement;
                    }

                    throw new Error(
                        "Unable to uniquely identify element."
                    );
                }

                const matches = Array.from(
                    scope.querySelectorAll(
                        settings.selector
                    )
                );

                const selected = matches.slice(
                    0,
                    settings.limit
                );

                const elements = selected.map(
                    element => ({
                        selector:
                            getSelector(element, scope),

                        tagName:
                            element.localName,

                        htmlId:
                            element.getAttribute("id"),

                        hostPath:
                            [...settings.hostPath],

                        insideShadowRoot:
                            scope instanceof ShadowRoot
                    })
                );

                return {
                    selector:
                        settings.selector,

                    hostPath:
                        [...settings.hostPath],

                    elements,

                    totalCount:
                        matches.length,

                    returnedCount:
                        elements.length,

                    truncated:
                        elements.length < matches.length
                };
            },
            {
                hostPath: [...hostPath],

                selector,

                limit:
                    options.limit ??
                    Number.MAX_SAFE_INTEGER
            }
        );
    }
}