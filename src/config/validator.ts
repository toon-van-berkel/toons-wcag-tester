import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

import type { WCAGConfig } from "../types/index.js";

const schemaPath = new URL(
    "../../config/schema.json",
    import.meta.url
);

const schema = JSON.parse(
    readFileSync(schemaPath, "utf-8")
);

const ajv = new Ajv2020.default({
    allErrors: true,
    strict: true
});

const validate = ajv.compile<WCAGConfig>(schema);

export function validateConfig(
    config: unknown
): asserts config is WCAGConfig {
    if (!validate(config)) {
        const errors = ajv.errorsText(validate.errors, {
            separator: "\n"
        });

        throw new Error(
            `Invalid WCAG configuration:\n${errors}`
        );
    }
}