import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import {
    createServer
} from "node:http";

import type {
    Server
} from "node:http";

import type {
    AddressInfo
} from "node:net";

import type {
    Page
} from "playwright";

import {
    BrowserEngine,
    DOMFrameEngine,
    DOMQueryEngine,
    DOMAttributeEngine,
    DOMSelectorEngine
} from "../../src/engines/index.js";

describe("DOM Frame Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let frames: DOMFrameEngine;

    let mainServer: Server;
    let externalServer: Server;

    let mainUrl: string;
    let externalUrl: string;

    function startServer(
        server: Server
    ): Promise<string> {
        return new Promise(resolve => {
            server.listen(
                0,
                "127.0.0.1",
                () => {
                    const address =
                        server.address() as AddressInfo;

                    resolve(
                        `http://127.0.0.1:${address.port}`
                    );
                }
            );
        });
    }

    function closeServer(
        server: Server
    ): Promise<void> {
        return new Promise(resolve => {
            server.close(() => resolve());
        });
    }

    beforeAll(async () => {
        externalServer = createServer(
            (_request, response) => {
                response.writeHead(200, {
                    "Content-Type": "text/html"
                });

                response.end(`
                    <!DOCTYPE html>
                    <html lang="en">
                        <head>
                            <title>External frame</title>
                        </head>
                        <body>
                            <h1>External content</h1>
                            <img
                                id="external-image"
                                alt="External image"
                            >
                        </body>
                    </html>
                `);
            }
        );

        externalUrl =
            await startServer(externalServer);

        mainServer = createServer(
            (request, response) => {
                response.writeHead(200, {
                    "Content-Type": "text/html"
                });

                if (request.url === "/child") {
                    response.end(`
                        <!DOCTYPE html>
                        <html lang="en">
                            <head>
                                <title>Child frame</title>
                            </head>
                            <body>
                                <h1>Child content</h1>

                                <img
                                    id="child-image"
                                    alt="Child image"
                                >

                                <iframe
                                    name="nested"
                                    src="/nested"
                                ></iframe>
                            </body>
                        </html>
                    `);

                    return;
                }

                if (request.url === "/nested") {
                    response.end(`
                        <!DOCTYPE html>
                        <html lang="en">
                            <head>
                                <title>Nested frame</title>
                            </head>
                            <body>
                                <img
                                    id="nested-image"
                                    alt="Nested image"
                                >
                            </body>
                        </html>
                    `);

                    return;
                }

                if (request.url === "/simple") {
                    response.end(`
                        <!DOCTYPE html>
                        <html lang="en">
                            <head>
                                <title>Simple frame</title>
                            </head>
                            <body>
                                <button>Submit</button>
                            </body>
                        </html>
                    `);

                    return;
                }

                response.end(`
                    <!DOCTYPE html>
                    <html lang="en">
                        <head>
                            <title>Main document</title>
                        </head>
                        <body>
                            <img
                                id="main-image"
                                alt="Main image"
                            >

                            <iframe
                                id="child"
                                name="child"
                                src="/child"
                            ></iframe>

                            <iframe
                                id="simple"
                                name="simple"
                                src="/simple"
                            ></iframe>

                            <iframe
                                id="external"
                                name="external"
                                src="${externalUrl}"
                            ></iframe>
                        </body>
                    </html>
                `);
            }
        );

        mainUrl =
            await startServer(mainServer);

        browser = new BrowserEngine();

        const session = await browser.start();

        page = session.page;
        frames = new DOMFrameEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await browser.navigate(mainUrl);
    });

    afterAll(async () => {
        await browser?.close();

        if (mainServer) {
            await closeServer(mainServer);
        }

        if (externalServer) {
            await closeServer(externalServer);
        }
    });

    it("discovers the complete frame tree", async () => {
        const result = await frames.discover();

        expect(result.totalDiscovered).toBe(5);
        expect(result.returnedCount).toBe(5);
        expect(result.availableCount).toBe(5);
        expect(result.truncated).toBe(false);
    });

    it("identifies the main document", async () => {
        const result = await frames.discover();

        const main = result.frames.find(
            entry => entry.reference.isMainFrame
        );

        expect(main?.reference.id).toBe("main");
        expect(main?.reference.depth).toBe(0);
        expect(main?.reference.path).toEqual([]);
        expect(main?.reference.parentId).toBeNull();
    });

    it("extracts frame titles", async () => {
        const result = await frames.discover();

        expect(
            result.frames.map(
                entry => entry.reference.title
            )
        ).toContain("Nested frame");

        expect(
            result.frames.map(
                entry => entry.reference.title
            )
        ).toContain("External frame");
    });

    it("extracts frame names", async () => {
        const result = await frames.discover();

        expect(
            result.frames.map(
                entry => entry.reference.name
            )
        ).toContain("child");
    });

    it("extracts document URLs", async () => {
        const result = await frames.discover();

        const nested = result.frames.find(
            entry => entry.reference.name === "nested"
        );

        expect(nested?.reference.url)
            .toBe(`${mainUrl}/nested`);
    });

    it("identifies nested frame depth", async () => {
        const result = await frames.discover();

        const nested = result.frames.find(
            entry => entry.reference.name === "nested"
        );

        expect(nested?.reference.depth).toBe(2);

        expect(
            nested?.reference.path
        ).toHaveLength(2);
    });

    it("identifies parent relationships", async () => {
        const result = await frames.discover();

        const child = result.frames.find(
            entry => entry.reference.name === "child"
        );

        const nested = result.frames.find(
            entry => entry.reference.name === "nested"
        );

        expect(nested?.reference.parentId)
            .toBe(child?.reference.id);
    });

    it("generates unique frame identifiers", async () => {
        const result = await frames.discover();

        const ids = new Set(
            result.frames.map(
                entry => entry.reference.id
            )
        );

        expect(ids.size).toBe(5);
    });

    it("generates repeatable identifiers for unchanged frames", async () => {
        const first = await frames.discover();
        const second = await frames.discover();

        expect(
            frames.getReferences(first)
        ).toEqual(
            frames.getReferences(second)
        );
    });

    it("identifies same-origin frames", async () => {
        const result = await frames.discover();

        const child = result.frames.find(
            entry => entry.reference.name === "child"
        );

        expect(child?.reference.origin)
            .toBe(mainUrl);

        expect(child?.reference.crossOrigin)
            .toBe(false);
    });

    it("identifies cross-origin frames", async () => {
        const result = await frames.discover();

        const external = result.frames.find(
            entry =>
                entry.reference.name === "external"
        );

        expect(external?.reference.origin)
            .toBe(externalUrl);

        expect(external?.reference.crossOrigin)
            .toBe(true);
    });

    it("supports excluding the main document", async () => {
        const result = await frames.discover({
            includeMainFrame: false
        });

        expect(result.totalDiscovered).toBe(4);
        expect(result.returnedCount).toBe(4);

        expect(
            result.frames.some(
                entry => entry.reference.isMainFrame
            )
        ).toBe(false);
    });

    it("preserves origin metadata when excluding the main document", async () => {
        const result = await frames.discover({
            includeMainFrame: false
        });

        const external = result.frames.find(
            entry =>
                entry.reference.name === "external"
        );

        expect(external?.reference.crossOrigin)
            .toBe(true);
    });

    it("supports a maximum discovery depth", async () => {
        const result = await frames.discover({
            maxDepth: 1
        });

        expect(result.totalDiscovered).toBe(5);
        expect(result.returnedCount).toBe(4);

        expect(result.skippedByDepth).toBe(1);
        expect(result.truncated).toBe(true);
    });

    it("supports a zero discovery depth", async () => {
        const result = await frames.discover({
            maxDepth: 0
        });

        expect(result.returnedCount).toBe(1);
        expect(result.skippedByDepth).toBe(4);
    });

    it("supports limiting the number of frames", async () => {
        const result = await frames.discover({
            maxFrames: 2
        });

        expect(result.returnedCount).toBe(2);
        expect(result.skippedByLimit).toBe(3);
        expect(result.truncated).toBe(true);
    });

    it("supports a zero frame limit", async () => {
        const result = await frames.discover({
            maxFrames: 0
        });

        expect(result.returnedCount).toBe(0);
        expect(result.skippedByLimit).toBe(5);
        expect(result.truncated).toBe(true);
    });

    it("rejects invalid depth limits", async () => {
        await expect(
            frames.discover({
                maxDepth: -1
            })
        ).rejects.toThrow("maxDepth");
    });

    it("rejects invalid frame limits", async () => {
        await expect(
            frames.discover({
                maxFrames: 1.5
            })
        ).rejects.toThrow("maxFrames");
    });

    it("queries elements across multiple frames", async () => {
        const result = await frames.queryAll("img");

        expect(result.totalMatches).toBe(4);
        expect(result.returnedMatches).toBe(4);
        expect(result.incomplete).toBe(false);
    });

    it("queries cross-origin frame content", async () => {
        const result = await frames.queryAll(
            "#external-image"
        );

        expect(result.totalMatches).toBe(1);

        const external = result.results.find(
            entry =>
                entry.reference.name === "external"
        );

        expect(external?.result?.totalCount)
            .toBe(1);
    });

    it("queries nested frame content", async () => {
        const result = await frames.queryAll(
            "#nested-image"
        );

        expect(result.totalMatches).toBe(1);
    });

    it("returns complete empty results", async () => {
        const result = await frames.queryAll("video");

        expect(result.totalMatches).toBe(0);
        expect(result.incomplete).toBe(false);
    });

    it("reports truncated frame discovery as incomplete", async () => {
        const result = await frames.queryAll(
            "img",
            {
                maxFrames: 1
            }
        );

        expect(result.incomplete).toBe(true);
        expect(result.totalMatches).toBe(1);
    });

    it("reports truncated element queries as incomplete", async () => {
        const result = await frames.queryAll(
            "img",
            {
                limitPerFrame: 0
            }
        );

        expect(result.totalMatches).toBe(4);
        expect(result.returnedMatches).toBe(0);
        expect(result.incomplete).toBe(true);
    });

    it("rejects invalid per-frame limits", async () => {
        await expect(
            frames.queryAll(
                "img",
                {
                    limitPerFrame: -1
                }
            )
        ).rejects.toThrow("limitPerFrame");
    });

    it("rejects empty selectors", async () => {
        await expect(
            frames.queryAll(" ")
        ).rejects.toThrow(
            "DOM query selector cannot be empty."
        );
    });

    it("reports invalid selectors as query errors", async () => {
        const result = await frames.queryAll(
            "img["
        );

        expect(result.incomplete).toBe(true);

        expect(
            result.results.every(
                entry => entry.error !== null
            )
        ).toBe(true);
    });

    it("supports frames as DOM query roots", async () => {
        const discovery =
            await frames.discover();

        const entry = discovery.frames.find(
            item => item.reference.name === "child"
        );

        if (!entry) {
            throw new Error("Missing child frame.");
        }

        const query =
            new DOMQueryEngine(entry.frame);

        expect(
            await query.count("img")
        ).toBe(1);
    });

    it("supports frames as explicit query scopes", async () => {
        const discovery =
            await frames.discover();

        const entry = discovery.frames.find(
            item => item.reference.name === "external"
        );

        if (!entry) {
            throw new Error("Missing external frame.");
        }

        const query =
            new DOMQueryEngine(page);

        const result = await query.query(
            "img",
            {
                scope: entry.frame
            }
        );

        expect(result.totalCount).toBe(1);
    });

    it("integrates with the Attribute Engine", async () => {
        const result = await frames.queryAll(
            "#external-image"
        );

        const locator = result.results.find(
            entry =>
                entry.reference.name === "external"
        )?.result?.elements[0];

        if (!locator) {
            throw new Error("Missing external image.");
        }

        const attributes =
            new DOMAttributeEngine();

        expect(
            await attributes.getAttribute(
                locator,
                "alt"
            )
        ).toBe("External image");
    });

    it("integrates with the Selector Engine", async () => {
        const result = await frames.queryAll(
            "#nested-image"
        );

        const locator = result.results.find(
            entry =>
                entry.reference.name === "nested"
        )?.result?.elements[0];

        if (!locator) {
            throw new Error("Missing nested image.");
        }

        const selectors =
            new DOMSelectorEngine();

        const identification =
            await selectors.generate(locator);

        expect(identification.selector)
            .toBe("#nested-image");

        expect(identification.unique)
            .toBe(true);
    });

    it("produces serializable frame references", async () => {
        const discovery =
            await frames.discover();

        const references =
            frames.getReferences(discovery);

        expect(
            JSON.parse(
                JSON.stringify(references)
            )
        ).toEqual(references);
    });

    it("discovers dynamically attached frames", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.name = "dynamic";
            iframe.src = "/simple";

            document.body.appendChild(iframe);
        });

        await page
            .frameLocator("iframe[name='dynamic']")
            .locator("button")
            .waitFor();

        const result = await frames.discover();

        expect(result.totalDiscovered).toBe(6);
    });

    it("reflects dynamically removed frames", async () => {
        await page.locator("#simple")
            .evaluate(element => {
                element.remove();
            });

        const result = await frames.discover();

        expect(result.totalDiscovered).toBe(4);

        expect(
            result.frames.some(
                entry =>
                    entry.reference.name === "simple"
            )
        ).toBe(false);
    });
});