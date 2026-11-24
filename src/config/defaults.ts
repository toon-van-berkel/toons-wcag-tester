import { readFileSync } from "node:fs";
import type { WCAGConfig } from "../types/index.js";

const defaultPath = new URL(
    "../../config/default.json",
    import.meta.url
);

export function getDefaultConfig(): WCAGConfig {
    return JSON.parse(
        readFileSync(defaultPath, "utf-8")
    ) as WCAGConfig;
}