import type { Locator } from "playwright";

export type DOMSelectorStrategy =
    | "id"
    | "tag"
    | "structural";

export interface DOMSelectorResult {
    selector: string;

    strategy: DOMSelectorStrategy;

    unique: boolean;

    root: "document" | "shadow-root";
}

export class DOMSelectorEngine {
    async generate(
        locator: Locator
    ): Promise<DOMSelectorResult> {
        return locator.evaluate(
            (element): DOMSelectorResult => {
                const rootNode = element.getRootNode();

                if (
                    !(rootNode instanceof Document) &&
                    !(rootNode instanceof ShadowRoot)
                ) {
                    throw new Error(
                        "Unsupported DOM selector root."
                    );
                }

                const root: Document | ShadowRoot = rootNode;

                if (
                    !(root instanceof Document) &&
                    !(root instanceof ShadowRoot)
                ) {
                    throw new Error(
                        "Unsupported DOM selector root."
                    );
                }

                const rootType =
                    root instanceof ShadowRoot
                        ? "shadow-root"
                        : "document";

                function isUnique(
                    selector: string,
                    target: Element
                ): boolean {
                    const matches = root.querySelectorAll(
                        selector
                    );

                    return (
                        matches.length === 1 &&
                        matches.item(0) === target
                    );
                }

                function getTagName(
                    target: Element
                ): string {
                    return CSS.escape(target.localName);
                }

                function getIdSelector(
                    target: Element
                ): string | null {
                    const id = target.getAttribute("id");

                    if (!id) {
                        return null;
                    }

                    const selector = `#${CSS.escape(id)}`;

                    if (!isUnique(selector, target)) {
                        return null;
                    }

                    return selector;
                }

                function getStructuralSegment(
                    target: Element
                ): string {
                    const tagName = getTagName(target);
                    const parent = target.parentNode;

                    if (!parent) {
                        return tagName;
                    }

                    const siblings = Array.from(
                        parent.children
                    );

                    const sameType = siblings.filter(
                        sibling =>
                            sibling.localName === target.localName
                    );

                    if (sameType.length <= 1) {
                        return tagName;
                    }

                    const index =
                        siblings.indexOf(target) + 1;

                    const sameTypeIndex =
                        sameType.indexOf(target) + 1;

                    const sameNamespace = sameType.every(
                        sibling =>
                            sibling.namespaceURI ===
                            target.namespaceURI
                    );

                    if (!sameNamespace) {
                        return `${tagName}:nth-child(${index})`;
                    }

                    return `${tagName}:nth-of-type(${sameTypeIndex})`;
                }

                // Strategy 1: Unique ID.

                const idSelector = getIdSelector(element);

                if (idSelector) {
                    return {
                        selector: idSelector,
                        strategy: "id",
                        unique: true,
                        root: rootType
                    };
                }

                // Strategy 2: Unique element type.

                const tagSelector = getTagName(element);

                if (isUnique(tagSelector, element)) {
                    return {
                        selector: tagSelector,
                        strategy: "tag",
                        unique: true,
                        root: rootType
                    };
                }

                // Strategy 3: Structural selector.

                const segments: string[] = [];

                let current: Element | null = element;

                while (current) {
                    const currentId = getIdSelector(current);

                    if (currentId) {
                        segments.unshift(currentId);
                    } else {
                        segments.unshift(
                            getStructuralSegment(current)
                        );
                    }

                    const selector = segments.join(" > ");

                    if (isUnique(selector, element)) {
                        return {
                            selector,
                            strategy: "structural",
                            unique: true,
                            root: rootType
                        };
                    }

                    current = current.parentElement;
                }

                const selector = segments.join(" > ");

                return {
                    selector,
                    strategy: "structural",
                    unique: isUnique(selector, element),
                    root: rootType
                };
            }
        );
    }
}