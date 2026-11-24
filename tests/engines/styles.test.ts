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
    DOMStyleEngine,
    DOM_STYLE_GROUPS
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>CSS Test Fixture</title>

            <style>
                :root {
                    --accent-color: #336699;
                    --CustomValue: 12px;
                }

                body {
                    margin: 0;
                    color: rgb(34, 34, 34);
                    font-size: 16px;
                }

                #sample {
                    color: rgb(51, 102, 153);
                    background-color: rgb(255, 255, 255);

                    font-size: 20px;
                    font-weight: 700;
                    line-height: 1.5;
                    letter-spacing: 2px;
                    word-spacing: 4px;

                    width: 200px;
                    height: 100px;

                    margin: 10px;
                    padding: 20px;

                    border: 2px solid rgb(0, 0, 0);
                    outline: 3px solid rgb(255, 0, 0);
                    outline-offset: 4px;

                    box-sizing: border-box;
                    opacity: 0.5;
                }

                #parent {
                    color: rgb(100, 150, 200);
                    font-size: 20px;
                }

                #child {
                    font-size: 1.5em;
                }

                #media {
                    background-image: linear-gradient(
                        red,
                        blue
                    );

                    background-size: cover;
                }

                #generated::before {
                    content: "Generated content";
                    color: rgb(255, 0, 0);
                    display: inline-block;
                }

                #generated::after {
                    content: "";
                    display: block;
                    width: 20px;
                    height: 20px;
                    background-color: red;
                }

                #no-generated::before {
                    content: none;
                }

                #hidden-generated::before {
                    content: "Hidden";
                    display: none;
                }

                #placeholder::placeholder {
                    color: rgb(128, 128, 128);
                    opacity: 1;
                }

                #animated {
                    animation-name: pulse;
                    animation-duration: 2s;
                    animation-delay: 500ms;
                    animation-iteration-count: infinite;

                    transition-property: opacity;
                    transition-duration: 250ms;
                }

                @keyframes pulse {
                    from {
                        opacity: 1;
                    }

                    to {
                        opacity: 0.5;
                    }
                }

                #responsive {
                    font-size: 24px;
                }

                @media (max-width: 600px) {
                    #responsive {
                        font-size: 16px;
                    }
                }

                #pointer {
                    cursor: pointer;
                    pointer-events: none;
                    touch-action: none;
                }

                #clipped {
                    position: absolute;
                    clip: rect(0px, 0px, 0px, 0px);
                    overflow: hidden;
                }

                #svg-shape {
                    fill: rgb(255, 0, 0);
                    stroke: rgb(0, 0, 255);
                    stroke-width: 2px;
                }
            </style>
        </head>

        <body>
            <div id="sample">
                Sample text
            </div>

            <div id="parent">
                <span id="child">
                    Inherited text
                </span>
            </div>

            <div id="media"></div>

            <div id="generated">
                Original content
            </div>

            <div id="no-generated"></div>

            <div id="hidden-generated"></div>

            <input
                id="placeholder"
                placeholder="Enter text"
            >

            <div id="animated"></div>

            <div id="responsive">
                Responsive text
            </div>

            <div id="pointer"></div>

            <div id="clipped">
                Screen reader content
            </div>

            <svg viewBox="0 0 100 100">
                <circle
                    id="svg-shape"
                    cx="50"
                    cy="50"
                    r="20"
                />
            </svg>
        </body>
    </html>
`;

describe("DOM Computed CSS Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let styles: DOMStyleEngine;

    beforeAll(async () => {
        browser = new BrowserEngine({
            viewport: {
                width: 1440,
                height: 900
            }
        });

        const session = await browser.start();

        page = session.page;
        styles = new DOMStyleEngine();
    }, 30_000);

    beforeEach(async () => {
        await page.setViewportSize({
            width: 1440,
            height: 900
        });

        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("extracts the element tag name", async () => {
        const result = await styles.inspect(
            page.locator("#sample")
        );

        expect(result.tagName).toBe("div");
    });

    it("extracts a single property", async () => {
        const value = await styles.getProperty(
            page.locator("#sample"),
            "font-size"
        );

        expect(value).toBe("20px");
    });

    it("extracts multiple properties", async () => {
        const result = await styles.getProperties(
            page.locator("#sample"),
            ["font-size", "font-weight"]
        );

        expect(result).toEqual({
            "font-size": "20px",
            "font-weight": "700"
        });
    });

    it("extracts computed foreground colors", async () => {
        const value = await styles.getProperty(
            page.locator("#sample"),
            "color"
        );

        expect(value).toBe(
            "rgb(51, 102, 153)"
        );
    });

    it("extracts computed background colors", async () => {
        const value = await styles.getProperty(
            page.locator("#sample"),
            "background-color"
        );

        expect(value).toBe(
            "rgb(255, 255, 255)"
        );
    });

    it("extracts inherited properties", async () => {
        const value = await styles.getProperty(
            page.locator("#child"),
            "color"
        );

        expect(value).toBe(
            "rgb(100, 150, 200)"
        );
    });

    it("resolves relative font sizes", async () => {
        const value = await styles.getProperty(
            page.locator("#child"),
            "font-size"
        );

        expect(value).toBe("30px");
    });

    it("resolves relative line heights", async () => {
        const value = await styles.getProperty(
            page.locator("#sample"),
            "line-height"
        );

        expect(value).toBe("30px");
    });

    it("extracts a typography group", async () => {
        const result = await styles.getGroup(
            page.locator("#sample"),
            "typography"
        );

        expect(
            result.properties["font-size"]
        ).toBe("20px");

        expect(
            result.properties["letter-spacing"]
        ).toBe("2px");

        expect(
            result.properties["word-spacing"]
        ).toBe("4px");
    });

    it("extracts a color group", async () => {
        const result = await styles.getGroup(
            page.locator("#sample"),
            "color"
        );

        expect(
            result.properties["opacity"]
        ).toBe("0.5");
    });

    it("extracts layout properties", async () => {
        const result = await styles.getGroup(
            page.locator("#sample"),
            "layout"
        );

        expect(result.properties["width"])
            .toBe("200px");

        expect(result.properties["height"])
            .toBe("100px");

        expect(result.properties["box-sizing"])
            .toBe("border-box");
    });

    it("extracts spacing properties", async () => {
        const result = await styles.getGroup(
            page.locator("#sample"),
            "spacing"
        );

        expect(result.properties["margin-top"])
            .toBe("10px");

        expect(result.properties["padding-left"])
            .toBe("20px");
    });

    it("extracts border properties", async () => {
        const result = await styles.getGroup(
            page.locator("#sample"),
            "borders"
        );

        expect(result.properties["border-top-width"])
            .toBe("2px");

        expect(result.properties["border-top-color"])
            .toBe("rgb(0, 0, 0)");
    });

    it("extracts outline properties", async () => {
        const result = await styles.getGroup(
            page.locator("#sample"),
            "borders"
        );

        expect(result.properties["outline-width"])
            .toBe("3px");

        expect(result.properties["outline-offset"])
            .toBe("4px");

        expect(result.properties["outline-color"])
            .toBe("rgb(255, 0, 0)");
    });

    it("extracts background images", async () => {
        const result = await styles.getGroup(
            page.locator("#media"),
            "media"
        );

        expect(
            result.properties["background-image"]
        ).toContain("linear-gradient");

        expect(
            result.properties["background-size"]
        ).toBe("cover");
    });

    it("extracts animation properties", async () => {
        const result = await styles.getGroup(
            page.locator("#animated"),
            "animation"
        );

        expect(result.properties["animation-name"])
            .toBe("pulse");

        expect(result.properties["animation-duration"])
            .toBe("2s");

        expect(result.properties["animation-delay"])
            .toBe("0.5s");

        expect(result.properties["animation-iteration-count"])
            .toBe("infinite");
    });

    it("extracts transition properties", async () => {
        const result = await styles.getGroup(
            page.locator("#animated"),
            "animation"
        );

        expect(result.properties["transition-property"])
            .toBe("opacity");

        expect(result.properties["transition-duration"])
            .toBe("0.25s");
    });

    it("extracts interaction properties", async () => {
        const result = await styles.getGroup(
            page.locator("#pointer"),
            "interaction"
        );

        expect(result.properties["cursor"])
            .toBe("pointer");

        expect(result.properties["pointer-events"])
            .toBe("none");

        expect(result.properties["touch-action"])
            .toBe("none");
    });

    it("extracts clipping properties", async () => {
        const result = await styles.getGroup(
            page.locator("#clipped"),
            "visibility"
        );

        expect(result.properties["clip"])
            .toContain("rect(");

        expect(result.properties["overflow-x"])
            .toBe("hidden");
    });

    it("extracts SVG fill and stroke", async () => {
        const result = await styles.getGroup(
            page.locator("#svg-shape"),
            "svg"
        );

        expect(result.properties["fill"])
            .toBe("rgb(255, 0, 0)");

        expect(result.properties["stroke"])
            .toBe("rgb(0, 0, 255)");

        expect(result.properties["stroke-width"])
            .toBe("2px");
    });

    it("extracts CSS custom properties", async () => {
        const value = await styles.getProperty(
            page.locator("#sample"),
            "--accent-color"
        );

        expect(value.trim()).toBe("#336699");
    });

    it("preserves case-sensitive custom property names", async () => {
        const value = await styles.getProperty(
            page.locator("#sample"),
            "--CustomValue"
        );

        expect(value.trim()).toBe("12px");
    });

    it("normalizes ordinary CSS property names", async () => {
        const value = await styles.getProperty(
            page.locator("#sample"),
            "FONT-SIZE"
        );

        expect(value).toBe("20px");
    });

    it("reports unavailable CSS properties", async () => {
        const result = await styles.inspect(
            page.locator("#sample"),
            {
                properties: [
                    "not-a-real-css-property"
                ]
            }
        );

        expect(
            result.unavailableProperties
        ).toContain(
            "not-a-real-css-property"
        );
    });

    it("deduplicates requested properties", async () => {
        const result = await styles.inspect(
            page.locator("#sample"),
            {
                properties: [
                    "color",
                    "color",
                    "COLOR"
                ],

                groups: ["color"]
            }
        );

        expect(
            result.requestedProperties.filter(
                property => property === "color"
            )
        ).toHaveLength(1);
    });

    it("extracts multiple property groups", async () => {
        const result = await styles.inspect(
            page.locator("#sample"),
            {
                groups: [
                    "color",
                    "typography"
                ]
            }
        );

        expect(result.properties["color"])
            .toBe("rgb(51, 102, 153)");

        expect(result.properties["font-size"])
            .toBe("20px");
    });

    it("returns requested property metadata", async () => {
        const result = await styles.inspect(
            page.locator("#sample"),
            {
                properties: [
                    "color",
                    "font-size"
                ]
            }
        );

        expect(result.requestedProperties)
            .toEqual(["color", "font-size"]);

        expect(result.totalCount).toBe(2);
        expect(result.pseudoElement).toBeNull();
    });

    it("supports extracting all computed properties", async () => {
        const result = await styles.inspect(
            page.locator("#sample"),
            {
                includeAll: true
            }
        );

        expect(result.totalCount)
            .toBeGreaterThan(100);

        expect(result.properties["font-size"])
            .toBe("20px");
    });

    it("extracts predefined groups by default", async () => {
        const result = await styles.inspect(
            page.locator("#sample")
        );

        expect(result.requestedProperties)
            .toContain("font-size");

        expect(result.requestedProperties)
            .toContain("background-image");

        expect(result.requestedProperties)
            .toContain("outline-color");
    });

    it("returns available group properties", () => {
        expect(
            styles.getGroupProperties("color")
        ).toEqual(
            DOM_STYLE_GROUPS.color
        );
    });

    it("rejects empty property names", async () => {
        await expect(
            styles.getProperty(
                page.locator("#sample"),
                " "
            )
        ).rejects.toThrow(
            "CSS property name cannot be empty."
        );
    });

    it("extracts before pseudo-element content", async () => {
        const result =
            await styles.inspectPseudoElement(
                page.locator("#generated"),
                "::before"
            );

        expect(result.content)
            .toContain("Generated content");

        expect(result.hasGeneratedContent)
            .toBe(true);
    });

    it("extracts pseudo-element styling", async () => {
        const value = await styles.getProperty(
            page.locator("#generated"),
            "color",
            "::before"
        );

        expect(value).toBe(
            "rgb(255, 0, 0)"
        );
    });

    it("detects empty generated content", async () => {
        const result =
            await styles.inspectPseudoElement(
                page.locator("#generated"),
                "::after"
            );

        expect(result.content).toBe('""');

        expect(result.hasGeneratedContent)
            .toBe(true);
    });

    it("detects absent generated content", async () => {
        const result =
            await styles.inspectPseudoElement(
                page.locator("#no-generated"),
                "::before"
            );

        expect(result.content).toBe("none");

        expect(result.hasGeneratedContent)
            .toBe(false);
    });

    it("reports hidden generated content separately", async () => {
        const result =
            await styles.inspectPseudoElement(
                page.locator("#hidden-generated"),
                "::before"
            );

        expect(result.hasGeneratedContent)
            .toBe(true);

        expect(result.display)
            .toBe("none");
    });

    it("extracts placeholder styles", async () => {
        const value = await styles.getProperty(
            page.locator("#placeholder"),
            "color",
            "::placeholder"
        );

        expect(value).toBe(
            "rgb(128, 128, 128)"
        );
    });

    it("responds to active media queries", async () => {
        const target = page.locator(
            "#responsive"
        );

        expect(
            await styles.getProperty(
                target,
                "font-size"
            )
        ).toBe("24px");

        await page.setViewportSize({
            width: 390,
            height: 844
        });

        expect(
            await styles.getProperty(
                target,
                "font-size"
            )
        ).toBe("16px");
    });

    it("detects dynamically updated CSS", async () => {
        const target = page.locator("#sample");

        await target.evaluate(element => {
            element.setAttribute(
                "style",
                "font-size: 32px"
            );
        });

        expect(
            await styles.getProperty(
                target,
                "font-size"
            )
        ).toBe("32px");
    });

    it("supports elements inside open shadow roots", async () => {
        await page.evaluate(() => {
            const host = document.createElement("div");

            host.id = "shadow-host";

            document.body.appendChild(host);

            const shadow = host.attachShadow({
                mode: "open"
            });

            shadow.innerHTML = `
                <style>
                    span {
                        font-size: 28px;
                    }
                </style>

                <span id="shadow-text">
                    Shadow content
                </span>
            `;
        });

        const value = await styles.getProperty(
            page.locator("#shadow-text"),
            "font-size"
        );

        expect(value).toBe("28px");
    });
});