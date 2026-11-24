import {
    mkdirSync,
    writeFileSync
} from "node:fs";

import {
    resolve,
    join
} from "node:path";

import type {
    AuditResult,
    CategoryResult
} from "../types/index.js";

export function writeJsonReport(
    result: AuditResult | CategoryResult,
    outputDirectory: string,
    filename = "results.json"
): string {
    const directory = resolve(outputDirectory);

    mkdirSync(directory, {
        recursive: true
    });

    const filepath = join(directory, filename);

    writeFileSync(
        filepath,
        JSON.stringify(result, null, 4),
        "utf-8"
    );

    return filepath;
}