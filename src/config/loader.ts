import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { WCAGConfig } from "../types/index.js";

import { getDefaultConfig } from "./defaults.js";
import { validateConfig } from "./validator.js";

export function mergeConfig(
    defaults: WCAGConfig,
    custom: WCAGConfig
): WCAGConfig {
    return {
        ...defaults,
        ...custom,

        principles: {
            ...defaults.principles,
            ...custom.principles
        },

        categories: {
            ...defaults.categories,
            ...custom.categories
        },

        criteria: {
            ...defaults.criteria,
            ...custom.criteria
        },

        rules: {
            ...defaults.rules,
            ...custom.rules
        }
    };
}

export function loadConfig(
    configPath?: string
): WCAGConfig {
    const defaults = getDefaultConfig();

    validateConfig(defaults);

    const path = resolve(
        configPath ?? "wcag.config.json"
    );

    if (!existsSync(path)) {
        if (configPath !== undefined) {
            throw new Error(
                `Configuration file not found: ${path}`
            );
        }

        return defaults;
    }

    const custom: unknown = JSON.parse(
        readFileSync(path, "utf-8")
    );

    validateConfig(custom);

    const config = mergeConfig(defaults, custom);

    validateConfig(config);

    return config;
}