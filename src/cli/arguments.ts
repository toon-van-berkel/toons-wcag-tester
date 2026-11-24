import { parseArgs } from "node:util";

import type {
    WCAGCategory,
    WCAGLevel
} from "../types/index.js";

import { categories } from "../registry/index.js";

export interface CLIArguments {
    url?: string;
    config?: string;
    category?: WCAGCategory;
    target?: WCAGLevel;
    output: string;
    help: boolean;
}

export function parseArguments(
    args = process.argv.slice(2)
): CLIArguments {
    const { values } = parseArgs({
        args,
        strict: true,
        allowPositionals: false,

        options: {
            url: {
                type: "string",
                short: "u"
            },
            config: {
                type: "string",
                short: "c"
            },
            category: {
                type: "string"
            },
            target: {
                type: "string",
                short: "t"
            },
            output: {
                type: "string",
                short: "o",
                default: "reports"
            },
            help: {
                type: "boolean",
                short: "h",
                default: false
            }
        }
    });

    const result: CLIArguments = {
        output: values.output ?? "reports",
        help: values.help ?? false
    };

    if (values.url !== undefined) {
        const url = new URL(values.url);

        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Only HTTP and HTTPS URLs are supported.");
        }

        result.url = url.href;
    }

    if (values.config !== undefined) {
        result.config = values.config;
    }

    if (values.target !== undefined) {
        if (!["A", "AA", "AAA"].includes(values.target)) {
            throw new Error(
                `Invalid WCAG target: ${values.target}`
            );
        }

        result.target = values.target as WCAGLevel;
    }

    if (values.category !== undefined) {
        if (!Object.hasOwn(categories, values.category)) {
            throw new Error(
                `Unknown WCAG category: ${values.category}`
            );
        }

        result.category = values.category as WCAGCategory;
    }

    return result;
}