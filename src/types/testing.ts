export type TestMode =
    | "automated"
    | "heuristic"
    | "assisted"
    | "manual";

export type TestStatus =
    | "pass"
    | "fail"
    | "warning"
    | "review_required"
    | "not_applicable"
    | "not_tested"
    | "disabled"
    | "error";

export type TestSeverity =
    | "critical"
    | "serious"
    | "moderate"
    | "minor";