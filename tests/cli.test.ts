import {
    describe,
    expect,
    it
} from "vitest";

import {
    parseArguments
} from "../src/cli/arguments.js";

describe("CLI Arguments", () => {
    it("parses a website URL", () => {
        const args = parseArguments([
            "--url",
            "https://example.com"
        ]);

        expect(args.url)
            .toBe("https://example.com/");
    });

    it("parses a target level", () => {
        expect(
            parseArguments(["--target", "AA"]).target
        ).toBe("AA");
    });

    it("rejects invalid target levels", () => {
        expect(() => {
            parseArguments(["--target", "AAAA"]);
        }).toThrow();
    });

    it("parses a category", () => {
        expect(
            parseArguments([
                "--category",
                "text-alternatives"
            ]).category
        ).toBe("text-alternatives");
    });

    it("rejects unknown categories", () => {
        expect(() => {
            parseArguments([
                "--category",
                "unknown"
            ]);
        }).toThrow();
    });

    it("uses the default output directory", () => {
        expect(
            parseArguments([]).output
        ).toBe("reports");
    });

    it("supports custom output directories", () => {
        expect(
            parseArguments([
                "--output",
                "custom-reports"
            ]).output
        ).toBe("custom-reports");
    });

    it("supports help", () => {
        expect(
            parseArguments(["--help"]).help
        ).toBe(true);
    });

    it("rejects invalid URLs", () => {
        expect(() => {
            parseArguments(["--url", "invalid"]);
        }).toThrow();
    });

    it("supports URLs without a protocol", () => {
        expect(
            parseArguments(["--url", "toonvb.com"]).url
        ).toBe("https://toonvb.com/");
    });

    it("rejects unsupported protocols", () => {
        expect(() => {
            parseArguments([
                "--url",
                "file:///example.html"
            ]);
        }).toThrow();
    });
});