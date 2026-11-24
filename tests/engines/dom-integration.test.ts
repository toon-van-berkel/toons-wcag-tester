import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import {
    readFile
} from "node:fs/promises";

import type {
    Page
} from "playwright";

import {
    BrowserEngine,
    DOMQueryEngine,
    DOMFrameEngine,
    DOMShadowEngine,
    DOMStyleEngine,
    DOMSnapshotEngine
} from "../../src/engines/index.js";

import type {
    DOMElementSnapshot,
    DOMSnapshotOptions
} from "../../src/engines/index.js";

describe("Combined DOM Integration", () => {
    let browser: BrowserEngine;
    let page: Page;

    let query: DOMQueryEngine;
    let frames: DOMFrameEngine;
    let shadow: DOMShadowEngine;
    let styles: DOMStyleEngine;
    let snapshots: DOMSnapshotEngine;

    let fixture: string;

    beforeAll(async () => {
        fixture = await readFile(
            new URL(
                "../fixtures/dom-integration.html",
                import.meta.url
            ),
            "utf8"
        );

        browser = new BrowserEngine({
            viewport: {
                width: 1440,
                height: 900
            }
        });

        const session = await browser.start();

        page = session.page;

        query = new DOMQueryEngine(page);

        frames = new DOMFrameEngine(page);

        shadow = new DOMShadowEngine(page);

        styles = new DOMStyleEngine();

        snapshots = new DOMSnapshotEngine(page);
    }, 30_000);

    beforeEach(async () => {
        await page.setViewportSize({
            width: 1440,
            height: 900
        });

        await page.setContent(fixture);

        // Initialize the main document's shadow roots.

        await page.evaluate(() => {
            const hostOne =
                document.getElementById("component-one");

            const hostTwo =
                document.getElementById("component-two");

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
                throw new Error(
                    "Missing integration fixture shadow hosts."
                );
            }

            // First component.

            const first = hostOne.attachShadow({
                mode: "open"
            });

            first.innerHTML =
                '<img id="shared-image" alt="Component one image">' +
                '<div id="nested-host"></div>';

            // Nested component.

            const nestedHost =
                first.querySelector("#nested-host");

            if (!nestedHost) {
                throw new Error(
                    "Missing nested shadow host."
                );
            }

            const nested = nestedHost.attachShadow({
                mode: "open"
            });

            nested.innerHTML =
                '<img id="nested-image" alt="Nested component image">';

            // Second component.

            const second = hostTwo.attachShadow({
                mode: "open"
            });

            second.innerHTML =
                '<img id="shared-image" alt="Component two image">';

            // Slotted component.

            const slots = slotHost.attachShadow({
                mode: "open"
            });

            slots.innerHTML =
                '<figure>' +
                    '<slot name="preview"></slot>' +
                    '<figcaption>Slotted preview</figcaption>' +
                '</figure>';

            // Inaccessible closed root.

            const closed = closedHost.attachShadow({
                mode: "closed"
            });

            closed.innerHTML =
                '<img id="closed-image" alt="Closed root image">';
        });

        // Verify main document fixture initialization.

        const mainShadowDiscovery =
            await shadow.discover();

        expect(
            mainShadowDiscovery.totalDiscovered
        ).toBe(4);

        expect(
            await query.count("img")
        ).toBe(8);

        // Initialize the embedded document.

        const embedded = page.frameLocator(
            "#embedded-frame"
        );

        const embeddedHost =
            embedded.locator("#embedded-host");

        await embeddedHost.waitFor({
            state: "attached"
        });

        await embeddedHost.evaluate(host => {
            const root = host.attachShadow({
                mode: "open"
            });

            root.innerHTML =
                '<img id="shared-image" ' +
                'alt="Embedded shadow image">';
        });

        // Initialize the nested iframe.

        await embedded.locator("body")
            .evaluate(body => {
                const iframe =
                    document.createElement("iframe");

                iframe.id = "nested-frame";

                iframe.name = "nested";

                iframe.title =
                    "Nested embedded document";

                iframe.srcdoc =
                    '<!DOCTYPE html>' +
                    '<html lang="de">' +
                    '<head>' +
                        '<title>Nested document</title>' +
                    '</head>' +
                    '<body>' +
                        '<h2>Nested project</h2>' +
                        '<img id="shared-image" ' +
                        'alt="Nested frame image">' +
                    '</body>' +
                    '</html>';

                body.appendChild(iframe);
            });

        await embedded
            .frameLocator("#nested-frame")
            .locator("#shared-image")
            .waitFor({
                state: "attached"
            });
    }, 15_000);

    afterAll(async () => {
        await browser?.close();
    });

    async function collectImages(
        options: DOMSnapshotOptions = {}
    ) {
        const discovery =
            await frames.queryAll("img");

        const locators =
            discovery.results.flatMap(
                entry =>
                    entry.result?.elements ?? []
            );

        const batch =
            await snapshots.captureAll(
                locators,
                options
            );

        return {
            discovery,
            batch
        };
    }

    function getIdentityKey(
        snapshot: DOMElementSnapshot
    ): string {
        if (!snapshot.frame || !snapshot.identity) {
            throw new Error(
                "Snapshot has no complete identity."
            );
        }

        return JSON.stringify([
            snapshot.frame.id,

            snapshot.identity.shadow.hostPath,

            snapshot.identity.shadow.selector
        ]);
    }

    it(
        "discovers the complete attached document tree",
        async () => {
            const result =
                await frames.discover();

            expect(result.totalDiscovered)
                .toBe(3);

            expect(result.availableCount)
                .toBe(3);

            expect(result.detachedCount)
                .toBe(0);

            expect(result.errorCount)
                .toBe(0);

            expect(result.truncated)
                .toBe(false);

            const embedded = result.frames.find(
                entry =>
                    entry.reference.name === "embedded"
            );

            const nested = result.frames.find(
                entry =>
                    entry.reference.name === "nested"
            );

            expect(embedded?.reference.depth)
                .toBe(1);

            expect(nested?.reference.depth)
                .toBe(2);

            expect(nested?.reference.parentId)
                .toBe(embedded?.reference.id);
        },
        15_000
    );

    it(
        "discovers images across frames and open shadow roots",
        async () => {
            const result =
                await frames.queryAll("img");

            expect(result.totalMatches)
                .toBe(11);

            expect(result.returnedMatches)
                .toBe(11);

            expect(result.incomplete)
                .toBe(false);

            const main = result.results.find(
                entry =>
                    entry.reference.isMainFrame
            );

            const embedded = result.results.find(
                entry =>
                    entry.reference.name === "embedded"
            );

            const nested = result.results.find(
                entry =>
                    entry.reference.name === "nested"
            );

            expect(main?.result?.totalCount)
                .toBe(8);

            expect(embedded?.result?.totalCount)
                .toBe(2);

            expect(nested?.result?.totalCount)
                .toBe(1);
        },
        15_000
    );

    it(
        "captures every discoverable image successfully",
        async () => {
            const result =
                await collectImages();

            expect(result.discovery.incomplete)
                .toBe(false);

            expect(result.batch.totalCount)
                .toBe(11);

            expect(result.batch.completeCount)
                .toBe(11);

            expect(result.batch.partialCount)
                .toBe(0);

            expect(result.batch.errorCount)
                .toBe(0);

            expect(result.batch.incomplete)
                .toBe(false);

            expect(
                result.batch.snapshots.every(
                    snapshot =>
                        snapshot.consistency ===
                        "verified"
                )
            ).toBe(true);
        },
        15_000
    );

    it(
        "distinguishes duplicate IDs across document boundaries",
        async () => {
            const result =
                await frames.queryAll(
                    "#shared-image"
                );

            expect(result.totalMatches)
                .toBe(6);

            const locators =
                result.results.flatMap(
                    entry =>
                        entry.result?.elements ?? []
                );

            const batch =
                await snapshots.captureAll(
                    locators,
                    {
                        visibility: false,
                        styles: false,
                        context: false
                    }
                );

            expect(batch.completeCount)
                .toBe(6);

            const keys = new Set(
                batch.snapshots.map(
                    getIdentityKey
                )
            );

            expect(keys.size)
                .toBe(6);

            expect(
                batch.snapshots.every(
                    snapshot =>
                        snapshot.identity?.shadow.selector ===
                        "#shared-image"
                )
            ).toBe(true);

            const alternatives =
                batch.snapshots.map(
                    snapshot =>
                        snapshot.attributes
                            ?.attributes["alt"]
                );

            expect(alternatives).toEqual(
                expect.arrayContaining([
                    "Main project preview",
                    "Component one image",
                    "Component two image",
                    "Embedded image",
                    "Embedded shadow image",
                    "Nested frame image"
                ])
            );
        },
        15_000
    );

    it(
        "reconciles root-specific queries with shadow-piercing queries",
        async () => {
            const discovery =
                await frames.discover();

            let rootSpecificCount = 0;

            for (const entry of discovery.frames) {
                expect(entry.reference.status)
                    .toBe("available");

                const engine =
                    new DOMShadowEngine(
                        entry.frame
                    );

                const documentImages =
                    await engine.query([], "img");

                rootSpecificCount +=
                    documentImages.totalCount;

                const roots =
                    await engine.discover();

                expect(roots.truncated)
                    .toBe(false);

                for (const root of roots.roots) {
                    const result =
                        await engine.query(
                            root.hostPath,
                            "img"
                        );

                    rootSpecificCount +=
                        result.totalCount;
                }
            }

            const combined =
                await frames.queryAll("img");

            expect(rootSpecificCount)
                .toBe(11);

            expect(rootSpecificCount)
                .toBe(combined.totalMatches);
        },
        15_000
    );

    it(
        "does not duplicate slotted content",
        async () => {
            const result =
                await frames.queryAll(
                    "#slotted-image"
                );

            expect(result.totalMatches)
                .toBe(1);

            const roots =
                await shadow.discover();

            const slotRoot = roots.roots.find(
                root =>
                    root.hostId === "slot-host"
            );

            const slot = slotRoot?.slots.find(
                item =>
                    item.name === "preview"
            );

            expect(slot?.assignedElementCount)
                .toBe(1);

            expect(slot?.usingFallback)
                .toBe(false);

            const snapshot =
                await snapshots.capture(
                    page.locator("#slotted-image")
                );

            expect(snapshot.status)
                .toBe("complete");

            expect(
                snapshot.identity?.shadow.hostPath
            ).toEqual([]);

            expect(
                snapshot.context?.parent?.tagName
            ).toBe("slot");

            expect(
                snapshot.context?.shadowHosts.map(
                    host => host.id
                )
            ).toContain("slot-host");
        },
        15_000
    );

    it(
        "preserves closed shadow root limitations",
        async () => {
            const discovery =
                await shadow.discover();

            expect(
                discovery.closedRootsInspectable
            ).toBe(false);

            expect(discovery.truncated)
                .toBe(false);

            expect(
                await query.count("#closed-image")
            ).toBe(0);

            expect(
                discovery.roots.some(
                    root =>
                        root.hostId === "closed-host"
                )
            ).toBe(false);

            await expect(
                shadow.query(
                    ["#closed-host"],
                    "img"
                )
            ).rejects.toThrow(
                "Open shadow root unavailable"
            );
        }
    );

    it(
        "distinguishes different visibility conditions",
        async () => {
            const normal =
                await snapshots.capture(
                    page.locator(
                        "#project-link > img"
                    )
                );

            const hidden =
                await snapshots.capture(
                    page.locator("#hidden-image")
                );

            const transparent =
                await snapshots.capture(
                    page.locator(
                        "#transparent-image"
                    )
                );

            const offscreen =
                await snapshots.capture(
                    page.locator("#offscreen-image")
                );

            expect(normal.status)
                .toBe("complete");

            expect(normal.visibility?.potentiallyVisible)
                .toBe(true);

            expect(hidden.status)
                .toBe("complete");

            expect(hidden.visibility?.displayNone)
                .toBe(true);

            expect(hidden.visibility?.potentiallyRendered)
                .toBe(false);

            expect(transparent.visibility?.opacityZero)
                .toBe(true);

            expect(transparent.visibility?.potentiallyRendered)
                .toBe(true);

            expect(transparent.visibility?.potentiallyVisible)
                .toBe(false);

            expect(offscreen.visibility?.inViewport)
                .toBe(false);

            expect(offscreen.visibility?.potentiallyRendered)
                .toBe(true);

            expect(offscreen.visibility?.potentiallyVisible)
                .toBe(false);
        },
        15_000
    );

    it(
        "combines image attributes with structural context",
        async () => {
            const result =
                await snapshots.capture(
                    page.locator(
                        "#project-link > img"
                    )
                );

            expect(result.status)
                .toBe("complete");

            expect(
                result.attributes?.attributes["alt"]
            ).toBe("Main project preview");

            expect(result.context?.heading?.text)
                .toBe("Featured projects");

            expect(result.context?.figure?.caption)
                .toBe("Example project caption");

            expect(result.context?.link?.resolvedHref)
                .toBe(
                    "https://example.com/projects/example"
                );

            expect(result.context?.control?.tagName)
                .toBe("a");

            expect(
                result.context?.landmarks.map(
                    landmark => landmark.role
                )
            ).toEqual([
                "region",
                "main"
            ]);
        },
        15_000
    );

    it(
        "combines form attributes and associated labels",
        async () => {
            const result =
                await snapshots.capture(
                    page.locator("#email")
                );

            expect(result.status)
                .toBe("complete");

            expect(
                result.attributes?.attributes["type"]
            ).toBe("email");

            expect(result.context?.form?.labels)
                .toEqual(["Email address"]);

            expect(result.context?.form?.fieldsetLegend)
                .toBe("Personal details");

            expect(result.context?.heading?.text)
                .toBe("Contact information");

            expect(result.context?.control?.tagName)
                .toBe("input");

            expect(
                result.context?.landmarks.map(
                    landmark => landmark.role
                )
            ).toContain("form");
        },
        15_000
    );

    it(
        "combines generated content with interactive context",
        async () => {
            const target =
                page.locator("#generated-icon");

            const snapshot =
                await snapshots.capture(target);

            const pseudo =
                await styles.inspectPseudoElement(
                    target,
                    "::before"
                );

            expect(snapshot.status)
                .toBe("complete");

            expect(snapshot.context?.element.text)
                .toBe("Download");

            expect(snapshot.context?.control?.tagName)
                .toBe("button");

            expect(pseudo.hasGeneratedContent)
                .toBe(true);

            expect(pseudo.content)
                .toBe('""');

            expect(
                pseudo.styles.properties[
                    "background-image"
                ]
            ).toContain("linear-gradient");
        },
        15_000
    );

    it(
        "captures responsive styling at different viewport sizes",
        async () => {
            const target =
                page.locator("#responsive-text");

            const options: DOMSnapshotOptions = {
                styleOptions: {
                    groups: ["typography"]
                }
            };

            const desktop =
                await snapshots.capture(
                    target,
                    options
                );

            await page.setViewportSize({
                width: 390,
                height: 844
            });

            const mobile =
                await snapshots.capture(
                    target,
                    options
                );

            expect(
                desktop.styles?.properties["font-size"]
            ).toBe("24px");

            expect(
                mobile.styles?.properties["font-size"]
            ).toBe("16px");

            expect(
                desktop.styles?.properties["line-height"]
            ).toBe("36px");

            expect(
                mobile.styles?.properties["line-height"]
            ).toBe("24px");

            expect(getIdentityKey(desktop))
                .toBe(getIdentityKey(mobile));
        },
        15_000
    );

    it(
        "captures shadow-root and frame boundaries together",
        async () => {
            const target = page
                .frameLocator("#embedded-frame")
                .locator(
                    "#embedded-host #shared-image"
                );

            const result =
                await snapshots.capture(target);

            expect(result.status)
                .toBe("complete");

            expect(result.frame?.depth)
                .toBe(1);

            expect(result.frame?.name)
                .toBe("embedded");

            expect(
                result.identity?.shadow.hostPath
            ).toEqual([
                "#embedded-host"
            ]);

            expect(
                result.identity?.shadow.selector
            ).toBe("#shared-image");

            expect(
                result.attributes?.attributes["alt"]
            ).toBe("Embedded shadow image");

            expect(result.context?.language.language)
                .toBe("nl");
        },
        15_000
    );

    it(
        "preserves nested frame context independently",
        async () => {
            const target = page
                .frameLocator("#embedded-frame")
                .frameLocator("#nested-frame")
                .locator("#shared-image");

            const result =
                await snapshots.capture(target);

            expect(result.status)
                .toBe("complete");

            expect(result.frame?.depth)
                .toBe(2);

            expect(result.frame?.title)
                .toBe("Nested document");

            expect(
                result.identity?.shadow.hostPath
            ).toEqual([]);

            expect(result.context?.heading?.text)
                .toBe("Nested project");

            expect(result.context?.language.language)
                .toBe("de");
        },
        15_000
    );

    it(
        "discovers dynamically added shadow content",
        async () => {
            await page
                .locator("#component-one")
                .evaluate(host => {
                    const root = host.shadowRoot;

                    if (!root) {
                        throw new Error(
                            "Missing open shadow root."
                        );
                    }

                    const image =
                        document.createElement("img");

                    image.id = "dynamic-image";

                    image.alt = "Dynamic image";

                    root.appendChild(image);
                });

            const result =
                await frames.queryAll("img");

            expect(result.totalMatches)
                .toBe(12);

            const snapshot =
                await snapshots.capture(
                    page.locator("#dynamic-image")
                );

            expect(snapshot.status)
                .toBe("complete");

            expect(
                snapshot.identity?.shadow.hostPath
            ).toEqual([
                "#component-one"
            ]);

            expect(
                snapshot.attributes?.attributes["alt"]
            ).toBe("Dynamic image");
        },
        15_000
    );

    it(
        "captures updated evidence without changing element identity",
        async () => {
            const target = page.locator(
                "#project-link > img"
            );

            const first =
                await snapshots.capture(target);

            await target.evaluate(element => {
                element.setAttribute(
                    "alt",
                    "Updated project preview"
                );
            });

            await page
                .locator("#projects-heading")
                .evaluate(element => {
                    element.textContent =
                        "Updated featured projects";
                });

            const second =
                await snapshots.capture(target);

            expect(getIdentityKey(first))
                .toBe(getIdentityKey(second));

            expect(
                first.attributes?.attributes["alt"]
            ).toBe("Main project preview");

            expect(
                second.attributes?.attributes["alt"]
            ).toBe("Updated project preview");

            expect(first.context?.heading?.text)
                .toBe("Featured projects");

            expect(second.context?.heading?.text)
                .toBe("Updated featured projects");
        },
        15_000
    );

    it(
        "reports previously discovered elements that are removed",
        async () => {
            const target =
                await query.queryOne(
                    "#hidden-image"
                );

            if (!target) {
                throw new Error(
                    "Missing fixture image."
                );
            }

            await target.evaluate(
                element => element.remove()
            );

            const result =
                await snapshots.capture(
                    target,
                    {
                        targetTimeoutMs: 250
                    }
                );

            expect(result.status)
                .toBe("error");

            expect(result.completedSections)
                .toEqual([]);

            expect(result.errors[0]?.section)
                .toBe("target");

            const updated =
                await frames.queryAll("img");

            expect(updated.totalMatches)
                .toBe(10);
        },
        15_000
    );

    it(
        "propagates incomplete discovery and capture independently",
        async () => {
            const discovery =
                await frames.queryAll(
                    "img",
                    {
                        maxDepth: 0,
                        limitPerFrame: 1
                    }
                );

            expect(discovery.incomplete)
                .toBe(true);

            expect(discovery.discovery.truncated)
                .toBe(true);

            expect(discovery.discovery.skippedByDepth)
                .toBe(2);

            expect(discovery.totalMatches)
                .toBe(8);

            expect(discovery.returnedMatches)
                .toBe(1);

            const locators =
                discovery.results.flatMap(
                    entry =>
                        entry.result?.elements ?? []
                );

            const batch =
                await snapshots.captureAll(
                    locators
                );

            expect(batch.completeCount)
                .toBe(1);

            expect(batch.incomplete)
                .toBe(false);

            const overallIncomplete =
                discovery.incomplete ||
                batch.incomplete;

            expect(overallIncomplete)
                .toBe(true);
        },
        15_000
    );

    it(
        "retains usable evidence after individual inspection failures",
        async () => {
            const result =
                await collectImages({
                    styleOptions: {
                        properties: [" "]
                    }
                });

            expect(result.discovery.incomplete)
                .toBe(false);

            expect(result.batch.completeCount)
                .toBe(0);

            expect(result.batch.partialCount)
                .toBe(11);

            expect(result.batch.errorCount)
                .toBe(0);

            expect(result.batch.incomplete)
                .toBe(true);

            for (
                const snapshot of result.batch.snapshots
            ) {
                expect(snapshot.identity)
                    .not.toBeNull();

                expect(snapshot.frame)
                    .not.toBeNull();

                expect(snapshot.attributes)
                    .not.toBeNull();

                expect(snapshot.context)
                    .not.toBeNull();

                expect(snapshot.styles)
                    .toBeNull();

                expect(
                    snapshot.errors.some(
                        error =>
                            error.section === "styles"
                    )
                ).toBe(true);
            }
        },
        15_000
    );

    it(
        "produces serializable inspection results with timing metadata",
        async () => {
            const result =
                await collectImages();

            const report = {
                frames: frames.getReferences(
                    result.discovery.discovery
                ),

                discovery: {
                    totalMatches:
                        result.discovery.totalMatches,

                    returnedMatches:
                        result.discovery.returnedMatches,

                    incomplete:
                        result.discovery.incomplete
                },

                inspection: result.batch,

                knownLimitations: {
                    closedShadowRoots:
                        "not_inspectable",

                    atomicCapture: false
                }
            };

            const serialized =
                JSON.stringify(report);

            const restored =
                JSON.parse(serialized);

            expect(restored)
                .toEqual(report);

            expect(result.batch.totalCount)
                .toBe(11);

            expect(
                Number.isFinite(
                    result.batch.durationMs
                )
            ).toBe(true);

            expect(result.batch.durationMs)
                .toBeGreaterThanOrEqual(0);

            expect(
                result.batch.snapshots.every(
                    snapshot =>
                        Number.isFinite(
                            snapshot.durationMs
                        ) &&
                        snapshot.durationMs >= 0
                )
            ).toBe(true);
        },
        15_000
    );
});