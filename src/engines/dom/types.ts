import type { Locator, Page } from "playwright";

export type DOMQueryScope = Page | Locator;

export interface DOMQueryOptions {
    scope?: Locator;
    limit?: number;
}

export interface DOMQueryResult {
    selector: string;

    elements: Locator[];

    totalCount: number;
    returnedCount: number;

    truncated: boolean;
}