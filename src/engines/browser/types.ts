import type {
    Browser,
    BrowserContext,
    Page
} from "playwright";

export interface BrowserViewport {
    width: number;
    height: number;
}

export interface BrowserOptions {
    headless?: boolean;
    viewport?: BrowserViewport;
    navigationTimeoutMs?: number;
    actionTimeoutMs?: number;
    locale?: string;
    colorScheme?: "light" | "dark" | "no-preference";
    reducedMotion?: "reduce" | "no-preference";
    deviceScaleFactor?: number;
    javaScriptEnabled?: boolean;
}

export interface BrowserSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}

export interface NavigationResult {
    requestedUrl: string;
    finalUrl: string;
    statusCode: number | null;
    title: string;
    durationMs: number;
}