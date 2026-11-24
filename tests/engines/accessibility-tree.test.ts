import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import type {
    Page
} from "playwright";

import {
    BrowserEngine,
    AccessibilityTreeEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Accessibility Tree Fixture</title>
        </head>

        <body>
            <header>
                <nav aria-label="Main navigation">
                    <a href="/home">Home</a>
                    <a href="/projects">Projects</a>
                </nav>
            </header>

            <main>
                <h1>Accessibility testing</h1>

                <img
                    id="informative-image"
                    alt="Project preview"
                >

                <img
                    id="decorative-image"
                    alt=""
                >

                <button id="native-button">
                    Save changes
                </button>

                <button
                    id="aria-button"
                    aria-label="Download project"
                >
                    Download
                </button>

                <span id="delete-label">
                    Delete project
                </span>

                <button
                    id="labelled-button"
                    aria-labelledby="delete-label"
                >
                    Remove
                </button>

                <p id="help">
                    Use your work email address.
                </p>

                <label for="email">
                    Email address
                </label>

                <input
                    id="email"
                    type="email"
                    aria-describedby="help"
                >

                <input
                    id="checkbox"
                    type="checkbox"
                    aria-label="Enable notifications"
                    checked
                >

                <button
                    id="disabled-button"
                    disabled
                >
                    Unavailable action
                </button>

                <button
                    id="expanded-button"
                    aria-expanded="true"
                >
                    Toggle menu
                </button>

                <div
                    role="button"
                    tabindex="0"
                    aria-label="Custom action"
                ></div>

                <div aria-hidden="true">
                    <button>Hidden action</button>
                </div>

                <div id="display-none" style="display: none">
                    <button>Not rendered</button>
                </div>

                <div id="shadow-host"></div>
            </main>
        </body>
    </html>
`;

describe("Accessibility Tree Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let accessibility: AccessibilityTreeEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session = await browser.start();

        page = session.page;

        accessibility =
            new AccessibilityTreeEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("captures an accessibility tree", async () => {
        const result =
            await accessibility.capture();

        expect(result.status)
            .toBe("complete");

        expect(result.nodes.length)
            .toBeGreaterThan(0);

        expect(result.errors)
            .toEqual([]);
    });

    it("identifies the browser and data source", async () => {
        const result =
            await accessibility.capture();

        expect(result.browser)
            .toBe("chromium");

        expect(result.source)
            .toBe("cdp");
    });

    it("captures main document metadata", async () => {
        const result =
            await accessibility.capture();

        expect(result.frameId)
            .not.toBeNull();

        expect(result.coverage.scope)
            .toBe("main_document");

        expect(result.coverage.capturedFrameCount)
            .toBe(1);
    });

    it("identifies accessibility root nodes", async () => {
        const result =
            await accessibility.capture();

        const roots =
            accessibility.getRoots(result);

        expect(roots.length)
            .toBeGreaterThan(0);

        expect(
            roots.some(
                node => node.role === "RootWebArea"
            )
        ).toBe(true);
    });

    it("extracts the document accessible name", async () => {
        const result =
            await accessibility.capture();

        const roots =
            accessibility.getByRole(
                result,
                "RootWebArea"
            );

        expect(roots[0]?.name)
            .toBe("Accessibility Tree Fixture");
    });

    it("extracts native button roles", async () => {
        const result =
            await accessibility.capture();

        const buttons =
            accessibility.getByRole(
                result,
                "button"
            );

        expect(
            buttons.some(
                node => node.name === "Save changes"
            )
        ).toBe(true);
    });

    it("extracts custom ARIA roles", async () => {
        const result =
            await accessibility.capture();

        const nodes =
            accessibility.getByName(
                result,
                "Custom action"
            );

        expect(nodes[0]?.role)
            .toBe("button");
    });

    it("extracts landmark roles", async () => {
        const result =
            await accessibility.capture();

        const main =
            accessibility.getByRole(
                result,
                "main"
            );

        const navigation =
            accessibility.getByRole(
                result,
                "navigation"
            );

        expect(main)
            .toHaveLength(1);

        expect(navigation)
            .toHaveLength(1);

        expect(navigation[0]?.name)
            .toBe("Main navigation");
    });

    it("extracts heading roles and levels", async () => {
        const result =
            await accessibility.capture();

        const heading =
            accessibility.getByRole(
                result,
                "heading"
            )[0];

        expect(heading?.name)
            .toBe("Accessibility testing");

        if (!heading) {
            throw new Error("Missing heading.");
        }

        const level =
            accessibility.getProperty(
                heading,
                "level"
            );

        expect(level?.value)
            .toBe(1);
    });

    it("extracts accessible names from text", async () => {
        const result =
            await accessibility.capture();

        const button =
            accessibility.getByName(
                result,
                "Save changes"
            ).find(
                node => node.role === "button"
            );

        expect(button?.name)
            .toBe("Save changes");
    });

    it("extracts accessible names from aria-label", async () => {
        const result =
            await accessibility.capture();

        const button =
            accessibility.getByName(
                result,
                "Download project"
            ).find(
                node => node.role === "button"
            );

        expect(button?.name)
            .toBe("Download project");
    });

    it("extracts accessible names from aria-labelledby", async () => {
        const result = await accessibility.capture();

        const buttons = accessibility.getByRole(
            result,
            "button"
        );

        const button = buttons.find(
            node => node.name?.trim() === "Delete project"
        );

        expect(button).toBeDefined();

        expect(button?.name?.trim())
            .toBe("Delete project");

        expect(button?.nameDetails?.value)
            .toBe(button?.name);

        expect(button?.nameDetails?.sources)
            .toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: "relatedElement",
                        attribute: "aria-labelledby",
                        value: expect.objectContaining({
                            type: "computedString"
                        })
                    })
                ])
            );
    });

    it("extracts image alternative text as an accessible name", async () => {
        const result =
            await accessibility.capture();

        const images =
            accessibility.getByRole(
                result,
                "image"
            );

        expect(
            images.some(
                node => node.name === "Project preview"
            )
        ).toBe(true);
    });

    it("extracts native form labels", async () => {
        const result =
            await accessibility.capture();

        const input =
            accessibility.getByRole(
                result,
                "textbox"
            ).find(
                node =>
                    node.name === "Email address"
            );

        expect(input?.name)
            .toBe("Email address");
    });

    it("extracts computed accessible descriptions", async () => {
        const result =
            await accessibility.capture();

        const input =
            accessibility.getByRole(
                result,
                "textbox"
            ).find(
                node =>
                    node.name === "Email address"
            );

        expect(input?.description)
            .toBe(
                "Use your work email address."
            );
    });

    it("preserves accessible name computation sources", async () => {
        const result =
            await accessibility.capture();

        const button =
            accessibility.getByName(
                result,
                "Download project"
            ).find(
                node => node.role === "button"
            );

        expect(button?.nameDetails)
            .not.toBeNull();

        expect(
            button?.nameDetails?.sources.length
        ).toBeGreaterThan(0);
    });

    it("extracts computed checkbox states", async () => {
        const result =
            await accessibility.capture();

        const checkbox =
            accessibility.getByRole(
                result,
                "checkbox"
            )[0];

        if (!checkbox) {
            throw new Error("Missing checkbox.");
        }

        const checked =
            accessibility.getProperty(
                checkbox,
                "checked"
            );

        expect(checked?.value)
            .toBe("true");
    });

    it("extracts computed disabled states", async () => {
        const result =
            await accessibility.capture();

        const button =
            accessibility.getByName(
                result,
                "Unavailable action"
            ).find(
                node => node.role === "button"
            );

        if (!button) {
            throw new Error("Missing disabled button.");
        }

        const disabled =
            accessibility.getProperty(
                button,
                "disabled"
            );

        expect(disabled?.value)
            .toBe(true);
    });

    it("extracts computed expanded states", async () => {
        const result =
            await accessibility.capture();

        const button =
            accessibility.getByName(
                result,
                "Toggle menu"
            ).find(
                node => node.role === "button"
            );

        if (!button) {
            throw new Error("Missing toggle button.");
        }

        const expanded =
            accessibility.getProperty(
                button,
                "expanded"
            );

        expect(expanded?.value)
            .toBe(true);
    });

    it("separates ignored and exposed nodes", async () => {
        const result =
            await accessibility.capture();

        const exposed =
            accessibility.getExposedNodes(result);

        const ignored =
            accessibility.getIgnoredNodes(result);

        expect(exposed.length + ignored.length)
            .toBe(result.returnedNodes);

        expect(
            exposed.every(node => !node.ignored)
        ).toBe(true);

        expect(
            ignored.every(node => node.ignored)
        ).toBe(true);

        expect(result.exposedNodes)
            .toBe(exposed.length);

        expect(result.ignoredNodes)
            .toBe(ignored.length);
    });

    it("does not expose aria-hidden content as a button", async () => {
        const result =
            await accessibility.capture();

        const exposed =
            accessibility.getExposedNodes(result);

        expect(
            exposed.some(
                node =>
                    node.role === "button" &&
                    node.name === "Hidden action"
            )
        ).toBe(false);
    });

    it("does not expose display-none content as a button", async () => {
        const result =
            await accessibility.capture();

        const exposed =
            accessibility.getExposedNodes(result);

        expect(
            exposed.some(
                node =>
                    node.role === "button" &&
                    node.name === "Not rendered"
            )
        ).toBe(false);
    });

    it("retrieves nodes by accessibility ID", async () => {
        const result =
            await accessibility.capture();

        const node = result.nodes[0];

        if (!node) {
            throw new Error("Missing accessibility node.");
        }

        expect(
            accessibility.getNode(
                result,
                node.id
            )
        ).toEqual(node);
    });

    it("retrieves children and parent relationships", async () => {
        const result =
            await accessibility.capture();

        const parent = result.nodes.find(
            node => node.childIds.some(
                childId =>
                    accessibility.getNode(
                        result,
                        childId
                    )?.parentId === node.id
            )
        );

        if (!parent) {
            throw new Error("Missing parent node.");
        }

        const children =
            accessibility.getChildren(
                result,
                parent.id
            );

        expect(children.length)
            .toBeGreaterThan(0);

        const child = children.find(
            node => node.parentId === parent.id
        );

        if (!child) {
            throw new Error("Missing child node.");
        }

        expect(
            accessibility.getParent(
                result,
                child.id
            )?.id
        ).toBe(parent.id);
    });

    it("retrieves nodes by backend DOM identifier", async () => {
        const result =
            await accessibility.capture();

        const node = result.nodes.find(
            candidate =>
                candidate.backendDOMNodeId !== null
        );

        if (
            !node ||
            node.backendDOMNodeId === null
        ) {
            throw new Error(
                "Missing backend DOM node identifier."
            );
        }

        const matches =
            accessibility.getByBackendDOMNodeId(
                result,
                node.backendDOMNodeId
            );

        expect(matches)
            .toContainEqual(node);
    });

    it("handles unknown accessibility identifiers", async () => {
        const result =
            await accessibility.capture();

        expect(
            accessibility.getNode(
                result,
                "missing-node"
            )
        ).toBeNull();

        expect(
            accessibility.getParent(
                result,
                "missing-node"
            )
        ).toBeNull();

        expect(
            accessibility.getChildren(
                result,
                "missing-node"
            )
        ).toEqual([]);
    });

    it("supports limiting returned nodes", async () => {
        const result =
            await accessibility.capture({
                maxNodes: 2
            });

        expect(result.returnedNodes)
            .toBe(2);

        expect(result.totalNodes)
            .toBeGreaterThan(2);

        expect(result.coverage.nodeLimited)
            .toBe(true);

        expect(result.status)
            .toBe("partial");
    });

    it("supports returning zero nodes", async () => {
        const result =
            await accessibility.capture({
                maxNodes: 0
            });

        expect(result.nodes)
            .toEqual([]);

        expect(result.totalNodes)
            .toBeGreaterThan(0);

        expect(result.coverage.nodeLimited)
            .toBe(true);

        expect(result.status)
            .toBe("partial");
    });

    it("reports depth-limited captures", async () => {
        const result =
            await accessibility.capture({
                maxDepth: 0
            });

        expect(result.coverage.depthLimited)
            .toBe(true);

        expect(
            result.coverage.completeDocumentTree
        ).toBe(false);

        expect(result.status)
            .toBe("partial");
    });

    it.each([
        -1,
        1.5,
        Infinity,
        NaN
    ])(
        "rejects invalid capture limits: %s",
        async limit => {
            await expect(
                accessibility.capture({
                    maxDepth: limit
                })
            ).rejects.toThrow("maxDepth");

            await expect(
                accessibility.capture({
                    maxNodes: limit
                })
            ).rejects.toThrow("maxNodes");
        }
    );

    it("captures accessible open shadow content", async () => {
        await page.locator("#shadow-host")
            .evaluate(host => {
                host.attachShadow({
                    mode: "open"
                }).innerHTML =
                    '<button>Shadow action</button>';
            });

        const result =
            await accessibility.capture();

        const buttons =
            accessibility.getByRole(
                result,
                "button"
            );

        expect(
            buttons.some(
                node => node.name === "Shadow action"
            )
        ).toBe(true);
    });

    it("captures accessible closed shadow content", async () => {
        await page.locator("#shadow-host")
            .evaluate(host => {
                host.attachShadow({
                    mode: "closed"
                }).innerHTML =
                    '<button>Closed shadow action</button>';
            });

        const result =
            await accessibility.capture();

        const buttons =
            accessibility.getByRole(
                result,
                "button"
            );

        expect(
            buttons.some(
                node =>
                    node.name === "Closed shadow action"
            )
        ).toBe(true);
    });

    it("reflects changes to accessible names", async () => {
        const first =
            await accessibility.capture();

        await page.locator("#aria-button")
            .evaluate(element => {
                element.setAttribute(
                    "aria-label",
                    "Updated download action"
                );
            });

        const second =
            await accessibility.capture();

        expect(
            accessibility.getByName(
                first,
                "Download project"
            ).length
        ).toBeGreaterThan(0);

        expect(
            accessibility.getByName(
                second,
                "Updated download action"
            ).length
        ).toBeGreaterThan(0);
    });

    it("reports uninspected iframe documents", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "embedded-frame";

            iframe.srcdoc =
                '<button id="embedded-button">' +
                'Embedded action' +
                '</button>';

            document.body.appendChild(iframe);
        });

        await page
            .frameLocator("#embedded-frame")
            .locator("#embedded-button")
            .waitFor({
                state: "attached"
            });

        const result =
            await accessibility.capture();

        expect(
            result.coverage.discoveredFrameCount
        ).toBe(2);

        expect(
            result.coverage.capturedFrameCount
        ).toBe(1);

        expect(
            result.coverage.uninspectedFrameCount
        ).toBe(1);

        expect(
            result.coverage.completeDocumentTree
        ).toBe(true);

        expect(
            result.coverage.completePageTree
        ).toBe(false);

        expect(result.status)
            .toBe("partial");
    });

    it("reports session errors for closed pages", async () => {
        const temporaryPage =
            await page.context().newPage();

        const engine =
            new AccessibilityTreeEngine(
                temporaryPage
            );

        await temporaryPage.close();

        const result =
            await engine.capture();

        expect(result.status)
            .toBe("error");

        expect(result.errors.length)
            .toBeGreaterThan(0);

        expect(
            result.coverage.completePageTree
        ).toBe(false);
    });

    it("supports repeated accessibility captures", async () => {
        const first =
            await accessibility.capture();

        const second =
            await accessibility.capture();

        expect(first.status)
            .toBe("complete");

        expect(second.status)
            .toBe("complete");

        expect(first.totalNodes)
            .toBe(second.totalNodes);
    });

    it("captures timestamps and duration", async () => {
        const result =
            await accessibility.capture();

        expect(
            Number.isFinite(
                Date.parse(result.capturedAt)
            )
        ).toBe(true);

        expect(
            Date.parse(result.finishedAt)
        ).toBeGreaterThanOrEqual(
            Date.parse(result.capturedAt)
        );

        expect(result.durationMs)
            .toBeGreaterThanOrEqual(0);
    });

    it("produces serializable accessibility results", async () => {
        const result =
            await accessibility.capture();

        expect(
            JSON.parse(JSON.stringify(result))
        ).toEqual(result);
    });
});