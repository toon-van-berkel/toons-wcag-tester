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
    AccessibilityElementEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Accessibility Element Fixture</title>
        </head>

        <body>
            <main>
                <button id="save">
                    Save changes
                </button>

                <button id="duplicate"
                    aria-label="First action">
                    First
                </button>

                <button id="duplicate"
                    aria-label="Second action">
                    Second
                </button>

                <button id="same-one">
                    Identical name
                </button>

                <button id="same-two">
                    Identical name
                </button>

                <button id="hidden"
                    aria-hidden="true">
                    Hidden action
                </button>

                <button id="not-rendered"
                    style="display: none">
                    Not rendered
                </button>

                <p id="description">
                    Additional information.
                </p>

                <button id="described"
                    aria-label="Described action"
                    aria-describedby="description"
                    aria-expanded="true">
                    Action
                </button>

                <div id="shadow-host"></div>

                <div id="slot-host">
                    <button id="slotted" slot="action">
                        Slotted action
                    </button>
                </div>
            </main>
        </body>
    </html>
`;

describe("Accessibility Element Engine", () => {
    let browser: BrowserEngine;
    let page: Page;

    let engine: AccessibilityElementEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session =
            await browser.start();

        page = session.page;

        engine =
            new AccessibilityElementEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("inspects a specific DOM element", async () => {
        const result = await engine.inspect(
            page.locator("#save")
        );

        expect(result.status).toBe("complete");

        expect(result.consistency)
            .toBe("verified");

        expect(result.node?.role)
            .toBe("button");

        expect(result.node?.name?.value)
            .toBe("Save changes");

        expect(result.errors).toEqual([]);
    });

    it("resolves a backend DOM node identifier", async () => {
        const result = await engine.inspect(
            page.locator("#save")
        );

        expect(result.backendDOMNodeId)
            .not.toBeNull();

        expect(result.node?.backendDOMNodeId)
            .toBe(result.backendDOMNodeId);
    });

    it("distinguishes duplicate HTML IDs", async () => {
        const targets =
            page.locator("#duplicate");

        const first = await engine.inspect(
            targets.nth(0)
        );

        const second = await engine.inspect(
            targets.nth(1)
        );

        expect(first.status).toBe("complete");

        expect(second.status).toBe("complete");

        expect(first.node?.name?.value)
            .toBe("First action");

        expect(second.node?.name?.value)
            .toBe("Second action");

        expect(first.backendDOMNodeId)
            .not.toBe(second.backendDOMNodeId);
    });

    it("distinguishes elements with identical names", async () => {
        const first = await engine.inspect(
            page.locator("#same-one")
        );

        const second = await engine.inspect(
            page.locator("#same-two")
        );

        expect(first.status).toBe("complete");

        expect(second.status).toBe("complete");

        expect(first.node?.name?.value)
            .toBe("Identical name");

        expect(second.node?.name?.value)
            .toBe("Identical name");

        expect(first.backendDOMNodeId)
            .not.toBe(second.backendDOMNodeId);
    });

    it("extracts descriptions and computed properties", async () => {
        const result = await engine.inspect(
            page.locator("#described")
        );

        expect(result.status).toBe("complete");

        expect(result.node?.description?.value)
            .toBe("Additional information.");

        const expanded =
            result.node?.properties.find(
                property =>
                    property.name === "expanded"
            );

        expect(expanded?.value.value)
            .toBe(true);
    });

    it("does not treat aria-hidden content as exposed", async () => {
        const result = await engine.inspect(
            page.locator("#hidden")
        );

        expect(result.consistency)
            .toBe("verified");

        expect(
            result.node === null ||
            result.node.ignored
        ).toBe(true);

        expect(result.status)
            .not.toBe("error");
    });

    it("does not treat display-none content as exposed", async () => {
        const result = await engine.inspect(
            page.locator("#not-rendered")
        );

        expect(result.consistency)
            .toBe("verified");

        expect(
            result.node === null ||
            result.node.ignored
        ).toBe(true);
    });

    it("inspects elements inside open shadow roots", async () => {
        await page.locator("#shadow-host")
            .evaluate(host => {
                host.attachShadow({
                    mode: "open"
                }).innerHTML =
                    '<button id="shadow-button">' +
                    'Shadow action' +
                    '</button>';
            });

        const result = await engine.inspect(
            page.locator("#shadow-button")
        );

        expect(result.status).toBe("complete");

        expect(result.node?.name?.value)
            .toBe("Shadow action");
    });

    it("inspects elements inside nested shadow roots", async () => {
        await page.locator("#shadow-host")
            .evaluate(host => {
                const outer =
                    host.attachShadow({
                        mode: "open"
                    });

                const nestedHost =
                    document.createElement("div");

                outer.appendChild(nestedHost);

                nestedHost.attachShadow({
                    mode: "open"
                }).innerHTML =
                    '<button id="nested-button">' +
                    'Nested action' +
                    '</button>';
            });

        const result = await engine.inspect(
            page.locator("#nested-button")
        );

        expect(result.status).toBe("complete");

        expect(result.node?.name?.value)
            .toBe("Nested action");
    });

    it("inspects slotted light-DOM elements", async () => {
        await page.locator("#slot-host")
            .evaluate(host => {
                host.attachShadow({
                    mode: "open"
                }).innerHTML =
                    '<slot name="action"></slot>';
            });

        const result = await engine.inspect(
            page.locator("#slotted")
        );

        expect(result.status).toBe("complete");

        expect(result.node?.name?.value)
            .toBe("Slotted action");
    });

    it("inspects same-process iframe elements", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "embedded";

            iframe.srcdoc =
                '<button id="save">' +
                'Embedded save action' +
                '</button>';

            document.body.appendChild(iframe);
        });

        const target = page
            .frameLocator("#embedded")
            .locator("#save");

        await target.waitFor({
            state: "attached"
        });

        const embedded =
            await engine.inspect(target);

        const main =
            await engine.inspect(
                page.locator("#save")
            );

        expect(embedded.status)
            .toBe("complete");

        expect(embedded.node?.name?.value)
            .toBe("Embedded save action");

        expect(main.node?.name?.value)
            .toBe("Save changes");

        expect(embedded.backendDOMNodeId)
            .not.toBe(main.backendDOMNodeId);
    });

    it("inspects nested iframe elements", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "outer-frame";

            iframe.srcdoc =
                '<body><div id="host"></div></body>';

            document.body.appendChild(iframe);
        });

        const outer = page.frameLocator(
            "#outer-frame"
        );

        const host =
            outer.locator("#host");

        await host.waitFor({
            state: "attached"
        });

        await host.evaluate(element => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "inner-frame";

            iframe.srcdoc =
                '<button id="target">' +
                'Nested frame action' +
                '</button>';

            element.appendChild(iframe);
        });

        const target = outer
            .frameLocator("#inner-frame")
            .locator("#target");

        await target.waitFor({
            state: "attached"
        });

        const result =
            await engine.inspect(target);

        expect(result.status)
            .toBe("complete");

        expect(result.node?.name?.value)
            .toBe("Nested frame action");
    });

    it("inspects shadow content inside an iframe", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "embedded";

            iframe.srcdoc =
                '<div id="embedded-host"></div>';

            document.body.appendChild(iframe);
        });

        const frame =
            page.frameLocator("#embedded");

        const host =
            frame.locator("#embedded-host");

        await host.waitFor({
            state: "attached"
        });

        await host.evaluate(element => {
            element.attachShadow({
                mode: "open"
            }).innerHTML =
                '<button id="target">' +
                'Embedded shadow action' +
                '</button>';
        });

        const result = await engine.inspect(
            frame.locator("#target")
        );

        expect(result.status)
            .toBe("complete");

        expect(result.node?.name?.value)
            .toBe("Embedded shadow action");
    });

    it("reports missing target elements", async () => {
        const result = await engine.inspect(
            page.locator("#missing"),

            {
                targetTimeoutMs: 250
            }
        );

        expect(result.status).toBe("error");

        expect(result.node).toBeNull();

        expect(result.errors[0]?.stage)
            .toBe("target");
    });

    it("reports ambiguous target elements", async () => {
        const result = await engine.inspect(
            page.locator("#duplicate"),

            {
                targetTimeoutMs: 250
            }
        );

        expect(result.status).toBe("error");

        expect(result.node).toBeNull();

        expect(result.errors[0]?.stage)
            .toBe("target");
    });

    it("rejects targets belonging to another page", async () => {
        const anotherPage =
            await page.context().newPage();

        try {
            await anotherPage.setContent(
                '<button id="target">Other page</button>'
            );

            const result = await engine.inspect(
                anotherPage.locator("#target")
            );

            expect(result.status).toBe("error");

            expect(result.node).toBeNull();

            expect(result.errors[0]?.stage)
                .toBe("identity");

        } finally {
            await anotherPage.close();
        }
    });

    it("reflects updated accessibility information", async () => {
        const target =
            page.locator("#save");

        const first =
            await engine.inspect(target);

        await target.evaluate(element => {
            element.setAttribute(
                "aria-label",
                "Updated save action"
            );
        });

        const second =
            await engine.inspect(target);

        expect(first.node?.name?.value)
            .toBe("Save changes");

        expect(second.node?.name?.value)
            .toBe("Updated save action");

        expect(second.status)
            .toBe("complete");
    });

    it("does not inject attributes into the inspected page", async () => {
        const before = await page.content();

        const result = await engine.inspect(
            page.locator("#save")
        );

        const after = await page.content();

        expect(result.status)
            .toBe("complete");

        expect(after).toBe(before);
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
                engine.inspect(
                    page.locator("#save"),

                    {
                        targetTimeoutMs: timeout
                    }
                )
            ).rejects.toThrow(
                "targetTimeoutMs"
            );
        }
    );

    it("produces serializable inspection results", async () => {
        const result = await engine.inspect(
            page.locator("#save")
        );

        expect(
            JSON.parse(JSON.stringify(result))
        ).toEqual(result);

        expect(result.durationMs)
            .toBeGreaterThanOrEqual(0);

        expect(
            Number.isFinite(
                Date.parse(result.capturedAt)
            )
        ).toBe(true);
    });
});