export interface ViewportReference {
    width: number;
    height: number;
    deviceScaleFactor?: number;
}

export interface PageReference {
    id: string;

    url: string;
    requestedUrl?: string;
    title?: string;

    viewport?: ViewportReference;

    browser?: string;
    browserVersion?: string;

    locale?: string;
    colorScheme?: "light" | "dark" | "no-preference";
    reducedMotion?: "reduce" | "no-preference";

    state?: string;

    capturedAt: string;
}