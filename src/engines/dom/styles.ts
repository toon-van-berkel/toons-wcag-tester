import type { Locator } from "playwright";

export const DOM_STYLE_GROUPS = {
    color: [
        "color",
        "background-color",
        "opacity",
        "filter",
        "backdrop-filter",
        "mix-blend-mode",
        "background-blend-mode",
        "color-scheme",
        "forced-color-adjust"
    ],

    typography: [
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "font-variant",
        "font-stretch",
        "line-height",
        "letter-spacing",
        "word-spacing",
        "text-align",
        "text-indent",
        "text-transform",
        "text-decoration-line",
        "text-decoration-color",
        "text-decoration-style",
        "text-decoration-thickness",
        "text-underline-offset",
        "text-shadow",
        "white-space",
        "overflow-wrap",
        "word-break",
        "writing-mode",
        "direction"
    ],

    layout: [
        "display",
        "position",
        "top",
        "right",
        "bottom",
        "left",
        "z-index",
        "width",
        "height",
        "min-width",
        "min-height",
        "max-width",
        "max-height",
        "box-sizing",
        "aspect-ratio",
        "float",
        "clear",
        "flex-direction",
        "flex-wrap",
        "flex-grow",
        "flex-shrink",
        "justify-content",
        "align-items",
        "grid-template-columns",
        "grid-template-rows",
        "transform",
        "zoom"
    ],

    spacing: [
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "gap",
        "row-gap",
        "column-gap"
    ],

    borders: [
        "border-top-width",
        "border-right-width",
        "border-bottom-width",
        "border-left-width",
        "border-top-style",
        "border-right-style",
        "border-bottom-style",
        "border-left-style",
        "border-top-color",
        "border-right-color",
        "border-bottom-color",
        "border-left-color",
        "border-radius",
        "outline-width",
        "outline-style",
        "outline-color",
        "outline-offset",
        "box-shadow"
    ],

    visibility: [
        "visibility",
        "display",
        "opacity",
        "content-visibility",
        "overflow-x",
        "overflow-y",
        "clip",
        "clip-path",
        "mask-image",
        "mask-mode",
        "mask-size"
    ],

    media: [
        "background-image",
        "background-size",
        "background-position",
        "background-repeat",
        "background-attachment",
        "background-origin",
        "background-clip",
        "object-fit",
        "object-position",
        "image-rendering",
        "mask-image"
    ],

    animation: [
        "animation-name",
        "animation-duration",
        "animation-delay",
        "animation-iteration-count",
        "animation-direction",
        "animation-timing-function",
        "animation-play-state",
        "animation-fill-mode",
        "transition-property",
        "transition-duration",
        "transition-delay",
        "transition-timing-function",
        "scroll-behavior"
    ],

    interaction: [
        "cursor",
        "pointer-events",
        "touch-action",
        "user-select",
        "resize",
        "scroll-snap-type",
        "scroll-snap-align",
        "scroll-margin-top",
        "scroll-margin-bottom"
    ],

    generatedContent: [
        "content",
        "counter-reset",
        "counter-increment",
        "counter-set",
        "quotes",
        "list-style-type",
        "list-style-image"
    ],

    svg: [
        "fill",
        "fill-opacity",
        "fill-rule",
        "stroke",
        "stroke-width",
        "stroke-opacity",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-dasharray",
        "paint-order",
        "vector-effect"
    ]
} as const;

export type DOMStyleGroup =
    keyof typeof DOM_STYLE_GROUPS;

export type DOMPseudoElement =
    | "::before"
    | "::after"
    | "::marker"
    | "::placeholder"
    | "::first-letter"
    | "::first-line"
    | "::selection"
    | "::file-selector-button"
    | "::backdrop";

export interface DOMStyleOptions {
    properties?: readonly string[];
    groups?: readonly DOMStyleGroup[];
    pseudoElement?: DOMPseudoElement;
    includeAll?: boolean;
}

export interface DOMStyleResult {
    tagName: string;

    pseudoElement: DOMPseudoElement | null;

    properties: Record<string, string>;

    requestedProperties: string[];

    unavailableProperties: string[];

    totalCount: number;
}

export interface DOMPseudoElementResult {
    pseudoElement: DOMPseudoElement;

    content: string;
    display: string;
    visibility: string;

    hasGeneratedContent: boolean;

    styles: DOMStyleResult;
}

export class DOMStyleEngine {
    getGroupProperties(
        group: DOMStyleGroup
    ): readonly string[] {
        return DOM_STYLE_GROUPS[group];
    }

    private resolveProperties(
        options: DOMStyleOptions
    ): string[] {
        const properties = new Set<string>();

        for (const property of options.properties ?? []) {
            const normalized = property.trim();

            if (normalized.length === 0) {
                throw new Error(
                    "CSS property name cannot be empty."
                );
            }

            properties.add(
                normalized.startsWith("--")
                    ? normalized
                    : normalized.toLowerCase()
            );
        }

        for (const group of options.groups ?? []) {
            for (const property of this.getGroupProperties(group)) {
                properties.add(property);
            }
        }

        if (
            properties.size === 0 &&
            !options.includeAll
        ) {
            for (const group of Object.keys(
                DOM_STYLE_GROUPS
            ) as DOMStyleGroup[]) {
                for (const property of this.getGroupProperties(group)) {
                    properties.add(property);
                }
            }
        }

        return [...properties];
    }

    async inspect(
        locator: Locator,
        options: DOMStyleOptions = {}
    ): Promise<DOMStyleResult> {
        const properties = this.resolveProperties(
            options
        );

        return locator.evaluate(
            (
                element,
                settings
            ): DOMStyleResult => {
                const view =
                    element.ownerDocument.defaultView;

                if (!view) {
                    throw new Error(
                        "Element has no associated browser window."
                    );
                }

                const style = view.getComputedStyle(
                    element,
                    settings.pseudoElement
                );

                const requested = new Set(
                    settings.properties
                );

                if (settings.includeAll) {
                    for (
                        let index = 0;
                        index < style.length;
                        index++
                    ) {
                        requested.add(
                            style.item(index)
                        );
                    }
                }

                const requestedProperties = [
                    ...requested
                ];

                const entries = requestedProperties.map(
                    property => [
                        property,
                        style.getPropertyValue(property)
                    ] as const
                );

                const unavailableProperties = entries
                    .filter(([, value]) => value === "")
                    .map(([property]) => property);

                return {
                    tagName: element.localName,

                    pseudoElement:
                        settings.pseudoElement,

                    properties:
                        Object.fromEntries(entries),

                    requestedProperties,

                    unavailableProperties,

                    totalCount: entries.length
                };
            },
            {
                properties,

                pseudoElement:
                    options.pseudoElement ?? null,

                includeAll:
                    options.includeAll ?? false
            }
        );
    }

    async getProperty(
        locator: Locator,
        property: string,
        pseudoElement?: DOMPseudoElement
    ): Promise<string> {
        const result = await this.inspect(
            locator,
            {
                properties: [property],

                ...(pseudoElement
                    ? { pseudoElement }
                    : {})
            }
        );

        const propertyName = property.trim();

        const normalized =
            propertyName.startsWith("--")
                ? propertyName
                : propertyName.toLowerCase();

        return result.properties[normalized] ?? "";
    }

    async getProperties(
        locator: Locator,
        properties: readonly string[],
        pseudoElement?: DOMPseudoElement
    ): Promise<Record<string, string>> {
        const result = await this.inspect(
            locator,
            {
                properties,

                ...(pseudoElement
                    ? { pseudoElement }
                    : {})
            }
        );

        return result.properties;
    }

    async getGroup(
        locator: Locator,
        group: DOMStyleGroup,
        pseudoElement?: DOMPseudoElement
    ): Promise<DOMStyleResult> {
        return this.inspect(
            locator,
            {
                groups: [group],

                ...(pseudoElement
                    ? { pseudoElement }
                    : {})
            }
        );
    }

    async inspectPseudoElement(
        locator: Locator,
        pseudoElement: DOMPseudoElement,
        options: Omit<
            DOMStyleOptions,
            "pseudoElement"
        > = {}
    ): Promise<DOMPseudoElementResult> {
        const styles = await this.inspect(
            locator,
            {
                ...options,

                pseudoElement,

                properties: [
                    ...(options.properties ?? []),
                    "content",
                    "display",
                    "visibility",
                    "background-image"
                ]
            }
        );

        const content =
            styles.properties["content"] ?? "";

        const display =
            styles.properties["display"] ?? "";

        const visibility =
            styles.properties["visibility"] ?? "";

        const hasGeneratedContent =
            content !== "" &&
            content !== "none" &&
            content !== "normal";

        return {
            pseudoElement,

            content,
            display,
            visibility,

            hasGeneratedContent,

            styles
        };
    }
}