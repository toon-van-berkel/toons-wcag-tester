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
    AccessibleNameEngine,
    AccessibleDescriptionEngine
} from "../../src/engines/index.js";

import type {
    AXElementResult
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Accessible Description Fixture</title>
        </head>

        <body>
            <main>
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

                <button
                    id="direct-description"
                    aria-description="Downloads the report as PDF."
                >
                    Download
                </button>

                <span id="first-description">
                    First instruction.
                </span>

                <span id="second-description">
                    Second instruction.
                </span>

                <button
                    id="multiple-descriptions"
                    aria-describedby="second-description first-description"
                >
                    Continue
                </button>

                <span
                    id="hidden-description"
                    style="display: none"
                >
                    Hidden additional information.
                </span>

                <button
                    id="hidden-reference"
                    aria-describedby="hidden-description"
                >
                    Details
                </button>

                <button
                    id="precedence"
                    aria-describedby="help"
                    aria-description="Alternative description."
                    title="Alternative title."
                >
                    Submit
                </button>

                <button
                    id="invalid-reference"
                    aria-describedby="missing-description"
                    aria-description="Fallback description."
                >
                    Continue
                </button>

                <button
                    id="title-description"
                    title="Permanently saves your changes."
                >
                    Save
                </button>

                <button
                    id="title-name"
                    title="Open settings"
                ></button>

                <button id="without-description">
                    Cancel
                </button>

                <button
                    id="empty-description"
                    aria-description=""
                >
                    Action
                </button>

                <button
                    id="whitespace-description"
                    aria-description="   "
                >
                    Action
                </button>

                <button
                    id="custom"
                    role="button"
                    aria-label="Custom action"
                    aria-description="Custom instructions."
                ></button>

                <button
                    id="ignored"
                    aria-hidden="true"
                    aria-description="Ignored description."
                >
                    Ignored action
                </button>

                <svg
                    id="described-svg"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    width="100"
                    height="100"
                >
                    <title>Example diagram</title>

                    <desc>Diagram showing project relationships.</desc>

                    <rect
                        width="100"
                        height="100"
                    />
                </svg>

                <div id="shadow-host"></div>
            </main>
        </body>
    </html>
`;

describe("Accessible Description Engine", () => {
    let browser: BrowserEngine;
    let page: Page;

    let elements: AccessibilityElementEngine;
    let names: AccessibleNameEngine;
    let descriptions: AccessibleDescriptionEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session =
            await browser.start();

        page = session.page;

        elements =
            new AccessibilityElementEngine(page);

        names =
            new AccessibleNameEngine(page);

        descriptions =
            new AccessibleDescriptionEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    async function createInspection(
        description: AXElementResult["node"] extends infer _Node
            ? NonNullable<AXElementResult["node"]>["description"]
            : never
    ): Promise<AXElementResult> {
        const original =
            await elements.inspect(
                page.locator("#without-description")
            );

        if (!original.node) {
            throw new Error(
                "Missing fixture accessibility node."
            );
        }

        return {
            ...original,

            node: {
                ...original.node,

                description
            }
        };
    }

    it("extracts descriptions from aria-describedby", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#email")
            );

        expect(result.state)
            .toBe("non_empty");

        expect(result.normalizedDescription)
            .toBe("Use your work email address.");

        expect(result.hasDescription)
            .toBe(true);

        expect(result.role)
            .toBe("textbox");

        expect(result.inspection.status)
            .toBe("complete");
    });

    it("extracts descriptions from aria-description", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#direct-description")
            );

        expect(result.normalizedDescription)
            .toBe("Downloads the report as PDF.");

        expect(result.hasDescription)
            .toBe(true);
    });

    it("preserves the original computed description", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#email")
            );

        expect(result.rawDescription)
            .toBe(
                result.inspection.node?.description?.value
            );

        expect(result.computation?.value)
            .toBe(result.rawDescription);
    });

    it("preserves multiple description reference order", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#multiple-descriptions")
            );

        expect(result.normalizedDescription)
            .toBe(
                "Second instruction. First instruction."
            );
    });

    it("extracts computed describedby relationships", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#email")
            );

        expect(result.describedByProperty)
            .not.toBeNull();

        expect(result.describedByNodes)
            .toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        idref: "help",

                        backendDOMNodeId:
                            expect.any(Number)
                    })
                ])
            );
    });

    it("preserves multiple describedby relationships", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#multiple-descriptions")
            );

        expect(
            result.describedByNodes.map(
                node => node.idref
            )
        ).toEqual([
            "second-description",
            "first-description"
        ]);
    });

    it("supports explicitly referenced hidden descriptions", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#hidden-reference")
            );

        expect(result.normalizedDescription)
            .toBe(
                "Hidden additional information."
            );

        expect(result.hasDescription)
            .toBe(true);
    });

    it("respects description computation precedence", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#precedence")
            );

        expect(result.normalizedDescription)
            .toBe("Use your work email address.");

        expect(result.normalizedDescription)
            .not.toBe("Alternative description.");

        expect(result.normalizedDescription)
            .not.toBe("Alternative title.");
    });

    it("supports fallback descriptions for invalid references", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#invalid-reference")
            );

        expect(result.normalizedDescription)
            .toBe("Fallback description.");

        expect(
            result.describedByNodes.some(
                node =>
                    node.idref ===
                    "missing-description"
            )
        ).toBe(false);
    });

    it("extracts descriptions originating from title", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#title-description")
            );

        expect(result.normalizedDescription)
            .toBe(
                "Permanently saves your changes."
            );
    });

    it("does not reuse title as description when it supplies the name", async () => {
        const inspection =
            await elements.inspect(
                page.locator("#title-name")
            );

        const name =
            names.fromInspection(inspection);

        const description =
            descriptions.fromInspection(
                inspection
            );

        expect(name.normalizedName)
            .toBe("Open settings");

        expect(description.hasDescription)
            .toBe(false);
    });

    it("extracts native SVG descriptions", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#described-svg")
            );

        expect(result.normalizedDescription)
            .toBe(
                "Diagram showing project relationships."
            );

        expect(result.role)
            .toBe("image");
    });

    it.each([
        "#without-description",
        "#empty-description",
        "#whitespace-description"
    ])(
        "does not invent descriptions for %s",
        async selector => {
            const result =
                await descriptions.inspect(
                    page.locator(selector)
                );

            expect(result.hasDescription)
                .toBe(false);

            expect([
                "missing",
                "empty"
            ]).toContain(result.state);

            expect(result.inspection.status)
                .toBe("complete");
        }
    );

    it("extracts descriptions from custom ARIA controls", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#custom")
            );

        expect(result.normalizedDescription)
            .toBe("Custom instructions.");

        expect(result.role)
            .toBe("button");
    });

    it("preserves ignored-node information", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#ignored")
            );

        expect(
            result.ignored === true ||
            result.state === "unavailable"
        ).toBe(true);
    });

    it("extracts descriptions inside open shadow roots", async () => {
        await page.locator("#shadow-host")
            .evaluate(host => {
                host.attachShadow({
                    mode: "open"
                }).innerHTML =
                    '<span id="details">' +
                        'Shadow description.' +
                    '</span>' +
                    '<button id="target" ' +
                        'aria-describedby="details">' +
                        'Shadow action' +
                    '</button>';
            });

        const result =
            await descriptions.inspect(
                page.locator("#target")
            );

        expect(result.normalizedDescription)
            .toBe("Shadow description.");

        expect(result.hasDescription)
            .toBe(true);
    });

    it("extracts descriptions inside iframes", async () => {
        await page.evaluate(() => {
            const iframe =
                document.createElement("iframe");

            iframe.id = "embedded";

            iframe.srcdoc =
                '<p id="help">' +
                    'Embedded instructions.' +
                '</p>' +
                '<button id="target" ' +
                    'aria-describedby="help">' +
                    'Embedded action' +
                '</button>';

            document.body.appendChild(iframe);
        });

        const target = page
            .frameLocator("#embedded")
            .locator("#target");

        await target.waitFor({
            state: "attached"
        });

        const result =
            await descriptions.inspect(
                target
            );

        expect(result.normalizedDescription)
            .toBe("Embedded instructions.");

        expect(result.inspection.status)
            .toBe("complete");
    });

    it("reports unavailable descriptions for missing targets", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#missing"),

                {
                    targetTimeoutMs: 250
                }
            );

        expect(result.state)
            .toBe("unavailable");

        expect(result.hasDescription)
            .toBeNull();

        expect(result.rawDescription)
            .toBeNull();

        expect(result.sourceAvailability)
            .toBe("unavailable");

        expect(result.inspection.status)
            .toBe("error");
    });

    it("reflects dynamically updated descriptions", async () => {
        const target =
            page.locator("#email");

        const first =
            await descriptions.inspect(
                target
            );

        await page.locator("#help")
            .evaluate(element => {
                element.textContent =
                    "Updated instructions.";
            });

        const second =
            await descriptions.inspect(
                target
            );

        expect(first.normalizedDescription)
            .toBe(
                "Use your work email address."
            );

        expect(second.normalizedDescription)
            .toBe("Updated instructions.");
    });

    it.each([
        [
            "  Additional\\tinformation\\n ",
            "Additional information"
        ],
        [
            " \\n\\t ",
            ""
        ],
        [
            "  Café 日本語 😀 ",
            "Café 日本語 😀"
        ],
        [
            "  Download PDF: Report! ",
            "Download PDF: Report!"
        ]
    ])(
        "normalizes description text: %s",
        (input, expected) => {
            const text = input
                .replace(/\\t/g, "\t")
                .replace(/\\n/g, "\n");

            expect(
                descriptions.normalize(text)
            ).toBe(expected);
        }
    );

    it("shares inspection evidence with the Name Engine", async () => {
        const inspection =
            await elements.inspect(
                page.locator("#email")
            );

        const name =
            names.fromInspection(
                inspection
            );

        const description =
            descriptions.fromInspection(
                inspection
            );

        expect(name.normalizedName)
            .toBe("Email address");

        expect(description.normalizedDescription)
            .toBe(
                "Use your work email address."
            );

        expect(name.inspection)
            .toBe(description.inspection);

        expect(description.inspection)
            .toBe(inspection);
    });

    it("distinguishes a missing description", async () => {
        const inspection =
            await createInspection(null);

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.state)
            .toBe("missing");

        expect(result.hasDescription)
            .toBe(false);

        expect(result.rawDescription)
            .toBeNull();

        expect(result.sourceAvailability)
            .toBe("not_reported");
    });

    it("distinguishes an explicitly empty computed description", async () => {
        const inspection =
            await createInspection({
                type: "computedString",

                value: "",

                relatedNodes: [],

                sources: []
            });

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.state)
            .toBe("empty");

        expect(result.rawDescription)
            .toBe("");

        expect(result.normalizedDescription)
            .toBe("");

        expect(result.hasDescription)
            .toBe(false);
    });

    it("distinguishes whitespace-only computed descriptions", async () => {
        const inspection =
            await createInspection({
                type: "computedString",

                value: " \n\t ",

                relatedNodes: [],

                sources: []
            });

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.state)
            .toBe("empty");

        expect(result.rawDescription)
            .toBe(" \n\t ");

        expect(result.normalizedDescription)
            .toBe("");

        expect(result.hasDescription)
            .toBe(false);
    });

    it("rejects evidence with uncertain element identity", async () => {
        const original =
            await elements.inspect(
                page.locator("#email")
            );

        const inspection: AXElementResult = {
            ...original,

            consistency: "changed"
        };

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.state)
            .toBe("unavailable");

        expect(result.hasDescription)
            .toBeNull();

        expect(result.sources)
            .toEqual([]);
    });

    it("preserves descriptions when source metadata is absent", async () => {
        const inspection =
            await createInspection({
                type: "computedString",

                value: "Additional information.",

                relatedNodes: [],

                sources: []
            });

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.state)
            .toBe("non_empty");

        expect(result.sourceAvailability)
            .toBe("not_reported");

        expect(result.sources)
            .toEqual([]);

        expect(result.hasDescription)
            .toBe(true);
    });

    it("normalizes contributing description sources", async () => {
        const inspection =
            await createInspection({
                type: "computedString",

                value: "Additional information.",

                relatedNodes: [],

                sources: [
                    {
                        type: "attribute",

                        attribute:
                            "aria-description",

                        value: {
                            type: "computedString",

                            value:
                                "Additional information."
                        }
                    }
                ]
            });

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.sourceAvailability)
            .toBe("reported");

        expect(result.contributingSources)
            .toHaveLength(1);

        expect(result.contributingSources[0])
            .toMatchObject({
                attribute: "aria-description",

                status: "contributing",

                value: "Additional information."
            });
    });

    it("identifies superseded description sources", async () => {
        const inspection =
            await createInspection({
                type: "computedString",

                value: "Primary description.",

                relatedNodes: [],

                sources: [
                    {
                        type: "attribute",

                        attribute:
                            "aria-description",

                        value: {
                            type: "computedString",

                            value:
                                "Primary description."
                        }
                    },

                    {
                        type: "attribute",

                        attribute: "title",

                        superseded: true,

                        value: {
                            type: "computedString",

                            value:
                                "Alternative description."
                        }
                    }
                ]
            });

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.sources)
            .toHaveLength(2);

        expect(result.contributingSources)
            .toHaveLength(1);

        expect(result.sources[1])
            .toMatchObject({
                attribute: "title",

                status: "superseded"
            });
    });

    it("preserves invalid description sources", async () => {
        const inspection =
            await createInspection({
                type: "computedString",

                value: "Fallback description.",

                relatedNodes: [],

                sources: [
                    {
                        type: "relatedElement",

                        attribute:
                            "aria-describedby",

                        invalid: true,

                        invalidReason:
                            "Unresolved reference"
                    }
                ]
            });

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.sources[0])
            .toMatchObject({
                status: "invalid",

                invalidReason:
                    "Unresolved reference"
            });

        expect(result.contributingSources)
            .toEqual([]);
    });

    it("deduplicates computation references", async () => {
        const reference = {
            backendDOMNodeId: 123,

            idref: "help",

            text: "Additional information."
        };

        const inspection =
            await createInspection({
                type: "computedString",

                value: reference.text,

                relatedNodes: [
                    reference
                ],

                sources: [
                    {
                        type: "relatedElement",

                        attribute:
                            "aria-describedby",

                        value: {
                            type: "computedString",

                            value:
                                reference.text
                        },

                        attributeValue: {
                            type: "idrefList",

                            value: "help",

                            relatedNodes: [
                                reference,
                                reference
                            ]
                        }
                    }
                ]
            });

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.referencedNodes)
            .toEqual([
                reference
            ]);
    });

    it("keeps relationship evidence separate from computation evidence", async () => {
        const original =
            await createInspection({
                type: "computedString",

                value: "Additional information.",

                relatedNodes: [],

                sources: []
            });

        if (!original.node) {
            throw new Error(
                "Missing fixture node."
            );
        }

        const reference = {
            backendDOMNodeId: 123,

            idref: "help",

            text: "Additional information."
        };

        const inspection: AXElementResult = {
            ...original,

            node: {
                ...original.node,

                properties: [
                    ...original.node.properties.filter(
                        property =>
                            property.name !==
                            "describedby"
                    ),

                    {
                        name: "describedby",

                        value: {
                            type: "idrefList",

                            value: "help",

                            relatedNodes: [
                                reference
                            ],

                            sources: []
                        }
                    }
                ]
            }
        };

        const result =
            descriptions.fromInspection(
                inspection
            );

        expect(result.referencedNodes)
            .toEqual([]);

        expect(result.describedByNodes)
            .toEqual([
                reference
            ]);

        expect(result.sourceAvailability)
            .toBe("not_reported");

        expect(result.hasDescription)
            .toBe(true);
    });

    it("preserves original browser evidence", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#email")
            );

        expect(
            result.sources.map(
                source => source.raw
            )
        ).toEqual(
            result.computation?.sources ?? []
        );
    });

    it("produces serializable description evidence", async () => {
        const result =
            await descriptions.inspect(
                page.locator("#email")
            );

        expect(
            JSON.parse(
                JSON.stringify(result)
            )
        ).toEqual(result);
    });
});