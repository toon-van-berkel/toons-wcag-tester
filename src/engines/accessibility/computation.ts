import type {
    AXRelatedNode,
    AXValue
} from "./types.js";

export type AXTextState =
    | "non_empty"
    | "empty"
    | "missing"
    | "unavailable";

export type AXComputationSourceStatus =
    | "contributing"
    | "superseded"
    | "invalid"
    | "unused";

export interface AXComputationSource {
    index: number;

    type: string;

    status: AXComputationSourceStatus;

    attribute: string | null;
    nativeSource: string | null;

    value: string | null;
    attributeValue: string | null;

    relatedNodes: AXRelatedNode[];

    invalidReason: string | null;

    raw: unknown;
}

export interface AXTextComputation {
    state: AXTextState;

    rawText: string | null;
    normalizedText: string | null;

    hasText: boolean;

    sources: AXComputationSource[];

    contributingSources:
        AXComputationSource[];

    referencedNodes: AXRelatedNode[];

    computation: AXValue | null;
}

export function normalizeAXText(
    text: string
): string {
    return text
        .replace(/\s+/gu, " ")
        .trim();
}

function asRecord(
    value: unknown
): Record<string, unknown> | null {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        return null;
    }

    return value as Record<string, unknown>;
}

function asString(
    value: unknown
): string | null {
    return typeof value === "string"
        ? value
        : null;
}

function readProtocolValue(
    value: unknown
): string | null {
    const record = asRecord(value);

    return asString(
        record?.["value"]
    );
}

export function readAXRelatedNodes(
    value: unknown
): AXRelatedNode[] {
    const record = asRecord(value);

    const relatedNodes =
        record?.["relatedNodes"];

    if (!Array.isArray(relatedNodes)) {
        return [];
    }

    const results: AXRelatedNode[] = [];

    for (const item of relatedNodes) {
        const node = asRecord(item);

        if (!node) {
            continue;
        }

        const backendDOMNodeId =
            node["backendDOMNodeId"];

        if (
            typeof backendDOMNodeId !== "number" ||
            !Number.isSafeInteger(backendDOMNodeId)
        ) {
            continue;
        }

        results.push({
            backendDOMNodeId,

            idref: asString(
                node["idref"]
            ),

            text: asString(
                node["text"]
            )
        });
    }

    return results;
}

export function deduplicateAXReferences(
    nodes: readonly AXRelatedNode[]
): AXRelatedNode[] {
    const results: AXRelatedNode[] = [];

    const seen = new Set<string>();

    for (const node of nodes) {
        const key = JSON.stringify([
            node.backendDOMNodeId,
            node.idref,
            node.text
        ]);

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);

        results.push(node);
    }

    return results;
}

export function normalizeAXSource(
    source: unknown,
    index: number
): AXComputationSource {
    const record = asRecord(source);

    const value =
        readProtocolValue(
            record?.["value"]
        );

    const attributeValue =
        readProtocolValue(
            record?.["attributeValue"]
        );

    let status: AXComputationSourceStatus =
        "unused";

    if (record?.["invalid"] === true) {
        status = "invalid";

    } else if (
        record?.["superseded"] === true
    ) {
        status = "superseded";

    } else if (value !== null) {
        status = "contributing";
    }

    const relatedNodes =
        deduplicateAXReferences([
            ...readAXRelatedNodes(
                record?.["value"]
            ),

            ...readAXRelatedNodes(
                record?.["attributeValue"]
            ),

            ...readAXRelatedNodes(
                record?.["nativeSourceValue"]
            )
        ]);

    return {
        index,

        type:
            asString(
                record?.["type"]
            ) ?? "unknown",

        status,

        attribute:
            asString(
                record?.["attribute"]
            ),

        nativeSource:
            asString(
                record?.["nativeSource"]
            ),

        value,

        attributeValue,

        relatedNodes,

        invalidReason:
            asString(
                record?.["invalidReason"]
            ),

        raw: source
    };
}

export function computeAXText(
    computation: AXValue | null
): AXTextComputation {
    const sources = (
        computation?.sources ?? []
    ).map(
        (source, index) =>
            normalizeAXSource(
                source,
                index
            )
    );

    const contributingSources =
        sources.filter(
            source =>
                source.status ===
                "contributing"
        );

    const referencedNodes =
        deduplicateAXReferences([
            ...(computation?.relatedNodes ?? []),

            ...contributingSources.flatMap(
                source =>
                    source.relatedNodes
            )
        ]);

    const rawText =
        typeof computation?.value === "string"
            ? computation.value
            : null;

    const normalizedText =
        rawText === null
            ? null
            : normalizeAXText(rawText);

    const hasText =
        normalizedText !== null &&
        normalizedText.length > 0;

    const state: AXTextState =
        rawText === null
            ? "missing"
            : hasText
                ? "non_empty"
                : "empty";

    return {
        state,

        rawText,
        normalizedText,
        hasText,

        sources,
        contributingSources,
        referencedNodes,

        computation
    };
}