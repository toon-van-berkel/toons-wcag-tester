import type {
    Frame,
    Locator,
    Page
} from "playwright";

export type DOMQueryRoot = Page | Frame;

export type DOMQueryScope =
    | Page
    | Frame
    | Locator;

export interface DOMQueryOptions {
    scope?: DOMQueryScope;
    limit?: number;
}

export interface DOMQueryResult {
    selector: string;

    elements: Locator[];

    totalCount: number;
    returnedCount: number;

    truncated: boolean;
}