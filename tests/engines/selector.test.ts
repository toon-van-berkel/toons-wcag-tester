import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import type {
    Locator,
    Page
} from "playwright";

import {
    BrowserEngine,
    DOMQueryEngine,
    DOMSelectorEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Selector Test Fixture</title>
        </head>

        <body>
            <header>
                <nav>
                    <a href="/">Home</a>
                    <a href="/about">About</a>
                </nav>
            </header>

            <main id="content">
                <h1>Selector Test</h1>

                <section id="gallery">
                    <img alt="First">
                    <img alt="Second">
                    <img alt="Third">
                </section>

                <section id="controls">
                    <button>First</button>
                    <span>Separator</span>
                    <button>Second</button>
                </section>

                <section>
                    <div id="duplicate">First duplicate</div>
                    <div id="duplicate">Second duplicate</div>
                </section>

                <div id="section:one"></div>
                <div id="section.one"></div>
                <div id="123element"></div>
                <div id="with space"></div>
                <div id="café"></div>

                <svg>
                    <circle cx="10" cy="10" r="5"/>
                    <circle cx="20" cy="20" r="5"/>
                </svg>

                <div id="shadow-host"></div>
            </main>

            <footer>
                <a href="/contact">Contact</a>
            </footer>
        </body>
    </html>
`;

describe("DOM Selector Engine", () => {
    let browser: BrowserEngine;
    let page: Page;

    let query: DOMQueryEngine;
    let selector: DOMSelectorEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session = await browser.start();

        page = session.page;

        query = new DOMQueryEngine(page);
        selector = new DOMSelectorEngine();
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    async function expectUniqueMatch(
        target: Locator
    ): Promise<void> {
        const result = await selector.generate(target);

        expect(result.unique).toBe(true);

        const sameElement = await target.evaluate(
            (element, generatedSelector) => {
                const root = element.getRootNode();

                if (
                    !(root instanceof Document) &&
                    !(root instanceof ShadowRoot)
                ) {
                    return false;
                }

                const matches = root.querySelectorAll(
                    generatedSelector
                );

                return (
                    matches.length === 1 &&
                    matches.item(0) === element
                );
            },
            result.selector
        );

        expect(sameElement).toBe(true);
    }

    it("generates selectors from unique IDs", async () => {
        const result = await selector.generate(
            page.locator("#content")
        );

        expect(result.selector).toBe("#content");
        expect(result.strategy).toBe("id");
        expect(result.unique).toBe(true);
    });

    it("generates selectors from unique tags", async () => {
        const result = await selector.generate(
            page.locator("footer")
        );

        expect(result.selector).toBe("footer");
        expect(result.strategy).toBe("tag");
    });

    it("generates structural selectors", async () => {
        const result = await selector.generate(
            page.locator("img").nth(1)
        );

        expect(result.strategy).toBe("structural");
        expect(result.unique).toBe(true);
    });

    it("identifies the correct first image", async () => {
        await expectUniqueMatch(
            page.locator("img").nth(0)
        );
    });

    it("identifies the correct second image", async () => {
        await expectUniqueMatch(
            page.locator("img").nth(1)
        );
    });

    it("identifies the correct third image", async () => {
        await expectUniqueMatch(
            page.locator("img").nth(2)
        );
    });

    it("handles siblings of different types", async () => {
        await expectUniqueMatch(
            page.locator("button").nth(1)
        );
    });

    it("handles duplicate IDs", async () => {
        const target = page.locator(
            "[id='duplicate']"
        ).first();

        const result = await selector.generate(target);

        expect(result.strategy).not.toBe("id");

        await expectUniqueMatch(target);
    });

    it("distinguishes elements with duplicate IDs", async () => {
        const duplicates = page.locator(
            "[id='duplicate']"
        );

        const first = await selector.generate(
            duplicates.nth(0)
        );

        const second = await selector.generate(
            duplicates.nth(1)
        );

        expect(first.selector).not.toBe(
            second.selector
        );

        await expectUniqueMatch(duplicates.nth(0));
        await expectUniqueMatch(duplicates.nth(1));
    });

    it.each([
        "section:one",
        "section.one",
        "123element",
        "with space",
        "café"
    ])(
        "escapes special ID characters: %s",
        async id => {
            const target = page.locator(
                `[id="${id}"]`
            );

            const result = await selector.generate(target);

            expect(result.strategy).toBe("id");

            await expectUniqueMatch(target);
        }
    );

    it("supports SVG elements", async () => {
        await expectUniqueMatch(
            page.locator("svg")
        );
    });

    it("distinguishes repeated SVG elements", async () => {
        await expectUniqueMatch(
            page.locator("circle").nth(0)
        );

        await expectUniqueMatch(
            page.locator("circle").nth(1)
        );
    });

    it("supports deeply nested elements", async () => {
        await expectUniqueMatch(
            page.locator("nav a").nth(1)
        );
    });

    it("identifies the document root", async () => {
        const result = await selector.generate(
            page.locator("html")
        );

        expect(result.selector).toBe("html");
        expect(result.unique).toBe(true);
        expect(result.root).toBe("document");
    });

    it("generates repeatable selectors for unchanged elements", async () => {
        const target = page.locator("img").nth(1);

        const first = await selector.generate(target);
        const second = await selector.generate(target);

        expect(first).toEqual(second);
    });

    it("integrates with the DOM Query Engine", async () => {
        const elements = await query.queryAll("img");

        expect(elements).toHaveLength(3);

        for (const element of elements) {
            await expectUniqueMatch(element);
        }
    });

    it("generates different selectors for different elements", async () => {
        const elements = await query.queryAll("img");

        const selectors = await Promise.all(
            elements.map(
                element => selector.generate(element)
            )
        );

        const uniqueSelectors = new Set(
            selectors.map(result => result.selector)
        );

        expect(uniqueSelectors.size).toBe(3);
    });

    it("rejects ambiguous locators", async () => {
        await expect(
            selector.generate(
                page.locator("img")
            )
        ).rejects.toThrow();
    });

    it("supports elements inside an open shadow root", async () => {
        await page.evaluate(() => {
            const host = document.getElementById(
                "shadow-host"
            );

            if (!host) {
                throw new Error("Missing shadow host");
            }

            const shadow = host.attachShadow({
                mode: "open"
            });

            shadow.innerHTML = `
                <button id="shadow-button">
                    Shadow button
                </button>
            `;
        });

        const target = page.locator(
            "#shadow-host #shadow-button"
        );

        const result = await selector.generate(target);

        expect(result.selector).toBe("#shadow-button");
        expect(result.root).toBe("shadow-root");

        await expectUniqueMatch(target);
    });
});