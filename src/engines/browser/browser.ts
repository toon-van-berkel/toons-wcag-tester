import { chromium } from "playwright";
import { performance } from "node:perf_hooks";

import type {
    BrowserOptions,
    BrowserSession,
    NavigationResult
} from "./types.js";

import { defaultBrowserOptions } from "./defaults.js";

export class BrowserEngine {
    private session: BrowserSession | undefined;

    private readonly options: Required<BrowserOptions>;

    constructor(options: BrowserOptions = {}) {
        this.options = {
            ...defaultBrowserOptions,
            ...options,

            viewport: {
                ...defaultBrowserOptions.viewport,
                ...options.viewport
            }
        };
    }

    async start(): Promise<BrowserSession> {
        if (this.session) {
            return this.session;
        }

        const browser = await chromium.launch({
            headless: this.options.headless
        });

        try {
            const context = await browser.newContext({
                viewport: this.options.viewport,
                locale: this.options.locale,
                colorScheme: this.options.colorScheme,
                reducedMotion: this.options.reducedMotion,
                deviceScaleFactor: this.options.deviceScaleFactor,
                javaScriptEnabled: this.options.javaScriptEnabled
            });

            context.setDefaultTimeout(
                this.options.actionTimeoutMs
            );

            context.setDefaultNavigationTimeout(
                this.options.navigationTimeoutMs
            );

            const page = await context.newPage();

            this.session = {
                browser,
                context,
                page
            };

            return this.session;

        } catch (error) {
            await browser.close();
            throw error;
        }
    }

    async navigate(url: string): Promise<NavigationResult> {
        const session = await this.start();
        const start = performance.now();

        const response = await session.page.goto(url, {
            waitUntil: "load"
        });

        const statusCode = response?.status() ?? null;

        if (statusCode !== null && statusCode >= 400) {
            throw new Error(
                `Navigation failed: HTTP ${statusCode} (${url})`
            );
        }

        return {
            requestedUrl: url,
            finalUrl: session.page.url(),
            statusCode,
            title: await session.page.title(),
            durationMs: performance.now() - start
        };
    }

    getSession(): BrowserSession {
        if (!this.session) {
            throw new Error("Browser has not been started.");
        }

        return this.session;
    }

    isRunning(): boolean {
        return this.session?.browser.isConnected() ?? false;
    }

    async close(): Promise<void> {
        if (!this.session) {
            return;
        }

        const session = this.session;

        this.session = undefined;

        try {
            await session.context.close();
        } finally {
            await session.browser.close();
        }
    }
}