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
    DOMAttributeEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <title>Attribute Test Fixture</title>
        </head>

        <body>
            <main id="content">
                <img id="missing-alt">

                <img
                    id="empty-alt"
                    alt=""
                >

                <img
                    id="populated-alt"
                    alt="Mountain landscape"
                    title="Mountain"
                    class="hero-image"
                >

                <img
                    id="whitespace-alt"
                    alt="   "
                >

                <button
                    id="aria-button"
                    aria-label="Open menu"
                    aria-expanded="false"
                    aria-controls="menu"
                >
                    Menu
                </button>

                <button
                    id="disabled-button"
                    disabled
                >
                    Submit
                </button>

                <button
                    id="false-disabled"
                    disabled="false"
                >
                    Submit
                </button>

                <input
                    id="required-input"
                    type="text"
                    required
                    readonly
                >

                <input
                    id="checkbox"
                    type="checkbox"
                    checked
                >

                <div
                    id="custom-data"
                    data-project="wcag"
                    data-version="2.2"
                    data-empty=""
                ></div>

                <div
                    id="hidden-element"
                    hidden
                    aria-hidden="true"
                ></div>

                <div
                    id="inert-element"
                    inert
                ></div>

                <svg
                    id="svg-icon"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Icon"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                >
                    <use
                        id="svg-use"
                        xlink:href="#symbol"
                    ></use>
                </svg>

                <span></span>

                <div
                    id="special-attributes"
                    data-text="A &amp; B"
                    data-number="0"
                ></div>
            </main>
        </body>
    </html>
`;

describe("DOM Attribute Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let attributes: DOMAttributeEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session = await browser.start();

        page = session.page;
        attributes = new DOMAttributeEngine();
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("extracts all element attributes", async () => {
        const result = await attributes.getAttributes(
            page.locator("#populated-alt")
        );

        expect(result.attributes).toEqual({
            id: "populated-alt",
            alt: "Mountain landscape",
            title: "Mountain",
            class: "hero-image"
        });
    });

    it("reports the element tag name", async () => {
        const result = await attributes.getAttributes(
            page.locator("#populated-alt")
        );

        expect(result.tagName).toBe("img");
    });

    it("reports the HTML namespace", async () => {
        const result = await attributes.getAttributes(
            page.locator("#content")
        );

        expect(result.namespaceURI).toBe(
            "http://www.w3.org/1999/xhtml"
        );
    });

    it("counts extracted attributes", async () => {
        const result = await attributes.getAttributes(
            page.locator("#populated-alt")
        );

        expect(result.totalCount).toBe(4);
        expect(result.entries).toHaveLength(4);
    });

    it("returns null for missing attributes", async () => {
        const value = await attributes.getAttribute(
            page.locator("#missing-alt"),
            "alt"
        );

        expect(value).toBeNull();
    });

    it("preserves empty attribute values", async () => {
        const value = await attributes.getAttribute(
            page.locator("#empty-alt"),
            "alt"
        );

        expect(value).toBe("");
    });

    it("returns populated attribute values", async () => {
        const value = await attributes.getAttribute(
            page.locator("#populated-alt"),
            "alt"
        );

        expect(value).toBe("Mountain landscape");
    });

    it("preserves whitespace-only attribute values", async () => {
        const value = await attributes.getAttribute(
            page.locator("#whitespace-alt"),
            "alt"
        );

        expect(value).toBe("   ");
    });

    it("detects present attributes", async () => {
        expect(
            await attributes.hasAttribute(
                page.locator("#populated-alt"),
                "alt"
            )
        ).toBe(true);
    });

    it("detects missing attributes", async () => {
        expect(
            await attributes.hasAttribute(
                page.locator("#missing-alt"),
                "alt"
            )
        ).toBe(false);
    });

    it("recognizes empty attributes as present", async () => {
        expect(
            await attributes.hasAttribute(
                page.locator("#empty-alt"),
                "alt"
            )
        ).toBe(true);
    });

    it("describes missing attribute states", async () => {
        const state = await attributes.getAttributeState(
            page.locator("#missing-alt"),
            "alt"
        );

        expect(state).toEqual({
            name: "alt",
            present: false,
            empty: false,
            value: null
        });
    });

    it("describes empty attribute states", async () => {
        const state = await attributes.getAttributeState(
            page.locator("#empty-alt"),
            "alt"
        );

        expect(state).toEqual({
            name: "alt",
            present: true,
            empty: true,
            value: ""
        });
    });

    it("describes populated attribute states", async () => {
        const state = await attributes.getAttributeState(
            page.locator("#populated-alt"),
            "alt"
        );

        expect(state).toEqual({
            name: "alt",
            present: true,
            empty: false,
            value: "Mountain landscape"
        });
    });

    it("extracts ARIA attributes", async () => {
        const result = await attributes.getARIAAttributes(
            page.locator("#aria-button")
        );

        expect(result).toEqual({
            "aria-label": "Open menu",
            "aria-expanded": "false",
            "aria-controls": "menu"
        });
    });

    it("preserves ARIA boolean strings", async () => {
        const result = await attributes.getARIAAttributes(
            page.locator("#aria-button")
        );

        expect(result["aria-expanded"]).toBe("false");
    });

    it("returns no ARIA attributes when absent", async () => {
        const result = await attributes.getARIAAttributes(
            page.locator("#content")
        );

        expect(result).toEqual({});
    });

    it("extracts custom data attributes", async () => {
        const result = await attributes.getDataAttributes(
            page.locator("#custom-data")
        );

        expect(result).toEqual({
            "data-project": "wcag",
            "data-version": "2.2",
            "data-empty": ""
        });
    });

    it("returns no data attributes when absent", async () => {
        const result = await attributes.getDataAttributes(
            page.locator("#content")
        );

        expect(result).toEqual({});
    });

    it("detects disabled boolean attributes", async () => {
        const result = await attributes.getBooleanAttributes(
            page.locator("#disabled-button")
        );

        expect(result["disabled"]).toBe(true);
    });

    it("recognizes disabled=false as attribute presence", async () => {
        const result = await attributes.getBooleanAttributes(
            page.locator("#false-disabled")
        );

        expect(result["disabled"]).toBe(true);
    });

    it("detects absent boolean attributes", async () => {
        const result = await attributes.getBooleanAttributes(
            page.locator("#aria-button")
        );

        expect(result["disabled"]).toBe(false);
    });

    it("detects required and readonly attributes", async () => {
        const result = await attributes.getBooleanAttributes(
            page.locator("#required-input")
        );

        expect(result["required"]).toBe(true);
        expect(result["readonly"]).toBe(true);
    });

    it("detects checked attributes", async () => {
        const result = await attributes.getBooleanAttributes(
            page.locator("#checkbox")
        );

        expect(result["checked"]).toBe(true);
    });

    it("detects inert attributes", async () => {
        const result = await attributes.getBooleanAttributes(
            page.locator("#inert-element")
        );

        expect(result["inert"]).toBe(true);
    });

    it("preserves hidden and aria-hidden separately", async () => {
        const result = await attributes.getAttributes(
            page.locator("#hidden-element")
        );

        expect(result.attributes["hidden"]).toBe("");

        expect(
            result.ariaAttributes["aria-hidden"]
        ).toBe("true");
    });

    it("supports SVG namespaces", async () => {
        const result = await attributes.getAttributes(
            page.locator("#svg-icon")
        );

        expect(result.namespaceURI).toBe(
            "http://www.w3.org/2000/svg"
        );
    });

    it("preserves SVG attribute casing", async () => {
        const result = await attributes.getAttributes(
            page.locator("#svg-icon")
        );

        expect(result.attributes["viewBox"]).toBe(
            "0 0 24 24"
        );
    });

    it("preserves namespaced SVG attributes", async () => {
        const result = await attributes.getAttributes(
            page.locator("#svg-use")
        );

        const entry = result.entries.find(
            attribute =>
                attribute.name === "xlink:href"
        );

        expect(entry).toEqual({
            name: "xlink:href",
            value: "#symbol",
            localName: "href",
            namespaceURI: "http://www.w3.org/1999/xlink",
            prefix: "xlink"
        });
    });

    it("supports elements without attributes", async () => {
        const result = await attributes.getAttributes(
            page.locator("span")
        );

        expect(result.attributes).toEqual({});
        expect(result.entries).toEqual([]);
        expect(result.totalCount).toBe(0);
    });

    it("returns decoded HTML attribute values", async () => {
        const value = await attributes.getAttribute(
            page.locator("#special-attributes"),
            "data-text"
        );

        expect(value).toBe("A & B");
    });

    it("preserves numeric strings", async () => {
        const value = await attributes.getAttribute(
            page.locator("#special-attributes"),
            "data-number"
        );

        expect(value).toBe("0");
    });

    it("detects dynamically changed attributes", async () => {
        const target = page.locator("#missing-alt");

        await target.evaluate(element => {
            element.setAttribute(
                "alt",
                "New description"
            );
        });

        const value = await attributes.getAttribute(
            target,
            "alt"
        );

        expect(value).toBe("New description");
    });

    it("does not confuse live properties with attributes", async () => {
        const target = page.locator("#checkbox");

        await target.evaluate(element => {
            if (element instanceof HTMLInputElement) {
                element.checked = false;
            }
        });

        const result = await attributes.getBooleanAttributes(
            target
        );

        expect(result["checked"]).toBe(true);
    });
});