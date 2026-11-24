import type { BrowserOptions } from "./types.js";

export const defaultBrowserOptions: Required<BrowserOptions> = {
    headless: true,

    viewport: {
        width: 1440,
        height: 900
    },

    navigationTimeoutMs: 30_000,
    actionTimeoutMs: 10_000,

    locale: "en-GB",
    colorScheme: "light",
    reducedMotion: "no-preference",

    deviceScaleFactor: 1,
    javaScriptEnabled: true
};