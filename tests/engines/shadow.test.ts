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
    DOMShadowEngine,
    DOMQueryEngine,
    DOMFrameEngine,
    DOMAttributeEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Shadow DOM Test Fixture</title>
        </head>
        <body>
            <img id="document-image" alt="Document image">

            <div id="host-one"></div>
            <div id="host-two"></div>

            <div id="slot-host">
                <span slot="title">Assigned title</span>
            </div>

            <div id="closed-host"></div>
        </body>
    </html>
`;

describe("DOM Shadow Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let shadow: DOMShadowEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session = await browser.start();

        page = session.page;
        shadow = new DOMShadowEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);

        await page.evaluate(() => {
            const hostOne =
                document.getElementById("host-one");

            const hostTwo =
                document.getElementById("host-two");

            const slotHost =
                document.getElementById("slot-host");

            const closedHost =
                document.getElementById("closed-host");

            if (
                !hostOne ||
                !hostTwo ||
                !slotHost ||
                !closedHost
            ) {
                throw new Error("Missing fixture hosts.");
            }

            const first = hostOne.attachShadow({
                mode: "open"
            });

            first.innerHTML =
                '<img id="shared-image" alt="First image">' +
                '<button id="first-button">First</button>' +
                '<div id="nested-host"></div>';

            const nestedHost =
                first.querySelector("#nested-host");

            if (!nestedHost) {
                throw new Error("Missing nested host.");
            }

            const nested = nestedHost.attachShadow({
                mode: "open"
            });

            nested.innerHTML =
                '<img id="nested-image" alt="Nested image">' +
                '<button id="nested-button">Nested</button>';

            const second = hostTwo.attachShadow({
                mode: "open",
                delegatesFocus: true
            });

            second.innerHTML =
                '<img id="shared-image" alt="Second image">';

            const slots = slotHost.attachShadow({
                mode: "open"
            });

            slots.innerHTML =
                '<slot name="title"></slot>' +
                '<slot name="missing">' +
                '<span>Fallback content</span>' +
                '</slot>';

            const closed = closedHost.attachShadow({
                mode: "closed"
            });

            closed.innerHTML =
                '<img id="closed-image">';
        });
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("discovers open shadow roots", async () => {
        const result = await shadow.discover();

        expect(result.totalDiscovered).toBe(4);
        expect(result.returnedCount).toBe(4);
        expect(result.truncated).toBe(false);
    });

    it("identifies top-level shadow hosts", async () => {
        const result = await shadow.discover();

        const first = result.roots.find(
            root => root.hostId === "host-one"
        );

        expect(first?.depth).toBe(1);
        expect(first?.parentId).toBeNull();
        expect(first?.hostPath).toEqual(["#host-one"]);
    });

    it("identifies nested shadow roots", async () => {
        const result = await shadow.discover();

        const nested = result.roots.find(
            root => root.hostId === "nested-host"
        );

        expect(nested?.depth).toBe(2);

        expect(nested?.hostPath).toEqual([
            "#host-one",
            "#nested-host"
        ]);
    });

    it("preserves parent relationships", async () => {
        const result = await shadow.discover();

        const first = result.roots.find(
            root => root.hostId === "host-one"
        );

        const nested = result.roots.find(
            root => root.hostId === "nested-host"
        );

        expect(nested?.parentId).toBe(first?.id);
    });

    it("generates unique root identifiers", async () => {
        const result = await shadow.discover();

        const ids = new Set(
            result.roots.map(root => root.id)
        );

        expect(ids.size).toBe(4);
    });

    it("generates repeatable root identifiers", async () => {
        const first = await shadow.discover();
        const second = await shadow.discover();

        expect(first).toEqual(second);
    });

    it("counts elements within individual roots", async () => {
        const result = await shadow.discover();

        const first = result.roots.find(
            root => root.hostId === "host-one"
        );

        expect(first?.elementCount).toBe(3);
    });

    it("detects delegatesFocus", async () => {
        const result = await shadow.discover();

        const second = result.roots.find(
            root => root.hostId === "host-two"
        );

        expect(second?.delegatesFocus).toBe(true);
    });

    it("acknowledges closed root limitations", async () => {
        const result = await shadow.discover();

        expect(result.closedRootsInspectable).toBe(false);

        expect(
            result.roots.some(
                root => root.hostId === "closed-host"
            )
        ).toBe(false);
    });

    it("supports limiting discovery depth", async () => {
        const result = await shadow.discover({
            maxDepth: 1
        });

        expect(result.totalDiscovered).toBe(4);
        expect(result.returnedCount).toBe(3);
        expect(result.skippedByDepth).toBe(1);
        expect(result.truncated).toBe(true);
    });

    it("supports limiting the number of roots", async () => {
        const result = await shadow.discover({
            maxRoots: 2
        });

        expect(result.returnedCount).toBe(2);
        expect(result.skippedByLimit).toBe(2);
        expect(result.truncated).toBe(true);
    });

    it("supports a zero depth limit", async () => {
        const result = await shadow.discover({
            maxDepth: 0
        });

        expect(result.roots).toEqual([]);
        expect(result.skippedByDepth).toBe(4);
    });

    it("supports a zero root limit", async () => {
        const result = await shadow.discover({
            maxRoots: 0
        });

        expect(result.roots).toEqual([]);
        expect(result.skippedByLimit).toBe(4);
    });

    it("extracts named slots", async () => {
        const result = await shadow.discover();

        const root = result.roots.find(
            item => item.hostId === "slot-host"
        );

        expect(
            root?.slots.map(slot => slot.name)
        ).toEqual(["title", "missing"]);
    });

    it("detects assigned slot elements", async () => {
        const result = await shadow.discover();

        const slot = result.roots
            .find(
                root => root.hostId === "slot-host"
            )
            ?.slots.find(
                item => item.name === "title"
            );

        expect(slot?.assignedElementCount).toBe(1);
        expect(slot?.assignedTags).toEqual(["span"]);
        expect(slot?.usingFallback).toBe(false);
    });

    it("detects fallback slot content", async () => {
        const result = await shadow.discover();

        const slot = result.roots
            .find(
                root => root.hostId === "slot-host"
            )
            ?.slots.find(
                item => item.name === "missing"
            );

        expect(slot?.assignedNodeCount).toBe(0);
        expect(slot?.fallbackElementCount).toBe(1);
        expect(slot?.usingFallback).toBe(true);
    });

    it("identifies normal document elements", async () => {
        const result = await shadow.identify(
            page.locator("#document-image")
        );

        expect(result.selector).toBe("#document-image");
        expect(result.hostPath).toEqual([]);
        expect(result.insideShadowRoot).toBe(false);
    });

    it("identifies elements inside shadow roots", async () => {
        const result = await shadow.identify(
            page.locator("#first-button")
        );

        expect(result.selector).toBe("#first-button");
        expect(result.hostPath).toEqual(["#host-one"]);
        expect(result.insideShadowRoot).toBe(true);
    });

    it("identifies elements inside nested shadow roots", async () => {
        const result = await shadow.identify(
            page.locator("#nested-image")
        );

        expect(result.selector).toBe("#nested-image");

        expect(result.hostPath).toEqual([
            "#host-one",
            "#nested-host"
        ]);
    });

    it("distinguishes duplicate IDs across roots", async () => {
        const first = await shadow.identify(
            page.locator("#host-one #shared-image")
        );

        const second = await shadow.identify(
            page.locator("#host-two #shared-image")
        );

        expect(first.selector).toBe(second.selector);

        expect(first.hostPath).not.toEqual(
            second.hostPath
        );
    });

    it("queries a specific shadow root", async () => {
        const result = await shadow.query(
            ["#host-one"],
            "img"
        );

        expect(result.totalCount).toBe(1);

        expect(result.elements[0]?.htmlId)
            .toBe("shared-image");
    });

    it("queries nested shadow roots explicitly", async () => {
        const result = await shadow.query(
            ["#host-one", "#nested-host"],
            "img"
        );

        expect(result.totalCount).toBe(1);

        expect(result.elements[0]?.htmlId)
            .toBe("nested-image");
    });

    it("does not pierce shadow roots implicitly", async () => {
        const result = await shadow.query(
            [],
            "img"
        );

        expect(result.totalCount).toBe(1);

        expect(result.elements[0]?.htmlId)
            .toBe("document-image");
    });

    it("does not duplicate slotted elements", async () => {
        const documentResult = await shadow.query(
            [],
            "[slot='title']"
        );

        const shadowResult = await shadow.query(
            ["#slot-host"],
            "[slot='title']"
        );

        expect(documentResult.totalCount).toBe(1);
        expect(shadowResult.totalCount).toBe(0);
    });

    it("supports limiting query results", async () => {
        const result = await shadow.query(
            ["#host-one"],
            "*",
            { limit: 1 }
        );

        expect(result.totalCount).toBe(3);
        expect(result.returnedCount).toBe(1);
        expect(result.truncated).toBe(true);
    });

    it("rejects missing shadow hosts", async () => {
        await expect(
            shadow.query(
                ["#missing-host"],
                "img"
            )
        ).rejects.toThrow(
            "Shadow host path is missing or ambiguous"
        );
    });

    it("rejects unavailable closed roots", async () => {
        await expect(
            shadow.query(
                ["#closed-host"],
                "img"
            )
        ).rejects.toThrow(
            "Open shadow root unavailable"
        );
    });

    it("rejects empty query selectors", async () => {
        await expect(
            shadow.query([], " ")
        ).rejects.toThrow(
            "Shadow DOM selector cannot be empty"
        );
    });

    it("rejects invalid CSS selectors", async () => {
        await expect(
            shadow.query([], "img[")
        ).rejects.toThrow();
    });

    it.each([
        -1,
        1.5,
        Infinity,
        NaN
    ])(
        "rejects invalid limits: %s",
        async limit => {
            await expect(
                shadow.discover({
                    maxRoots: limit
                })
            ).rejects.toThrow("maxRoots");

            await expect(
                shadow.discover({
                    maxDepth: limit
                })
            ).rejects.toThrow("maxDepth");

            await expect(
                shadow.query(
                    [],
                    "img",
                    { limit }
                )
            ).rejects.toThrow("limit");
        }
    );

    it("supports hosts without unique IDs", async () => {
        await page.evaluate(() => {
            for (let index = 0; index < 2; index++) {
                const host =
                    document.createElement("div");

                host.id = "duplicate-host";

                document.body.appendChild(host);

                host.attachShadow({
                    mode: "open"
                }).innerHTML = "<span>Content</span>";
            }
        });

        const result = await shadow.discover();

        const duplicates = result.roots.filter(
            root => root.hostId === "duplicate-host"
        );

        expect(duplicates).toHaveLength(2);

        expect(duplicates[0]?.hostSelector)
            .not.toBe(duplicates[1]?.hostSelector);

        for (const root of duplicates) {
            const queryResult = await shadow.query(
                root.hostPath,
                "span"
            );

            expect(queryResult.totalCount).toBe(1);
        }
    });

    it("integrates with the Query Engine", async () => {
        const query = new DOMQueryEngine(page);

        const images = await query.queryAll("img");

        expect(images).toHaveLength(4);

        const references = await Promise.all(
            images.map(
                image => shadow.identify(image)
            )
        );

        const identities = new Set(
            references.map(
                reference => JSON.stringify([
                    reference.hostPath,
                    reference.selector
                ])
            )
        );

        expect(identities.size).toBe(4);
    });

    it("integrates with the Attribute Engine", async () => {
        const attributes = new DOMAttributeEngine();

        const target = page.locator(
            "#host-two #shared-image"
        );

        const identification =
            await shadow.identify(target);

        const alt = await attributes.getAttribute(
            target,
            "alt"
        );

        expect(identification.hostPath)
            .toEqual(["#host-two"]);

        expect(alt).toBe("Second image");
    });

    it("supports shadow roots inside iframes", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "embedded-frame";
            iframe.name = "embedded";

            iframe.srcdoc =
                '<div id="embedded-host"></div>';

            document.body.appendChild(iframe);
        });

        const frameLocator =
            page.frameLocator("#embedded-frame");

        const host =
            frameLocator.locator("#embedded-host");

        await host.waitFor({
            state: "attached"
        });

        await host.evaluate(element => {
            element.attachShadow({
                mode: "open"
            }).innerHTML =
                '<img id="embedded-image">';
        });

        const frames = new DOMFrameEngine(page);

        const discovery = await frames.discover();

        const frame = discovery.frames.find(
            entry =>
                entry.reference.name === "embedded"
        );

        if (!frame) {
            throw new Error("Missing embedded frame.");
        }

        const embeddedShadow =
            new DOMShadowEngine(frame.frame);

        const result =
            await embeddedShadow.discover();

        expect(result.totalDiscovered).toBe(1);

        const images = await embeddedShadow.query(
            ["#embedded-host"],
            "img"
        );

        expect(images.totalCount).toBe(1);
    });

    it("produces serializable discovery results", async () => {
        const result = await shadow.discover();

        expect(
            JSON.parse(JSON.stringify(result))
        ).toEqual(result);
    });

    it("detects dynamically added shadow roots", async () => {
        await page.evaluate(() => {
            const host =
                document.createElement("div");

            host.id = "dynamic-host";

            document.body.appendChild(host);

            host.attachShadow({
                mode: "open"
            });
        });

        const result = await shadow.discover();

        expect(result.totalDiscovered).toBe(5);
    });
});