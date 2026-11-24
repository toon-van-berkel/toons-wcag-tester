import type { Locator } from "playwright";

export interface DOMAttribute {
    name: string;
    value: string;
    localName: string;
    namespaceURI: string | null;
    prefix: string | null;
}

export interface DOMAttributeResult {
    tagName: string;
    namespaceURI: string | null;

    attributes: Record<string, string>;
    entries: DOMAttribute[];

    ariaAttributes: Record<string, string>;
    dataAttributes: Record<string, string>;
    booleanAttributes: Record<string, boolean>;

    totalCount: number;
}

export interface DOMAttributeState {
    name: string;
    present: boolean;
    empty: boolean;
    value: string | null;
}

const booleanAttributeNames = [
    "allowfullscreen",
    "async",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "defer",
    "disabled",
    "formnovalidate",
    "inert",
    "ismap",
    "loop",
    "multiple",
    "muted",
    "nomodule",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "selected"
] as const;

export class DOMAttributeEngine {
    async getAttributes(
        locator: Locator
    ): Promise<DOMAttributeResult> {
        return locator.evaluate(
            (element, booleanNames): DOMAttributeResult => {
                const entries = Array.from(
                    element.attributes,
                    attribute => ({
                        name: attribute.name,
                        value: attribute.value,
                        localName: attribute.localName,
                        namespaceURI: attribute.namespaceURI,
                        prefix: attribute.prefix
                    })
                );

                const attributes = Object.fromEntries(
                    entries.map(attribute => [
                        attribute.name,
                        attribute.value
                    ])
                );

                const ariaAttributes = Object.fromEntries(
                    entries
                        .filter(attribute =>
                            attribute.name.startsWith("aria-")
                        )
                        .map(attribute => [
                            attribute.name,
                            attribute.value
                        ])
                );

                const dataAttributes = Object.fromEntries(
                    entries
                        .filter(attribute =>
                            attribute.name.startsWith("data-")
                        )
                        .map(attribute => [
                            attribute.name,
                            attribute.value
                        ])
                );

                const booleanAttributes = Object.fromEntries(
                    booleanNames.map(name => [
                        name,
                        element.hasAttribute(name)
                    ])
                );

                return {
                    tagName: element.localName,
                    namespaceURI: element.namespaceURI,

                    attributes,
                    entries,

                    ariaAttributes,
                    dataAttributes,
                    booleanAttributes,

                    totalCount: entries.length
                };
            },
            [...booleanAttributeNames]
        );
    }

    async getAttribute(
        locator: Locator,
        name: string
    ): Promise<string | null> {
        return locator.getAttribute(name);
    }

    async hasAttribute(
        locator: Locator,
        name: string
    ): Promise<boolean> {
        return locator.evaluate(
            (element, attributeName) =>
                element.hasAttribute(attributeName),
            name
        );
    }

    async getAttributeState(
        locator: Locator,
        name: string
    ): Promise<DOMAttributeState> {
        const value = await this.getAttribute(
            locator,
            name
        );

        return {
            name,
            present: value !== null,
            empty: value === "",
            value
        };
    }

    async getARIAAttributes(
        locator: Locator
    ): Promise<Record<string, string>> {
        const result = await this.getAttributes(locator);

        return result.ariaAttributes;
    }

    async getDataAttributes(
        locator: Locator
    ): Promise<Record<string, string>> {
        const result = await this.getAttributes(locator);

        return result.dataAttributes;
    }

    async getBooleanAttributes(
        locator: Locator
    ): Promise<Record<string, boolean>> {
        const result = await this.getAttributes(locator);

        return result.booleanAttributes;
    }
}