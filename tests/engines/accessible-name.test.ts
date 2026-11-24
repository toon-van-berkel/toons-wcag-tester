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
    AccessibilityElementEngine,
    AccessibleNameEngine
} from "../../src/engines/index.js";

import type {
    AXElementResult
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Accessible Name Fixture</title>
        </head>

        <body>
            <main>
                <button id="native">
                    Save changes
                </button>

                <button id="aria"
                    aria-label="Download report">
                    Download
                </button>

                <span id="delete-label">
                    Delete project
                </span>

                <button id="labelled"
                    aria-labelledby="delete-label"
                    aria-label="Alternative label"
                    title="Alternative title">
                    Remove
                </button>

                <span id="first-label">First</span>

                <span id="second-label">Second</span>

                <button id="multiple-labels"
                    aria-labelledby="second-label first-label">
                    Action
                </button>

                <span id="hidden-label"
                    style="display: none">
                    Hidden label
                </span>

                <button id="hidden-labelled"
                    aria-labelledby="hidden-label">
                    Action
                </button>

                <button id="invalid-reference"
                    aria-labelledby="missing-label"
                    aria-label="Fallback name">
                    Fallback
                </button>

                <label for="email">
                    Email address
                </label>

                <input id="email" type="email">

                <label>
                    Full name
                    <input id="full-name" type="text">
                </label>

                <img id="image"
                    alt="Project preview">

                <img id="decorative"
                    alt="">

                <button id="title-only"
                    title="Title name"></button>

                <button id="unnamed"></button>

                <button id="whitespace">
                </button>

                <div id="custom"
                    role="button"
                    aria-label="Custom action"
                    tabindex="0"></div>

                <button id="ignored"
                    aria-hidden="true">
                    Ignored action
                </button>

                <div id="shadow-host"></div>
            </main>
        </body>
    </html>
`;

describe("Accessible Name Engine", () => {
    let browser: BrowserEngine;
    let page: Page;

    let engine: AccessibleNameEngine;
    let elements: AccessibilityElementEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session =
            await browser.start();

        page = session.page;

        engine =
            new AccessibleNameEngine(page);

        elements =
            new AccessibilityElementEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("extracts a native button name", async () => {
        const result = await engine.inspect(
            page.locator("#native")
        );

        expect(result.state)
            .toBe("non_empty");

        expect(result.rawName)
            .toBe("Save changes");

        expect(result.normalizedName)
            .toBe("Save changes");

        expect(result.hasName)
            .toBe(true);

        expect(result.role)
            .toBe("button");
    });

    it("identifies names originating from contents", async () => {
        const result = await engine.inspect(
            page.locator("#native")
        );

        expect(
            result.contributingSources
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: "contents",

                    status: "contributing"
                })
            ])
        );
    });

    it("extracts names originating from aria-label", async () => {
        const result = await engine.inspect(
            page.locator("#aria")
        );

        expect(result.normalizedName)
            .toBe("Download report");

        expect(
            result.contributingSources
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    attribute: "aria-label",

                    value: "Download report",

                    status: "contributing"
                })
            ])
        );
    });

    it("extracts names originating from aria-labelledby", async () => {
        const result = await engine.inspect(
            page.locator("#labelled")
        );

        expect(result.normalizedName)
            .toBe("Delete project");

        expect(
            result.contributingSources
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    attribute: "aria-labelledby",

                    status: "contributing"
                })
            ])
        );
    });

    it("preserves raw browser-computed names", async () => {
        const result = await engine.inspect(
            page.locator("#labelled")
        );

        expect(result.rawName)
            .toBe(
                result.inspection.node?.name?.value
            );

        expect(result.computation?.value)
            .toBe(result.rawName);

        expect(result.normalizedName)
            .toBe("Delete project");
    });

    it("identifies superseded naming sources", async () => {
        const result = await engine.inspect(
            page.locator("#labelled")
        );

        expect(result.sources)
            .toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        attribute: "aria-label",

                        status: "superseded"
                    }),

                    expect.objectContaining({
                        attribute: "title",

                        status: "superseded"
                    })
                ])
            );
    });

    it("extracts referenced label elements", async () => {
        const result = await engine.inspect(
            page.locator("#labelled")
        );

        expect(result.referencedNodes)
            .toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        idref: "delete-label",

                        backendDOMNodeId:
                            expect.any(Number)
                    })
                ])
            );
    });

    it("preserves multiple label reference order", async () => {
        const result = await engine.inspect(
            page.locator("#multiple-labels")
        );

        expect(result.normalizedName)
            .toBe("Second First");

        expect(
            result.referencedNodes.map(
                node => node.idref
            )
        ).toEqual([
            "second-label",
            "first-label"
        ]);
    });

    it("supports explicitly referenced hidden labels", async () => {
        const result = await engine.inspect(
            page.locator("#hidden-labelled")
        );

        expect(result.normalizedName)
            .toBe("Hidden label");

        expect(result.state)
            .toBe("non_empty");
    });

    it("preserves fallback names for invalid references", async () => {
        const result = await engine.inspect(
            page.locator("#invalid-reference")
        );

        expect(result.normalizedName)
            .toBe("Fallback name");

        expect(
            result.contributingSources
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    attribute: "aria-label"
                })
            ])
        );

        expect(
            result.referencedNodes.some(
                node =>
                    node.idref === "missing-label"
            )
        ).toBe(false);
    });

    it("extracts explicitly associated native labels", async () => {
        const result = await engine.inspect(
            page.locator("#email")
        );

        expect(result.normalizedName)
            .toBe("Email address");

        expect(result.role)
            .toBe("textbox");
    });

    it("extracts wrapping native labels", async () => {
        const result = await engine.inspect(
            page.locator("#full-name")
        );

        expect(result.normalizedName)
            .toBe("Full name");
    });

    it("extracts image alternative text", async () => {
        const result = await engine.inspect(
            page.locator("#image")
        );

        expect(result.normalizedName)
            .toBe("Project preview");

        expect(result.role)
            .toBe("image");

        expect(
            result.contributingSources
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    attribute: "alt"
                })
            ])
        );
    });

    it("does not invent names for decorative images", async () => {
        const result = await engine.inspect(
            page.locator("#decorative")
        );

        expect(
            result.state === "empty" ||
            result.state === "missing" ||
            result.state === "unavailable"
        ).toBe(true);

        expect(result.hasName)
            .not.toBe(true);
    });

    it("extracts title fallback names", async () => {
        const result = await engine.inspect(
            page.locator("#title-only")
        );

        expect(result.normalizedName)
            .toBe("Title name");

        expect(
            result.contributingSources
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    attribute: "title"
                })
            ])
        );
    });

    it("identifies empty computed accessible names", async () => {
        const result = await engine.inspect(
            page.locator("#unnamed")
        );

        expect(result.state)
            .toBe("empty");

        expect(result.rawName)
            .toBe("");

        expect(result.normalizedName)
            .toBe("");

        expect(result.hasName)
            .toBe(false);
    });

    it("identifies whitespace-only names as empty", async () => {
        const result = await engine.inspect(
            page.locator("#whitespace")
        );

        expect(result.state)
            .toBe("empty");

        expect(result.normalizedName)
            .toBe("");

        expect(result.hasName)
            .toBe(false);
    });

    it("extracts names from custom ARIA controls", async () => {
        const result = await engine.inspect(
            page.locator("#custom")
        );

        expect(result.normalizedName)
            .toBe("Custom action");

        expect(result.role)
            .toBe("button");
    });

    it("preserves ignored-node information", async () => {
        const result = await engine.inspect(
            page.locator("#ignored")
        );

        expect(
            result.ignored === true ||
            result.state === "unavailable"
        ).toBe(true);
    });

    it("extracts names inside open shadow roots", async () => {
        await page.locator("#shadow-host")
            .evaluate(host => {
                host.attachShadow({
                    mode: "open"
                }).innerHTML =
                    '<span id="label">Shadow label</span>' +
                    '<button id="target" ' +
                    'aria-labelledby="label">' +
                    'Action' +
                    '</button>';
            });

        const result = await engine.inspect(
            page.locator("#target")
        );

        expect(result.normalizedName)
            .toBe("Shadow label");

        expect(result.referencedNodes)
            .toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        idref: "label"
                    })
                ])
            );
    });

    it("extracts accessible names inside iframes", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "embedded";

            iframe.srcdoc =
                '<label for="target">Embedded label</label>' +
                '<input id="target" type="text">';

            document.body.appendChild(iframe);
        });

        const target = page
            .frameLocator("#embedded")
            .locator("#target");

        await target.waitFor({
            state: "attached"
        });

        const result =
            await engine.inspect(target);

        expect(result.normalizedName)
            .toBe("Embedded label");

        expect(result.state)
            .toBe("non_empty");
    });

    it("reports unavailable names for missing targets", async () => {
        const result = await engine.inspect(
            page.locator("#missing"),

            {
                targetTimeoutMs: 250
            }
        );

        expect(result.state)
            .toBe("unavailable");

        expect(result.hasName)
            .toBeNull();

        expect(result.rawName)
            .toBeNull();

        expect(result.inspection.status)
            .toBe("error");
    });

    it("reflects dynamically updated accessible names", async () => {
        const target =
            page.locator("#aria");

        const first =
            await engine.inspect(target);

        await target.evaluate(element => {
            element.setAttribute(
                "aria-label",
                "Updated name"
            );
        });

        const second =
            await engine.inspect(target);

        expect(first.normalizedName)
            .toBe("Download report");

        expect(second.normalizedName)
            .toBe("Updated name");
    });

    it("normalizes repeated whitespace", () => {
        expect(
            engine.normalize(
                "  Example\tname\nwith   spaces  "
            )
        ).toBe(
            "Example name with spaces"
        );
    });

    it("normalizes whitespace-only strings", () => {
        expect(
            engine.normalize(" \n\t ")
        ).toBe("");
    });

    it("preserves case and punctuation during normalization", () => {
        expect(
            engine.normalize(
                "  Download PDF: Report! "
            )
        ).toBe(
            "Download PDF: Report!"
        );
    });

    it("preserves Unicode characters during normalization", () => {
        expect(
            engine.normalize(
                "  Café 日本語 😀 "
            )
        ).toBe(
            "Café 日本語 😀"
        );
    });

    it("supports reusing existing element inspections", async () => {
        const inspection =
            await elements.inspect(
                page.locator("#native")
            );

        const result =
            engine.fromInspection(
                inspection
            );

        expect(result.normalizedName)
            .toBe("Save changes");

        expect(result.inspection)
            .toBe(inspection);
    });

    it("distinguishes missing names from unavailable names", async () => {
        const original =
            await elements.inspect(
                page.locator("#native")
            );

        if (!original.node) {
            throw new Error(
                "Missing fixture accessibility node."
            );
        }

        const inspection: AXElementResult = {
            ...original,

            node: {
                ...original.node,

                name: null
            }
        };

        const result =
            engine.fromInspection(
                inspection
            );

        expect(result.state)
            .toBe("missing");

        expect(result.hasName)
            .toBe(false);

        expect(result.rawName)
            .toBeNull();
    });

    it("rejects evidence with uncertain element identity", async () => {
        const original =
            await elements.inspect(
                page.locator("#native")
            );

        const inspection: AXElementResult = {
            ...original,

            consistency: "changed"
        };

        const result =
            engine.fromInspection(
                inspection
            );

        expect(result.state)
            .toBe("unavailable");

        expect(result.hasName)
            .toBeNull();
    });

    it("deduplicates repeated label references", async () => {
        const original =
            await elements.inspect(
                page.locator("#labelled")
            );

        if (!original.node?.name) {
            throw new Error(
                "Missing fixture name evidence."
            );
        }

        const name =
            original.node.name;

        const inspection: AXElementResult = {
            ...original,

            node: {
                ...original.node,

                name: {
                    ...name,

                    sources: [
                        ...name.sources,
                        ...name.sources
                    ]
                }
            }
        };

        const result =
            engine.fromInspection(
                inspection
            );

        expect(result.referencedNodes)
            .toHaveLength(1);

        expect(
            result.referencedNodes[0]?.idref
        ).toBe("delete-label");
    });

    it("preserves invalid source metadata", async () => {
        const original =
            await elements.inspect(
                page.locator("#native")
            );

        if (!original.node?.name) {
            throw new Error(
                "Missing fixture name evidence."
            );
        }

        const inspection: AXElementResult = {
            ...original,

            node: {
                ...original.node,

                name: {
                    ...original.node.name,

                    sources: [
                        ...original.node.name.sources,

                        {
                            type: "relatedElement",

                            attribute: "aria-labelledby",

                            invalid: true,

                            invalidReason:
                                "Test invalid reference"
                        }
                    ]
                }
            }
        };

        const result =
            engine.fromInspection(
                inspection
            );

        expect(result.sources)
            .toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        status: "invalid",

                        invalidReason:
                            "Test invalid reference"
                    })
                ])
            );
    });

    it("preserves original source evidence", async () => {
        const result = await engine.inspect(
            page.locator("#aria")
        );

        const original =
            result.computation?.sources ?? [];

        expect(
            result.sources.map(
                source => source.raw
            )
        ).toEqual(original);
    });

    it("produces serializable accessible name evidence", async () => {
        const result = await engine.inspect(
            page.locator("#labelled")
        );

        expect(
            JSON.parse(JSON.stringify(result))
        ).toEqual(result);
    });
});