import type { Locator } from "playwright";

export interface DOMContextOptions {
    maxAncestors?: number;
    maxTextLength?: number;
}

export interface DOMContextElement {
    tagName: string;
    id: string | null;
    role: string | null;

    text: string;

    ariaLabel: string | null;
    title: string | null;
}

export interface DOMHeadingContext {
    level: number;
    text: string;
    id: string | null;
}

export interface DOMLandmarkContext {
    role: string;
    element: DOMContextElement;
}

export interface DOMLinkContext {
    element: DOMContextElement;

    href: string | null;
    resolvedHref: string | null;
    target: string | null;
}

export interface DOMFigureContext {
    element: DOMContextElement;
    caption: string | null;
}

export interface DOMFormContext {
    element: DOMContextElement;

    labels: string[];

    fieldsetLegend: string | null;
}

export interface DOMLanguageContext {
    language: string | null;

    declaredDirection: string | null;
    computedDirection: string;
}

export interface DOMContextResult {
    element: DOMContextElement;

    parent: DOMContextElement | null;

    ancestors: DOMContextElement[];
    ancestorsTruncated: boolean;

    previousSibling: DOMContextElement | null;
    nextSibling: DOMContextElement | null;

    surroundingText: string;

    heading: DOMHeadingContext | null;

    landmarks: DOMLandmarkContext[];

    figure: DOMFigureContext | null;
    link: DOMLinkContext | null;

    control: DOMContextElement | null;
    form: DOMFormContext | null;

    language: DOMLanguageContext;

    insideShadowRoot: boolean;
    shadowHosts: DOMContextElement[];
}

export class DOMContextEngine {
    async inspect(
        locator: Locator,
        options: DOMContextOptions = {}
    ): Promise<DOMContextResult> {
        const maxAncestors = options.maxAncestors ?? 20;
        const maxTextLength = options.maxTextLength ?? 500;

        if (
            !Number.isSafeInteger(maxAncestors) ||
            maxAncestors < 0
        ) {
            throw new Error(
                "maxAncestors must be a non-negative safe integer."
            );
        }

        if (
            !Number.isSafeInteger(maxTextLength) ||
            maxTextLength < 0
        ) {
            throw new Error(
                "maxTextLength must be a non-negative safe integer."
            );
        }

        return locator.evaluate(
            (
                element,
                settings
            ): DOMContextResult => {
                const view =
                    element.ownerDocument.defaultView;

                if (!view) {
                    throw new Error(
                        "Element has no associated browser window."
                    );
                }

                function normalizeText(
                    value: string | null
                ): string {
                    return (value ?? "")
                        .replace(/\s+/g, " ")
                        .trim()
                        .slice(0, settings.maxTextLength);
                }

                function getText(
                    target: Element
                ): string {
                    if (
                        target.matches(
                            "script, style, template, noscript"
                        )
                    ) {
                        return "";
                    }

                    const walker =
                        target.ownerDocument.createTreeWalker(
                            target,
                            NodeFilter.SHOW_ELEMENT |
                            NodeFilter.SHOW_TEXT,
                            {
                                acceptNode(node) {
                                    if (
                                        node instanceof Element &&
                                        node.matches(
                                            "script, style, template, noscript"
                                        )
                                    ) {
                                        return NodeFilter.FILTER_REJECT;
                                    }

                                    return node.nodeType ===
                                        Node.TEXT_NODE
                                        ? NodeFilter.FILTER_ACCEPT
                                        : NodeFilter.FILTER_SKIP;
                                }
                            }
                        );

                    const parts: string[] = [];

                    let current = walker.nextNode();

                    while (current) {
                        parts.push(current.nodeValue ?? "");
                        current = walker.nextNode();
                    }

                    return normalizeText(parts.join(""));
                }

                function describeElement(
                    target: Element
                ): DOMContextElement {
                    return {
                        tagName: target.localName,
                        id: target.getAttribute("id"),
                        role: target.getAttribute("role"),

                        text: getText(target),

                        ariaLabel:
                            target.getAttribute("aria-label"),

                        title:
                            target.getAttribute("title")
                    };
                }

                function getParent(
                    target: Element
                ): Element | null {
                    if (target.assignedSlot) {
                        return target.assignedSlot;
                    }

                    if (target.parentElement) {
                        return target.parentElement;
                    }

                    const root = target.getRootNode();

                    if (root instanceof ShadowRoot) {
                        return root.host;
                    }

                    return null;
                }

                function getLandmarkRole(
                    target: Element
                ): string | null {
                    const explicitRole =
                        target.getAttribute("role");

                    const landmarkRoles = [
                        "banner",
                        "complementary",
                        "contentinfo",
                        "form",
                        "main",
                        "navigation",
                        "region",
                        "search"
                    ];

                    if (explicitRole) {
                        const role = explicitRole
                            .trim()
                            .split(/\s+/)[0];

                        return role &&
                            landmarkRoles.includes(role)
                            ? role
                            : null;
                    }

                    const named =
                        Boolean(
                            target.getAttribute("aria-label") ||
                            target.getAttribute("aria-labelledby")
                        );

                    switch (target.localName) {
                        case "main":
                            return "main";

                        case "nav":
                            return "navigation";

                        case "aside":
                            return "complementary";

                        case "search":
                            return "search";

                        case "header":
                            return target.closest(
                                "article, aside, main, nav, section"
                            )
                                ? null
                                : "banner";

                        case "footer":
                            return target.closest(
                                "article, aside, main, nav, section"
                            )
                                ? null
                                : "contentinfo";

                        case "section":
                            return named ? "region" : null;

                        case "form":
                            return named ? "form" : null;

                        default:
                            return null;
                    }
                }

                function getHeadingLevel(
                    heading: Element
                ): number | null {
                    if (
                        /^h[1-6]$/.test(heading.localName)
                    ) {
                        return Number(
                            heading.localName.slice(1)
                        );
                    }

                    if (
                        heading.getAttribute("role") ===
                        "heading"
                    ) {
                        const level = Number(
                            heading.getAttribute("aria-level")
                        );

                        return Number.isInteger(level) &&
                            level > 0
                            ? level
                            : null;
                    }

                    return null;
                }

                const ancestry: Element[] = [];

                let current: Element | null = element;

                while (current) {
                    ancestry.push(current);
                    current = getParent(current);
                }

                function findAncestorOrSelf(
                    selector: string
                ): Element | null {
                    return ancestry.find(
                        target => target.matches(selector)
                    ) ?? null;
                }

                // Parent and ancestors.

                const parent = getParent(element);

                const ancestors = ancestry
                    .slice(1, settings.maxAncestors + 1)
                    .map(describeElement);

                const ancestorsTruncated =
                    ancestry.length - 1 >
                    settings.maxAncestors;

                // DOM siblings.

                const previousSibling =
                    element.previousElementSibling;

                const nextSibling =
                    element.nextElementSibling;

                // Surrounding text.

                const surroundingText =
                    parent &&
                    !parent.matches("body, html")
                        ? getText(parent)
                        : getText(element);

                // Landmarks.

                const landmarks: DOMLandmarkContext[] = [];

                for (const target of ancestry) {
                    const role = getLandmarkRole(target);

                    if (role) {
                        landmarks.push({
                            role,
                            element: describeElement(target)
                        });
                    }
                }

                // Nearest preceding heading in the same root
                // and nearest structural section.

                const rootNode = element.getRootNode();

                if (
                    !(rootNode instanceof Document) &&
                    !(rootNode instanceof ShadowRoot)
                ) {
                    throw new Error(
                        "Unsupported DOM context root."
                    );
                }

                const root: Document | ShadowRoot =
                    rootNode;

                const headingScope =
                    ancestry.find(
                        target =>
                            target.getRootNode() === root &&
                            target.matches(
                                "section, article, main, aside, nav, " +
                                "[role='region'], [role='main'], " +
                                "[role='navigation']"
                            )
                    ) ?? root;

                const headingCandidates =
                    headingScope.querySelectorAll(
                        "h1, h2, h3, h4, h5, h6, " +
                        "[role='heading']"
                    );

                let heading: DOMHeadingContext | null = null;

                for (const candidate of headingCandidates) {
                    const precedesElement =
                        candidate === element ||
                        Boolean(
                            candidate.compareDocumentPosition(
                                element
                            ) &
                            Node.DOCUMENT_POSITION_FOLLOWING
                        );

                    if (!precedesElement) {
                        continue;
                    }

                    const level = getHeadingLevel(candidate);

                    if (level !== null) {
                        heading = {
                            level,
                            text: getText(candidate),
                            id: candidate.getAttribute("id")
                        };
                    }
                }

                // Associated figure and caption.

                const figureElement =
                    findAncestorOrSelf("figure");

                let figure: DOMFigureContext | null = null;

                if (figureElement) {
                    const caption = Array.from(
                        figureElement.children
                    ).find(
                        child => child.localName === "figcaption"
                    );

                    figure = {
                        element:
                            describeElement(figureElement),

                        caption:
                            caption ? getText(caption) : null
                    };
                }

                // Enclosing link.

                const linkElement =
                    findAncestorOrSelf("a[href], area[href]");

                let link: DOMLinkContext | null = null;

                if (linkElement) {
                    const href =
                        linkElement.getAttribute("href");

                    let resolvedHref: string | null = null;

                    if (href !== null) {
                        try {
                            resolvedHref = new URL(
                                href,
                                linkElement.baseURI
                            ).href;
                        } catch {
                            resolvedHref = null;
                        }
                    }

                    link = {
                        element:
                            describeElement(linkElement),

                        href,
                        resolvedHref,

                        target:
                            linkElement.getAttribute("target")
                    };
                }

                // Interactive control candidates.

                const controlElement =
                    findAncestorOrSelf(
                        "button, a[href], input, select, " +
                        "textarea, summary, [contenteditable='true'], " +
                        "[role='button'], [role='link'], " +
                        "[role='checkbox'], [role='radio'], " +
                        "[role='switch'], [role='tab'], " +
                        "[role='menuitem'], [role='slider'], " +
                        "[role='combobox'], [role='textbox'], " +
                        "[tabindex]"
                    );

                // Native form labels and fieldset context.

                const formElement =
                    findAncestorOrSelf(
                        "button, input, select, textarea, " +
                        "meter, output, progress"
                    );

                let form: DOMFormContext | null = null;

                if (formElement) {
                    const labels: string[] = [];

                    if (
                        formElement instanceof HTMLInputElement ||
                        formElement instanceof HTMLButtonElement ||
                        formElement instanceof HTMLSelectElement ||
                        formElement instanceof HTMLTextAreaElement ||
                        formElement instanceof HTMLMeterElement ||
                        formElement instanceof HTMLOutputElement ||
                        formElement instanceof HTMLProgressElement
                    ) {
                        for (
                            const label of Array.from(
                                formElement.labels ?? []
                            )
                        ) {
                            labels.push(getText(label));
                        }
                    }

                    const fieldset =
                        formElement.closest("fieldset");

                    const legend = fieldset
                        ? Array.from(fieldset.children).find(
                            child =>
                                child.localName === "legend"
                        )
                        : undefined;

                    form = {
                        element:
                            describeElement(formElement),

                        labels,

                        fieldsetLegend:
                            legend ? getText(legend) : null
                    };
                }

                // Inherited language and direction.

                let language: string | null = null;

                let declaredDirection: string | null = null;

                for (const target of ancestry) {
                    if (
                        language === null &&
                        target.hasAttribute("lang")
                    ) {
                        language =
                            target.getAttribute("lang");
                    }

                    if (
                        declaredDirection === null &&
                        target.hasAttribute("dir")
                    ) {
                        declaredDirection =
                            target.getAttribute("dir");
                    }
                }

                // Shadow-root boundaries.

                const shadowHosts: DOMContextElement[] = [];

                const seenHosts = new Set<Element>();

                for (const target of ancestry) {
                    const targetRoot = target.getRootNode();

                    if (
                        targetRoot instanceof ShadowRoot &&
                        !seenHosts.has(targetRoot.host)
                    ) {
                        seenHosts.add(targetRoot.host);

                        shadowHosts.push(
                            describeElement(targetRoot.host)
                        );
                    }
                }

                return {
                    element: describeElement(element),

                    parent:
                        parent
                            ? describeElement(parent)
                            : null,

                    ancestors,
                    ancestorsTruncated,

                    previousSibling:
                        previousSibling
                            ? describeElement(previousSibling)
                            : null,

                    nextSibling:
                        nextSibling
                            ? describeElement(nextSibling)
                            : null,

                    surroundingText,

                    heading,

                    landmarks,

                    figure,
                    link,

                    control:
                        controlElement
                            ? describeElement(controlElement)
                            : null,

                    form,

                    language: {
                        language,
                        declaredDirection,

                        computedDirection:
                            view.getComputedStyle(element)
                                .direction
                    },

                    insideShadowRoot:
                        root instanceof ShadowRoot,

                    shadowHosts
                };
            },
            {
                maxAncestors,
                maxTextLength
            }
        );
    }
}