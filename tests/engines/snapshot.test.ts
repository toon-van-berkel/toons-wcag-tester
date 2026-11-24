import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from "vitest";

import type {
    Page
} from "playwright";

import {
    BrowserEngine,
    DOMSnapshotEngine,
    DOMQueryEngine,
    DOMAttributeEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Snapshot Test Fixture</title>

            <base href="https://example.com/">

            <style>
                body {
                    margin: 0;
                    color: rgb(34, 34, 34);
                }

                #target {
                    display: block;
                    width: 200px;
                    height: 100px;
                    background-color: white;
                    opacity: 0.8;
                }

                #hidden {
                    display: none;
                }
            </style>
        </head>

        <body>
            <main id="main">
                <section aria-label="Projects">
                    <h2 id="heading">
                        Featured projects
                    </h2>

                    <figure>
                        <a href="/projects/example">
                            <img
                                id="target"
                                alt="Example project"
                            >
                        </a>

                        <figcaption>
                            Example caption
                        </figcaption>
                    </figure>

                    <img
                        id="second"
                        alt="Second image"
                    >

                    <img
                        id="hidden"
                        alt="Hidden image"
                    >

                    <div id="shadow-host"></div>
                </section>
            </main>
        </body>
    </html>
`;

describe("DOM Snapshot Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let snapshots: DOMSnapshotEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session =
            await browser.start();

        page = session.page;

        snapshots =
            new DOMSnapshotEngine(page);
    }, 30_000);

    beforeEach(async () => {
        vi.restoreAllMocks();

        await page.setContent(fixture);
    });

    afterAll(async () => {
        vi.restoreAllMocks();

        await browser?.close();
    });

    it("captures a complete element snapshot", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(result.status).toBe("complete");

        expect(result.consistency)
            .toBe("verified");

        expect(result.errors).toEqual([]);
    });

    it("captures all sections by default", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(result.requestedSections).toEqual([
            "identity",
            "frame",
            "attributes",
            "visibility",
            "styles",
            "context"
        ]);

        expect(result.completedSections)
            .toEqual(result.requestedSections);
    });

    it("captures selector identity", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            result.identity?.selector.selector
        ).toBe("#target");

        expect(
            result.identity?.selector.unique
        ).toBe(true);
    });

    it("captures document-root identity", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            result.identity?.shadow.hostPath
        ).toEqual([]);

        expect(
            result.identity?.shadow.insideShadowRoot
        ).toBe(false);
    });

    it("captures main frame metadata", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(result.frame?.id).toBe("main");

        expect(result.frame?.isMainFrame)
            .toBe(true);

        expect(result.frame?.title)
            .toBe("Snapshot Test Fixture");
    });

    it("captures element attributes", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            result.attributes?.attributes["alt"]
        ).toBe("Example project");

        expect(result.attributes?.tagName)
            .toBe("img");
    });

    it("captures visibility information", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            result.visibility?.potentiallyVisible
        ).toBe(true);

        expect(
            result.visibility?.bounds.width
        ).toBe(200);
    });

    it("captures hidden element information", async () => {
        const result = await snapshots.capture(
            page.locator("#hidden")
        );

        expect(result.status).toBe("complete");

        expect(
            result.visibility?.displayNone
        ).toBe(true);

        expect(
            result.visibility?.potentiallyVisible
        ).toBe(false);
    });

    it("captures computed CSS", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            result.styles?.properties["opacity"]
        ).toBe("0.8");

        expect(
            result.styles?.properties["width"]
        ).toBe("200px");
    });

    it("captures structural context", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            result.context?.heading?.text
        ).toBe("Featured projects");

        expect(
            result.context?.figure?.caption
        ).toBe("Example caption");

        expect(
            result.context?.link?.resolvedHref
        ).toBe(
            "https://example.com/projects/example"
        );
    });

    it("supports identity-only snapshots", async () => {
        const result = await snapshots.capture(
            page.locator("#target"),
            {
                attributes: false,
                visibility: false,
                styles: false,
                context: false
            }
        );

        expect(result.status).toBe("complete");

        expect(result.requestedSections)
            .toEqual(["identity", "frame"]);

        expect(result.completedSections)
            .toEqual(["identity", "frame"]);

        expect(result.attributes).toBeNull();
        expect(result.visibility).toBeNull();
        expect(result.styles).toBeNull();
        expect(result.context).toBeNull();
    });

    it.each([
        "attributes",
        "visibility",
        "styles",
        "context"
    ] as const)(
        "supports disabling the %s section",
        async section => {
            const result = await snapshots.capture(
                page.locator("#target"),
                {
                    [section]: false
                }
            );

            expect(result.status).toBe("complete");

            expect(result[section]).toBeNull();

            expect(result.requestedSections)
                .not.toContain(section);

            expect(result.completedSections)
                .not.toContain(section);
        }
    );

    it("passes custom CSS extraction options", async () => {
        const result = await snapshots.capture(
            page.locator("#target"),
            {
                styleOptions: {
                    properties: [
                        "opacity",
                        "width"
                    ]
                }
            }
        );

        expect(result.styles?.properties)
            .toEqual({
                opacity: "0.8",
                width: "200px"
            });
    });

    it("passes custom context extraction options", async () => {
        const result = await snapshots.capture(
            page.locator("#target"),
            {
                contextOptions: {
                    maxAncestors: 1
                }
            }
        );

        expect(result.context?.ancestors)
            .toHaveLength(1);

        expect(
            result.context?.ancestorsTruncated
        ).toBe(true);
    });

    it("captures timestamps and duration", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            Number.isNaN(
                Date.parse(result.capturedAt)
            )
        ).toBe(false);

        expect(
            Date.parse(result.finishedAt)
        ).toBeGreaterThanOrEqual(
            Date.parse(result.capturedAt)
        );

        expect(result.durationMs)
            .toBeGreaterThanOrEqual(0);
    });

    it("produces serializable snapshots", async () => {
        const result = await snapshots.capture(
            page.locator("#target")
        );

        expect(
            JSON.parse(JSON.stringify(result))
        ).toEqual(result);
    });

    it("reports missing targets as errors", async () => {
        const result = await snapshots.capture(
            page.locator("#missing"),
            {
                targetTimeoutMs: 250
            }
        );

        expect(result.status).toBe("error");

        expect(result.consistency)
            .toBe("unknown");

        expect(result.errors[0]?.section)
            .toBe("target");

        expect(result.completedSections)
            .toEqual([]);
    });

    it("reports ambiguous locators as errors", async () => {
        const result = await snapshots.capture(
            page.locator("img"),
            {
                targetTimeoutMs: 250
            }
        );

        expect(result.status).toBe("error");

        expect(result.errors[0]?.section)
            .toBe("target");
    });

    it("preserves partial snapshots when CSS extraction fails", async () => {
        const result = await snapshots.capture(
            page.locator("#target"),
            {
                styleOptions: {
                    properties: [" "]
                }
            }
        );

        expect(result.status).toBe("partial");

        expect(result.consistency)
            .toBe("verified");

        expect(result.styles).toBeNull();

        expect(result.attributes)
            .not.toBeNull();

        expect(result.context)
            .not.toBeNull();

        expect(
            result.errors.some(
                error =>
                    error.section === "styles"
            )
        ).toBe(true);

        expect(result.completedSections)
            .not.toContain("styles");
    });

    it("preserves partial snapshots when context extraction fails", async () => {
        const result = await snapshots.capture(
            page.locator("#target"),
            {
                contextOptions: {
                    maxAncestors: -1
                }
            }
        );

        expect(result.status).toBe("partial");

        expect(result.context).toBeNull();

        expect(result.styles)
            .not.toBeNull();

        expect(
            result.errors.some(
                error =>
                    error.section === "context"
            )
        ).toBe(true);
    });

    it("ignores extraction options for disabled sections", async () => {
        const result = await snapshots.capture(
            page.locator("#target"),
            {
                styles: false,

                styleOptions: {
                    properties: [" "]
                }
            }
        );

        expect(result.status).toBe("complete");

        expect(result.styles).toBeNull();

        expect(result.errors).toEqual([]);
    });

    it.each([
        0,
        -1,
        1.5,
        Infinity
    ])(
        "rejects invalid target timeout: %s",
        async timeout => {
            await expect(
                snapshots.capture(
                    page.locator("#target"),
                    {
                        targetTimeoutMs: timeout
                    }
                )
            ).rejects.toThrow(
                "targetTimeoutMs"
            );
        }
    );

    it("detects target detachment during capture", async () => {
        const original =
            DOMAttributeEngine.prototype.getAttributes;

        const spy = vi.spyOn(
            DOMAttributeEngine.prototype,
            "getAttributes"
        );

        spy.mockImplementationOnce(
            async function (this: DOMAttributeEngine, locator) {
                const result =
                    await original.call(
                        this,
                        locator
                    );

                await locator.evaluate(
                    element => element.remove()
                );

                return result;
            }
        );

        try {
            const result = await snapshots.capture(
                page.locator("#target")
            );

            expect(result.status)
                .toBe("partial");

            expect(result.consistency)
                .toBe("changed");

            expect(result.attributes)
                .toBeNull();

            expect(result.completedSections)
                .not.toContain("attributes");

            expect(
                result.errors.some(
                    error =>
                        error.section === "consistency"
                )
            ).toBe(true);

        } finally {
            spy.mockRestore();
        }
    });

    it("detects a locator resolving to another connected element", async () => {
        const original =
            DOMAttributeEngine.prototype.getAttributes;

        const spy = vi.spyOn(
            DOMAttributeEngine.prototype,
            "getAttributes"
        );

        spy.mockImplementationOnce(
            async function (this: DOMAttributeEngine, locator) {
                const result =
                    await original.call(
                        this,
                        locator
                    );

                await locator.evaluate(element => {
                    element.id = "original-target";

                    const replacement =
                        document.createElement("img");

                    replacement.id = "target";

                    replacement.alt =
                        "Replacement image";

                    element.after(replacement);
                });

                return result;
            }
        );

        try {
            const result = await snapshots.capture(
                page.locator("#target")
            );

            expect(result.status)
                .toBe("partial");

            expect(result.consistency)
                .toBe("changed");

            expect(result.attributes)
                .toBeNull();

            expect(result.visibility)
                .toBeNull();

            expect(result.styles)
                .toBeNull();

            expect(result.context)
                .toBeNull();

        } finally {
            spy.mockRestore();
        }
    });

    it("captures updated content in subsequent snapshots", async () => {
        const target = page.locator("#target");

        const first =
            await snapshots.capture(target);

        await target.evaluate(element => {
            element.setAttribute(
                "alt",
                "Updated alternative text"
            );
        });

        const second =
            await snapshots.capture(target);

        expect(
            first.attributes?.attributes["alt"]
        ).toBe("Example project");

        expect(
            second.attributes?.attributes["alt"]
        ).toBe("Updated alternative text");
    });

    it("captures elements inside shadow roots", async () => {
        await page.locator("#shadow-host")
            .evaluate(host => {
                host.attachShadow({
                    mode: "open"
                }).innerHTML =
                    '<button id="shadow-button">' +
                    'Shadow button' +
                    '</button>';
            });

        const result = await snapshots.capture(
            page.locator("#shadow-button")
        );

        expect(result.status).toBe("complete");

        expect(
            result.identity?.shadow.hostPath
        ).toEqual(["#shadow-host"]);

        expect(
            result.identity?.shadow.insideShadowRoot
        ).toBe(true);

        expect(result.attributes?.tagName)
            .toBe("button");

        expect(result.context?.insideShadowRoot)
            .toBe(true);
    });

    it("captures elements inside iframes", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "embedded-frame";

            iframe.name = "embedded";

            iframe.srcdoc =
                '<html lang="nl">' +
                '<head><title>Embedded</title></head>' +
                '<body>' +
                '<img id="embedded-image" alt="Embedded image">' +
                '</body></html>';

            document.body.appendChild(iframe);
        });

        const target = page
            .frameLocator("#embedded-frame")
            .locator("#embedded-image");

        await target.waitFor({
            state: "attached"
        });

        const result =
            await snapshots.capture(target);

        expect(result.status).toBe("complete");

        expect(result.frame?.isMainFrame)
            .toBe(false);

        expect(result.frame?.depth)
            .toBe(1);

        expect(result.frame?.name)
            .toBe("embedded");

        expect(result.frame?.title)
            .toBe("Embedded");

        expect(
            result.attributes?.attributes["alt"]
        ).toBe("Embedded image");

        expect(
            result.context?.language.language
        ).toBe("nl");
    });

    it("captures multiple elements in order", async () => {
        const result =
            await snapshots.captureAll([
                page.locator("#second"),
                page.locator("#target")
            ]);

        expect(result.totalCount)
            .toBe(2);

        expect(result.completeCount)
            .toBe(2);

        expect(result.incomplete)
            .toBe(false);

        expect(
            result.snapshots.map(
                snapshot =>
                    snapshot.identity?.shadow.htmlId
            )
        ).toEqual([
            "second",
            "target"
        ]);
    });

    it("aggregates batch capture errors", async () => {
        const result =
            await snapshots.captureAll(
                [
                    page.locator("#target"),
                    page.locator("#missing"),
                    page.locator("#second")
                ],
                {
                    targetTimeoutMs: 250
                }
            );

        expect(result.totalCount).toBe(3);

        expect(result.completeCount).toBe(2);

        expect(result.partialCount).toBe(0);

        expect(result.errorCount).toBe(1);

        expect(result.incomplete).toBe(true);
    });

    it("aggregates partial batch captures", async () => {
        const result =
            await snapshots.captureAll(
                [
                    page.locator("#target"),
                    page.locator("#second")
                ],
                {
                    contextOptions: {
                        maxTextLength: -1
                    }
                }
            );

        expect(result.totalCount).toBe(2);

        expect(result.completeCount).toBe(0);

        expect(result.partialCount).toBe(2);

        expect(result.errorCount).toBe(0);

        expect(result.incomplete).toBe(true);
    });

    it("supports empty batches", async () => {
        const result =
            await snapshots.captureAll([]);

        expect(result.snapshots).toEqual([]);

        expect(result.totalCount).toBe(0);

        expect(result.completeCount).toBe(0);

        expect(result.partialCount).toBe(0);

        expect(result.errorCount).toBe(0);

        expect(result.incomplete).toBe(false);
    });

    it("integrates with DOM Query Engine results", async () => {
        const query =
            new DOMQueryEngine(page);

        const images =
            await query.queryAll("img");

        const result =
            await snapshots.captureAll(
                images,
                {
                    styles: false
                }
            );

        expect(result.totalCount).toBe(3);

        expect(result.completeCount).toBe(3);

        expect(
            result.snapshots.every(
                snapshot =>
                    snapshot.styles === null
            )
        ).toBe(true);

        expect(
            result.snapshots.map(
                snapshot =>
                    snapshot.attributes
                        ?.attributes["alt"]
            )
        ).toEqual([
            "Example project",
            "Second image",
            "Hidden image"
        ]);
    });

    it("produces serializable batch results", async () => {
        const result =
            await snapshots.captureAll([
                page.locator("#target"),
                page.locator("#second")
            ]);

        expect(
            JSON.parse(JSON.stringify(result))
        ).toEqual(result);
    });

    it("validates options even for empty batches", async () => {
        await expect(
            snapshots.captureAll(
                [],
                {
                    targetTimeoutMs: -1
                }
            )
        ).rejects.toThrow(
            "targetTimeoutMs"
        );
    });
});