export interface ElementBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface AccessibilityProperties {
    role?: string;
    name?: string;
    description?: string;

    exposed?: boolean;
    focusable?: boolean;
    focused?: boolean;

    disabled?: boolean;
    expanded?: boolean;
    selected?: boolean;
    checked?: boolean | "mixed";

    value?: string;
}

export interface ElementReference {
    id: string;
    pageId: string;

    selector: string;
    tagName: string;

    htmlId?: string;

    framePath?: string[];
    shadowHostPath?: string[];

    attributes?: Record<string, string>;

    textContent?: string;
    surroundingText?: string;

    visible?: boolean;
    bounds?: ElementBounds;

    accessibility?: AccessibilityProperties;
}