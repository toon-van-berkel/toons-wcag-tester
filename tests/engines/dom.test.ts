import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import type { Page } from "playwright";

import {
    BrowserEngine,
    DOMQueryEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>DOM Test Fixture</title>
        </head>

        <body>
            <header>
                <a href="/">Home</a>
                <a href="/about">About</a>
            </header>

            <main id="content">
                <h1>Accessibility Test</h1>

                <section id="gallery">
                    <img id="image-one" alt="Mountain">
                    <img id="image-two" alt="">
                    <img id="image-three">
                </section>

                <section id="controls">
                    <button>Submit</button>
                    <button>Cancel</button>

                    <input type="text">

                    <svg role="img" aria-label="Icon">
                        <circle cx="10" cy="10" r="5"/>
                    </svg>

                    <canvas></canvas>
                </section>

                <div hidden>
                    <button>Hidden button</button>
                </div>
            </main>

            <footer>
                <a href="/contact">Contact</a>
            </footer>
        </body>
    </html>
`;

describe("DOM Query Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let dom: DOMQueryEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session = await browser.start();

        page = session.page;
        dom = new DOMQueryEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("queries multiple elements", async () => {
        const result = await dom.query("img");

        expect(result.totalCount).toBe(3);
        expect(result.returnedCount).toBe(3);
        expect(result.elements).toHaveLength(3);
        expect(result.truncated).toBe(false);
    });

    it("returns the original selector", async () => {
        const result = await dom.query("img");

        expect(result.selector).toBe("img");
    });

    it("returns all matching elements", async () => {
        const elements = await dom.queryAll("img");

        expect(elements).toHaveLength(3);
    });

    it("returns the first matching element", async () => {
        const element = await dom.queryOne("img");

        expect(element).not.toBeNull();

        expect(
            await element?.getAttribute("id")
        ).toBe("image-one");
    });

    it("returns null for a missing element", async () => {
        const element = await dom.queryOne("video");

        expect(element).toBeNull();
    });

    it("returns an empty query result", async () => {
        const result = await dom.query("video");

        expect(result.totalCount).toBe(0);
        expect(result.returnedCount).toBe(0);
        expect(result.elements).toEqual([]);
        expect(result.truncated).toBe(false);
    });

    it("counts matching elements", async () => {
        expect(
            await dom.count("button")
        ).toBe(3);
    });

    it("counts missing elements", async () => {
        expect(
            await dom.count("video")
        ).toBe(0);
    });

    it("detects existing elements", async () => {
        expect(
            await dom.exists("canvas")
        ).toBe(true);
    });

    it("detects missing elements", async () => {
        expect(
            await dom.exists("video")
        ).toBe(false);
    });

    it("supports attribute selectors", async () => {
        const elements = await dom.queryAll("img[alt]");

        expect(elements).toHaveLength(2);
    });

    it("supports negation selectors", async () => {
        const elements = await dom.queryAll(
            "img:not([alt])"
        );

        expect(elements).toHaveLength(1);
    });

    it("supports combined selectors", async () => {
        const elements = await dom.queryAll(
            "img, svg, canvas"
        );

        expect(elements).toHaveLength(5);
    });

    it("supports scoped queries", async () => {
        const scope = page.locator("#controls");

        const result = await dom.query(
            "button",
            { scope }
        );

        expect(result.totalCount).toBe(2);
    });

    it("supports scoped single-element queries", async () => {
        const scope = page.locator("footer");

        const element = await dom.queryOne(
            "a",
            scope
        );

        expect(
            await element?.textContent()
        ).toBe("Contact");
    });

    it("supports scoped counting", async () => {
        const scope = page.locator("header");

        expect(
            await dom.count("a", scope)
        ).toBe(2);
    });

    it("supports scoped existence checks", async () => {
        const scope = page.locator("#gallery");

        expect(
            await dom.exists("img", scope)
        ).toBe(true);

        expect(
            await dom.exists("button", scope)
        ).toBe(false);
    });

    it("supports limiting results", async () => {
        const result = await dom.query(
            "img",
            { limit: 2 }
        );

        expect(result.totalCount).toBe(3);
        expect(result.returnedCount).toBe(2);
        expect(result.elements).toHaveLength(2);
        expect(result.truncated).toBe(true);
    });

    it("supports a zero limit", async () => {
        const result = await dom.query(
            "img",
            { limit: 0 }
        );

        expect(result.totalCount).toBe(3);
        expect(result.returnedCount).toBe(0);
        expect(result.truncated).toBe(true);
    });

    it("does not truncate when the limit exceeds the count", async () => {
        const result = await dom.query(
            "img",
            { limit: 10 }
        );

        expect(result.totalCount).toBe(3);
        expect(result.returnedCount).toBe(3);
        expect(result.truncated).toBe(false);
    });

    it.each([
        -1,
        1.5,
        Infinity,
        NaN
    ])(
        "rejects invalid limit %s",
        async limit => {
            await expect(
                dom.query("img", { limit })
            ).rejects.toThrow(
                "DOM query limit"
            );
        }
    );

    it("rejects empty selectors", async () => {
        await expect(
            dom.query("")
        ).rejects.toThrow(
            "DOM query selector cannot be empty."
        );
    });

    it("rejects whitespace-only selectors", async () => {
        await expect(
            dom.query("   ")
        ).rejects.toThrow(
            "DOM query selector cannot be empty."
        );
    });

    it("rejects invalid CSS selectors", async () => {
        await expect(
            dom.query("img[")
        ).rejects.toThrow();
    });

    it("includes hidden elements", async () => {
        const elements = await dom.queryAll(
            "[hidden] button"
        );

        expect(elements).toHaveLength(1);

        expect(
            await elements[0]?.isVisible()
        ).toBe(false);
    });

    it("detects dynamically added elements", async () => {
        await page.evaluate(() => {
            const image = document.createElement("img");

            document.body.appendChild(image);
        });

        expect(
            await dom.count("img")
        ).toBe(4);
    });
});