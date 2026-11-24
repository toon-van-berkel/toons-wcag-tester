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
    DOMContextEngine
} from "../../src/engines/index.js";

const fixture = `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
        <head>
            <title>Context Test Fixture</title>
            <base href="https://example.com/">
        </head>

        <body>
            <header id="header">
                <nav id="navigation">
                    <a href="/">Home</a>
                    <a href="/about">About</a>
                </nav>
            </header>

            <main id="main">
                <h1>Accessibility Testing</h1>

                <section
                    id="projects"
                    aria-label="Featured projects"
                >
                    <h2 id="project-heading">
                        Featured projects
                    </h2>

                    <p id="intro">
                        Project introduction
                    </p>

                    <figure id="project-figure">
                        <a
                            id="project-link"
                            href="/projects/example"
                            target="_blank"
                        >
                            <img
                                id="project-image"
                                alt="Project screenshot"
                            >
                        </a>

                        <figcaption>
                            Example project caption
                        </figcaption>
                    </figure>

                    <p id="outro">
                        Project conclusion
                    </p>
                </section>

                <section id="text-section">
                    <h2>Text content</h2>

                    <div id="text-container">
                        <span id="previous">Previous</span>
                        <span id="target">Target</span>
                        <span id="next">Next</span>
                    </div>

                    <div id="normalized">
                        Text
                        with    multiple
                        spaces
                    </div>

                    <div id="excluded-content">
                        Visible text
                        <script type="text/plain">
                            Internal script content
                        </script>
                        <style>
                            .sample { color: red; }
                        </style>
                    </div>

                    <h2 id="later-heading">
                        Later heading
                    </h2>
                </section>

                <section id="aria-heading-section">
                    <div
                        role="heading"
                        aria-level="3"
                        id="aria-heading"
                    >
                        ARIA heading
                    </div>

                    <p id="aria-heading-target">
                        Example paragraph
                    </p>
                </section>

                <form id="contact-form">
                    <fieldset>
                        <legend>Personal information</legend>

                        <label for="email">
                            Email address
                        </label>

                        <input
                            id="email"
                            type="email"
                        >

                        <label>
                            Full name
                            <input id="name">
                        </label>

                        <label for="multiple-labels">
                            First label
                        </label>

                        <label for="multiple-labels">
                            Second label
                        </label>

                        <input id="multiple-labels">

                        <input id="unlabelled">
                    </fieldset>

                    <button id="submit">
                        <svg id="submit-icon"></svg>
                        Submit
                    </button>
                </form>

                <section
                    id="language-section"
                    lang="ar"
                    dir="rtl"
                >
                    <p id="inherited-language">
                        Arabic example
                    </p>

                    <p
                        id="overridden-language"
                        lang="nl"
                        dir="ltr"
                    >
                        Nederlandse tekst
                    </p>
                </section>

                <div
                    id="explicit-landmark"
                    role="navigation"
                >
                    <span id="landmark-child">
                        Navigation content
                    </span>
                </div>

                <div id="shadow-host"></div>
            </main>

            <footer id="footer">
                Footer content
            </footer>
        </body>
    </html>
`;

describe("DOM Context Engine", () => {
    let browser: BrowserEngine;
    let page: Page;
    let context: DOMContextEngine;

    beforeAll(async () => {
        browser = new BrowserEngine();

        const session = await browser.start();

        page = session.page;
        context = new DOMContextEngine();
    }, 30_000);

    beforeEach(async () => {
        await page.setContent(fixture);
    });

    afterAll(async () => {
        await browser?.close();
    });

    async function inspect(id: string) {
        return context.inspect(
            page.locator("#" + id)
        );
    }

    it("extracts element context", async () => {
        const result = await inspect("target");

        expect(result.element.tagName).toBe("span");
        expect(result.element.id).toBe("target");
        expect(result.element.text).toBe("Target");
    });

    it("extracts the parent element", async () => {
        const result = await inspect("target");

        expect(result.parent?.id)
            .toBe("text-container");
    });

    it("extracts ordered ancestors", async () => {
        const result = await inspect("target");

        expect(
            result.ancestors.map(
                ancestor => ancestor.tagName
            )
        ).toEqual([
            "div",
            "section",
            "main",
            "body",
            "html"
        ]);
    });

    it("limits ancestor collection", async () => {
        const result = await context.inspect(
            page.locator("#target"),
            { maxAncestors: 2 }
        );

        expect(result.ancestors).toHaveLength(2);
        expect(result.ancestorsTruncated).toBe(true);
    });

    it("supports a zero ancestor limit", async () => {
        const result = await context.inspect(
            page.locator("#target"),
            { maxAncestors: 0 }
        );

        expect(result.ancestors).toEqual([]);
        expect(result.ancestorsTruncated).toBe(true);

        expect(result.parent?.id)
            .toBe("text-container");
    });

    it("reports complete ancestor collection", async () => {
        const result = await inspect("target");

        expect(result.ancestorsTruncated)
            .toBe(false);
    });

    it("extracts the previous sibling", async () => {
        const result = await inspect("target");

        expect(result.previousSibling?.id)
            .toBe("previous");
    });

    it("extracts the next sibling", async () => {
        const result = await inspect("target");

        expect(result.nextSibling?.id)
            .toBe("next");
    });

    it("returns null for absent siblings", async () => {
        const result = await inspect("previous");

        expect(result.previousSibling).toBeNull();
    });

    it("extracts surrounding text", async () => {
        const result = await inspect("target");

        expect(result.surroundingText)
            .toBe("Previous Target Next");
    });

    it("normalizes text whitespace", async () => {
        const result = await inspect("normalized");

        expect(result.element.text)
            .toBe("Text with multiple spaces");
    });

    it("limits extracted text length", async () => {
        const result = await context.inspect(
            page.locator("#normalized"),
            { maxTextLength: 4 }
        );

        expect(result.element.text).toBe("Text");
    });

    it("supports a zero text limit", async () => {
        const result = await context.inspect(
            page.locator("#target"),
            { maxTextLength: 0 }
        );

        expect(result.element.text).toBe("");
        expect(result.surroundingText).toBe("");
    });

    it("excludes script and stylesheet text", async () => {
        const result = await inspect(
            "excluded-content"
        );

        expect(result.element.text)
            .toBe("Visible text");
    });

    it("extracts the preceding heading", async () => {
        const result = await inspect(
            "project-image"
        );

        expect(result.heading).toEqual({
            level: 2,
            text: "Featured projects",
            id: "project-heading"
        });
    });

    it("does not use a following heading", async () => {
        const result = await inspect("target");

        expect(result.heading?.text)
            .toBe("Text content");
    });

    it("supports ARIA headings", async () => {
        const result = await inspect(
            "aria-heading-target"
        );

        expect(result.heading).toEqual({
            level: 3,
            text: "ARIA heading",
            id: "aria-heading"
        });
    });

    it("extracts native landmarks", async () => {
        const result = await inspect(
            "project-image"
        );

        expect(
            result.landmarks.map(
                landmark => landmark.role
            )
        ).toEqual([
            "region",
            "main"
        ]);
    });

    it("extracts explicit landmark roles", async () => {
        const result = await inspect(
            "landmark-child"
        );

        expect(
            result.landmarks.map(
                landmark => landmark.role
            )
        ).toContain("navigation");
    });

    it("extracts enclosing figure context", async () => {
        const result = await inspect(
            "project-image"
        );

        expect(result.figure?.element.id)
            .toBe("project-figure");
    });

    it("extracts figure captions", async () => {
        const result = await inspect(
            "project-image"
        );

        expect(result.figure?.caption)
            .toBe("Example project caption");
    });

    it("returns null without a figure", async () => {
        const result = await inspect("target");

        expect(result.figure).toBeNull();
    });

    it("extracts enclosing links", async () => {
        const result = await inspect(
            "project-image"
        );

        expect(result.link?.href)
            .toBe("/projects/example");

        expect(result.link?.target)
            .toBe("_blank");
    });

    it("resolves relative link URLs", async () => {
        const result = await inspect(
            "project-image"
        );

        expect(result.link?.resolvedHref)
            .toBe(
                "https://example.com/projects/example"
            );
    });

    it("detects enclosing interactive controls", async () => {
        const result = await inspect(
            "submit-icon"
        );

        expect(result.control?.tagName)
            .toBe("button");

        expect(result.control?.id)
            .toBe("submit");
    });

    it("extracts explicit form labels", async () => {
        const result = await inspect("email");

        expect(result.form?.labels)
            .toEqual(["Email address"]);
    });

    it("extracts implicit form labels", async () => {
        const result = await inspect("name");

        expect(result.form?.labels)
            .toEqual(["Full name"]);
    });

    it("extracts multiple associated labels", async () => {
        const result = await inspect(
            "multiple-labels"
        );

        expect(result.form?.labels).toEqual([
            "First label",
            "Second label"
        ]);
    });

    it("returns empty labels for unlabelled inputs", async () => {
        const result = await inspect(
            "unlabelled"
        );

        expect(result.form?.labels).toEqual([]);
    });

    it("extracts fieldset legends", async () => {
        const result = await inspect("email");

        expect(result.form?.fieldsetLegend)
            .toBe("Personal information");
    });

    it("extracts inherited document language", async () => {
        const result = await inspect("target");

        expect(result.language.language)
            .toBe("en");
    });

    it("extracts inherited language and direction", async () => {
        const result = await inspect(
            "inherited-language"
        );

        expect(result.language).toEqual({
            language: "ar",
            declaredDirection: "rtl",
            computedDirection: "rtl"
        });
    });

    it("supports language and direction overrides", async () => {
        const result = await inspect(
            "overridden-language"
        );

        expect(result.language).toEqual({
            language: "nl",
            declaredDirection: "ltr",
            computedDirection: "ltr"
        });
    });

    it("handles the document root element", async () => {
        const result = await context.inspect(
            page.locator("html")
        );

        expect(result.parent).toBeNull();
        expect(result.ancestors).toEqual([]);
    });

    it("rejects invalid ancestor limits", async () => {
        await expect(
            context.inspect(
                page.locator("#target"),
                { maxAncestors: -1 }
            )
        ).rejects.toThrow("maxAncestors");
    });

    it("rejects invalid text limits", async () => {
        await expect(
            context.inspect(
                page.locator("#target"),
                { maxTextLength: 1.5 }
            )
        ).rejects.toThrow("maxTextLength");
    });

    it("supports open shadow root context", async () => {
        await page.evaluate(() => {
            const host = document.getElementById(
                "shadow-host"
            );

            if (!host) {
                throw new Error("Missing shadow host.");
            }

            const shadow = host.attachShadow({
                mode: "open"
            });

            shadow.innerHTML =
                '<span id="shadow-target">' +
                'Shadow content' +
                '</span>';
        });

        const result = await inspect("shadow-target");

        expect(result.insideShadowRoot).toBe(true);
        expect(result.parent?.id).toBe("shadow-host");

        expect(
            result.shadowHosts.map(host => host.id)
        ).toEqual(["shadow-host"]);
    });

    it("supports slotted element ancestry", async () => {
        await page.evaluate(() => {
            const host = document.getElementById(
                "shadow-host"
            );

            if (!host) {
                throw new Error("Missing shadow host.");
            }

            host.innerHTML =
                '<span id="slotted">Slotted content</span>';

            const shadow = host.attachShadow({
                mode: "open"
            });

            shadow.innerHTML =
                '<div><slot></slot></div>';
        });

        const result = await inspect("slotted");

        expect(result.parent?.tagName).toBe("slot");

        expect(
            result.shadowHosts.map(host => host.id)
        ).toEqual(["shadow-host"]);

        expect(result.insideShadowRoot).toBe(false);
    });

    it("produces serializable context", async () => {
        const result = await inspect(
            "project-image"
        );

        expect(
            JSON.parse(JSON.stringify(result))
        ).toEqual(result);
    });

    it("detects dynamically changed context", async () => {
        await page.locator("#project-heading")
            .evaluate(element => {
                element.textContent = "Updated projects";
            });

        const result = await inspect(
            "project-image"
        );

        expect(result.heading?.text)
            .toBe("Updated projects");
    });
});