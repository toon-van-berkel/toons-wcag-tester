import type { Locator } from "playwright";

import type {
    DOMQueryOptions,
    DOMQueryResult,
    DOMQueryRoot,
    DOMQueryScope
} from "./types.js";

export class DOMQueryEngine {
    constructor(
        private readonly root: DOMQueryRoot
    ) {}

    private createLocator(
        selector: string,
        scope?: DOMQueryScope
    ): Locator {
        if (selector.trim().length === 0) {
            throw new Error(
                "DOM query selector cannot be empty."
            );
        }

        const root = scope ?? this.root;

        return root.locator(`css=${selector}`);
    }

    private validateLimit(limit: number): void {
        if (
            !Number.isSafeInteger(limit) ||
            limit < 0
        ) {
            throw new Error(
                "DOM query limit must be a non-negative safe integer."
            );
        }
    }

    async query(
        selector: string,
        options: DOMQueryOptions = {}
    ): Promise<DOMQueryResult> {
        if (options.limit !== undefined) {
            this.validateLimit(options.limit);
        }

        const locator = this.createLocator(
            selector,
            options.scope
        );

        const totalCount = await locator.count();

        const returnedCount = Math.min(
            totalCount,
            options.limit ?? totalCount
        );

        const elements: Locator[] = [];

        for (
            let index = 0;
            index < returnedCount;
            index++
        ) {
            elements.push(
                locator.nth(index)
            );
        }

        return {
            selector,
            elements,
            totalCount,
            returnedCount,
            truncated: returnedCount < totalCount
        };
    }

    async queryAll(
        selector: string,
        options: DOMQueryOptions = {}
    ): Promise<Locator[]> {
        const result = await this.query(
            selector,
            options
        );

        return result.elements;
    }

    async queryOne(
        selector: string,
        scope?: DOMQueryScope
    ): Promise<Locator | null> {
        const locator = this.createLocator(
            selector,
            scope
        );

        const count = await locator.count();

        if (count === 0) {
            return null;
        }

        return locator.first();
    }

    async count(
        selector: string,
        scope?: DOMQueryScope
    ): Promise<number> {
        const locator = this.createLocator(
            selector,
            scope
        );

        return locator.count();
    }

    async exists(
        selector: string,
        scope?: DOMQueryScope
    ): Promise<boolean> {
        const count = await this.count(
            selector,
            scope
        );

        return count > 0;
    }
}