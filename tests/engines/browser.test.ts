import {
    afterEach,
    beforeAll,
    afterAll,
    describe,
    expect,
    it
} from "vitest";

import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { BrowserEngine } from "../../src/engines/index.js";

describe("Browser Engine", () => {
    let engine: BrowserEngine;
    let server: Server;
    let url: string;

    beforeAll(async () => {
        server = createServer((request, response) => {
            if (request.url === "/missing") {
                response.writeHead(404);
                response.end("Not found");
                return;
            }

            response.writeHead(200, {
                "Content-Type": "text/html"
            });

            response.end(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <title>WCAG Test Fixture</title>
                    </head>
                    <body>
                        <h1>Accessibility Test</h1>

                        <img
                            src="/test.png"
                            alt="Test image"
                        >
                    </body>
                </html>
            `);
        });

        await new Promise<void>(resolve => {
            server.listen(0, "127.0.0.1", resolve);
        });

        const address = server.address() as AddressInfo;

        url = `http://127.0.0.1:${address.port}`;
    });

    afterEach(async () => {
        await engine?.close();
    });

    afterAll(async () => {
        await new Promise<void>(resolve => {
            server.close(() => resolve());
        });
    });

    it("starts Chromium", async () => {
        engine = new BrowserEngine();

        await engine.start();

        expect(engine.isRunning()).toBe(true);
    }, 30_000);

    it("creates a browser page", async () => {
        engine = new BrowserEngine();

        const session = await engine.start();

        expect(session.page).toBeDefined();
    }, 30_000);

    it("navigates to a website", async () => {
        engine = new BrowserEngine();

        const result = await engine.navigate(url);

        expect(result.statusCode).toBe(200);
        expect(result.title).toBe("WCAG Test Fixture");
    }, 30_000);

    it("supports DOM access", async () => {
        engine = new BrowserEngine();

        await engine.navigate(url);

        const { page } = engine.getSession();

        expect(
            await page.locator("h1").textContent()
        ).toBe("Accessibility Test");

        expect(
            await page.locator("img").count()
        ).toBe(1);
    }, 30_000);

    it("supports custom viewports", async () => {
        engine = new BrowserEngine({
            viewport: {
                width: 390,
                height: 844
            }
        });

        const { page } = await engine.start();

        expect(page.viewportSize()).toEqual({
            width: 390,
            height: 844
        });
    }, 30_000);

    it("rejects HTTP errors", async () => {
        engine = new BrowserEngine();

        await expect(
            engine.navigate(`${url}/missing`)
        ).rejects.toThrow("HTTP 404");
    }, 30_000);

    it("records navigation duration", async () => {
        engine = new BrowserEngine();

        const result = await engine.navigate(url);

        expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }, 30_000);

    it("closes Chromium", async () => {
        engine = new BrowserEngine();

        await engine.start();
        await engine.close();

        expect(engine.isRunning()).toBe(false);
    }, 30_000);

    it("supports repeated start calls", async () => {
        engine = new BrowserEngine();

        const first = await engine.start();
        const second = await engine.start();

        expect(first).toBe(second);
    }, 30_000);

    it("supports repeated close calls", async () => {
        engine = new BrowserEngine();

        await engine.start();
        await engine.close();

        await expect(
            engine.close()
        ).resolves.toBeUndefined();
    }, 30_000);
});