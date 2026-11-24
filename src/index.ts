import { runCLI } from "./cli/index.js";

try {
    process.exitCode = await runCLI();
} catch (error) {
    console.error(
        error instanceof Error
            ? error.message
            : String(error)
    );

    process.exitCode = 2;
}