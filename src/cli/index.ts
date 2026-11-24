import { loadConfig } from "../config/index.js";

import { runAudit, runCategory } from "../core/index.js";

import {
  writeJsonReport,
  printAuditResult,
  printCategoryResult,
} from "../reporting/index.js";

import { parseArguments } from "./arguments.js";

import { BrowserEngine } from "../engines/index.js";

function printHelp(): void {
  console.log(`
Toon's WCAG Tester
WCAG 2.2 Accessibility Testing Framework

Usage:
    wcag-tester --url <url> [options]

Options:
    -u, --url        Website URL
    -c, --config     Configuration file
        --category   Run a specific WCAG category
    -t, --target     A, AA or AAA
    -o, --output     Report output directory
    -h, --help       Show help

Examples:
    pnpm start --url https://example.com
    pnpm start --url https://example.com --target AA
    pnpm start --url https://example.com --category text-alternatives
`);
}

export async function runCLI(): Promise<number> {
  const args = parseArguments();

  if (args.help) {
    printHelp();
    return 0;
  }

  if (!args.url) {
    printHelp();
    console.error("Missing required argument: --url");
    return 2;
  }

  const config = loadConfig(args.config);

  if (args.target !== undefined) {
    config.target = args.target;
  }

  const browser = new BrowserEngine();

  try {
    const session = await browser.start();

    console.log("Starting browser...");
    console.log(`Opening website: ${args.url}`);

    const navigation = await browser.navigate(args.url);

    console.log(`Page title: ${navigation.title}`);
    console.log(`Final URL: ${navigation.finalUrl}`);
    console.log(`HTTP status: ${navigation.statusCode}`);
    console.log(`Navigation duration: ${navigation.durationMs.toFixed(2)} ms`);

    const context = {
      url: navigation.finalUrl,
      page: session.page,
    };

    if (args.category) {
      const result = await runCategory(args.category, context, config);

      printCategoryResult(result);

      const filepath = writeJsonReport(
        result,
        args.output,
        `${args.category}.json`,
      );

      console.log(`Report saved: ${filepath}`);

      return getExitCode(result.status);
    }

    const result = await runAudit(context, config);

    printAuditResult(result);

    const filepath = writeJsonReport(result, args.output);

    console.log(`Report saved: ${filepath}`);

    return getExitCode(result.status);
  } finally {
    await browser.close();
  }
}

function getExitCode(status: string): number {
  switch (status) {
    case "pass":
    case "not_applicable":
    case "disabled":
      return 0;

    case "fail":
      return 1;

    case "error":
      return 2;

    case "warning":
    case "review_required":
    case "not_tested":
      return 3;

    default:
      return 2;
  }
}
