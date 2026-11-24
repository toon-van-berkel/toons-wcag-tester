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
    DOMVisibilityEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Visibility Test Fixture</title>

            <style>
                body {
                    margin: 0;
                }

                .sample {
                    width: 100px;
                    height: 30px;
                    display: block;
                }

                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    clip-path: inset(50%);
                    white-space: nowrap;
                    border: 0;
                }
            </style>
        </head>

        <body>
            <div id="normal" class="sample">
                Visible
            </div>

            <div
                id="display-none"
                class="sample"
                style="display: none"
            ></div>

            <div style="display: none">
                <div
                    id="hidden-parent"
                    class="sample"
                ></div>
            </div>

            <div
                id="visibility-hidden"
                class="sample"
                style="visibility: hidden"
            ></div>

            <div style="visibility: hidden">
                <div
                    id="visibility-override"
                    class="sample"
                    style="visibility: visible"
                ></div>
            </div>

            <div
                id="opacity-zero"
                class="sample"
                style="opacity: 0"
            ></div>

            <div style="opacity: 0">
                <div
                    id="transparent-parent"
                    class="sample"
                ></div>
            </div>

            <div style="opacity: 0.5">
                <div
                    id="partial-opacity"
                    class="sample"
                    style="opacity: 0.5"
                ></div>
            </div>

            <div id="html-hidden" hidden></div>

            <div hidden>
                <div id="html-hidden-parent"></div>
            </div>

            <div
                id="aria-hidden"
                class="sample"
                aria-hidden="true"
            ></div>

            <div aria-hidden="true">
                <div
                    id="aria-hidden-parent"
                    class="sample"
                ></div>

                <div
                    id="aria-hidden-override"
                    class="sample"
                    aria-hidden="false"
                ></div>
            </div>

            <div
                id="aria-false"
                class="sample"
                aria-hidden="false"
            ></div>

            <div
                id="inert-element"
                class="sample"
                inert
            ></div>

            <div inert>
                <button
                    id="inert-parent"
                    class="sample"
                >Submit</button>
            </div>

            <div
                id="content-hidden"
                class="sample"
                style="content-visibility: hidden"
            >
                <span id="content-hidden-child">
                    Hidden content
                </span>
            </div>

            <div
                id="zero-dimensions"
                style="width: 0; height: 0;"
            ></div>

            <div
                id="outside-viewport"
                class="sample"
                style="
                    position: absolute;
                    top: 2000px;
                    left: 0;
                "
            ></div>

            <div
                id="partially-visible"
                class="sample"
                style="
                    position: fixed;
                    top: 0;
                    left: -50px;
                "
            ></div>

            <div
                id="screen-reader-only"
                class="sr-only"
            >
                Screen reader text
            </div>

            <div
                id="display-contents"
                style="display: contents"
            >
                <span>Visible child</span>
            </div>

            <div
                id="shadow-host"
                class="sample"
            ></div>
        </body>
    </html>
`;

describe("DOM Visibility Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let visibility: DOMVisibilityEngine;

    beforeAll(async () => {
        browser = new BrowserEngine({
            viewport: {
                width: 1440,
                height: 900
            }
        });

        const session = await browser.start();

        page = session.page;
        visibility = new DOMVisibilityEngine();
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);

        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
    });

    afterAll(async () => {
        await browser?.close();
    });

    async function inspect(id: string) {
        return visibility.inspect(
            page.locator(`#${id}`)
        );
    }

    it("detects connected elements", async () => {
        const result = await inspect("normal");

        expect(result.connected).toBe(true);
    });

    it("detects normally visible elements", async () => {
        const result = await inspect("normal");

        expect(result.potentiallyRendered).toBe(true);
        expect(result.potentiallyVisible).toBe(true);
    });

    it("detects display none", async () => {
        const result = await inspect("display-none");

        expect(result.displayNone).toBe(true);
        expect(result.potentiallyRendered).toBe(false);
    });

    it("detects display none on ancestors", async () => {
        const result = await inspect("hidden-parent");

        expect(result.displayNone).toBe(true);
        expect(result.potentiallyVisible).toBe(false);
    });

    it("detects visibility hidden", async () => {
        const result = await inspect("visibility-hidden");

        expect(result.visibilityHidden).toBe(true);
        expect(result.potentiallyRendered).toBe(false);
    });

    it("supports visibility overrides", async () => {
        const result = await inspect("visibility-override");

        expect(result.visibilityHidden).toBe(false);
        expect(result.potentiallyRendered).toBe(true);
    });

    it("detects zero opacity", async () => {
        const result = await inspect("opacity-zero");

        expect(result.opacityZero).toBe(true);
        expect(result.potentiallyRendered).toBe(true);
        expect(result.potentiallyVisible).toBe(false);
    });

    it("detects zero opacity on ancestors", async () => {
        const result = await inspect("transparent-parent");

        expect(result.opacityZero).toBe(true);
        expect(result.effectiveOpacity).toBe(0);
    });

    it("calculates effective opacity", async () => {
        const result = await inspect("partial-opacity");

        expect(result.opacity).toBe(0.5);
        expect(result.effectiveOpacity).toBe(0.25);
    });

    it("detects HTML hidden attributes", async () => {
        const result = await inspect("html-hidden");

        expect(result.hiddenAttribute).toBe(true);
        expect(result.displayNone).toBe(true);
    });

    it("detects hidden attributes on ancestors", async () => {
        const result = await inspect("html-hidden-parent");

        expect(result.hiddenAttribute).toBe(true);
    });

    it("detects aria-hidden", async () => {
        const result = await inspect("aria-hidden");

        expect(result.ariaHidden).toBe(true);
        expect(result.potentiallyRendered).toBe(true);
        expect(result.potentiallyVisible).toBe(true);

        expect(
            result.potentiallyExcludedFromAccessibilityTree
        ).toBe(true);
    });

    it("detects aria-hidden on ancestors", async () => {
        const result = await inspect("aria-hidden-parent");

        expect(result.ariaHidden).toBe(true);
    });

    it("does not override an aria-hidden ancestor", async () => {
        const result = await inspect("aria-hidden-override");

        expect(result.ariaHidden).toBe(true);
    });

    it("recognizes aria-hidden false", async () => {
        const result = await inspect("aria-false");

        expect(result.ariaHidden).toBe(false);
    });

    it("detects inert attributes", async () => {
        const result = await inspect("inert-element");

        expect(result.inert).toBe(true);
        expect(result.potentiallyRendered).toBe(true);

        expect(
            result.potentiallyExcludedFromAccessibilityTree
        ).toBe(true);
    });

    it("detects inert ancestors", async () => {
        const result = await inspect("inert-parent");

        expect(result.inert).toBe(true);
    });

    it("detects content-visibility hidden on ancestors", async () => {
        const result = await inspect("content-hidden-child");

        expect(result.contentVisibilityHidden).toBe(true);
        expect(result.potentiallyRendered).toBe(false);
    });

    it("distinguishes a content-visibility container from its children", async () => {
        const result = await inspect("content-hidden");

        expect(result.contentVisibilityHidden).toBe(false);
        expect(result.potentiallyRendered).toBe(true);
    });

    it("extracts element dimensions", async () => {
        const result = await inspect("normal");

        expect(result.bounds.width).toBe(100);
        expect(result.bounds.height).toBe(30);
        expect(result.hasDimensions).toBe(true);
    });

    it("detects zero dimensions", async () => {
        const result = await inspect("zero-dimensions");

        expect(result.hasDimensions).toBe(false);
        expect(result.potentiallyVisible).toBe(false);
    });

    it("detects elements inside the viewport", async () => {
        const result = await inspect("normal");

        expect(result.inViewport).toBe(true);
        expect(result.viewportIntersectionRatio).toBe(1);
    });

    it("detects elements outside the viewport", async () => {
        const result = await inspect("outside-viewport");

        expect(result.inViewport).toBe(false);
        expect(result.viewportIntersectionRatio).toBe(0);
        expect(result.potentiallyRendered).toBe(true);
    });

    it("calculates partial viewport intersections", async () => {
        const result = await inspect("partially-visible");

        expect(result.inViewport).toBe(true);

        expect(
            result.viewportIntersectionRatio
        ).toBeCloseTo(0.5);
    });

    it("detects potentially clipped elements", async () => {
        const result = await inspect("screen-reader-only");

        expect(result.potentiallyClipped).toBe(true);
    });

    it("does not assume clipped elements are inaccessible", async () => {
        const result = await inspect("screen-reader-only");

        expect(
            result.potentiallyExcludedFromAccessibilityTree
        ).toBe(false);
    });

    it("does not assume transparent elements are inaccessible", async () => {
        const result = await inspect("opacity-zero");

        expect(
            result.potentiallyExcludedFromAccessibilityTree
        ).toBe(false);
    });

    it("does not assume offscreen elements are inaccessible", async () => {
        const result = await inspect("outside-viewport");

        expect(
            result.potentiallyExcludedFromAccessibilityTree
        ).toBe(false);
    });

    it("handles display contents without assuming exclusion", async () => {
        const result = await inspect("display-contents");

        expect(result.display).toBe("contents");
        expect(result.hasDimensions).toBe(false);

        expect(
            result.potentiallyExcludedFromAccessibilityTree
        ).toBe(false);
    });

    it("detects dynamically changed visibility", async () => {
        const target = page.locator("#normal");

        await target.evaluate(element => {
            element.setAttribute(
                "style",
                "display: none"
            );
        });

        const result = await visibility.inspect(target);

        expect(result.displayNone).toBe(true);
        expect(result.potentiallyVisible).toBe(false);
    });

    it("traverses open shadow root ancestors", async () => {
        await page.evaluate(() => {
            const host = document.getElementById(
                "shadow-host"
            );

            if (!host) {
                throw new Error("Missing shadow host.");
            }

            host.style.opacity = "0";

            const shadow = host.attachShadow({
                mode: "open"
            });

            shadow.innerHTML = `
                <button id="shadow-button">
                    Shadow button
                </button>
            `;
        });

        const result = await visibility.inspect(
            page.locator("#shadow-button")
        );

        expect(result.opacityZero).toBe(true);
        expect(result.effectiveOpacity).toBe(0);
        expect(result.potentiallyVisible).toBe(false);
    });
});