import type { TestStatus } from "../types/index.js";

export function aggregateStatus(
    statuses: readonly TestStatus[]
): TestStatus {
    if (statuses.length === 0) {
        return "not_tested";
    }

    const priority: TestStatus[] = [
        "fail",
        "error",
        "review_required",
        "warning",
        "not_tested",
        "disabled",
        "pass",
        "not_applicable"
    ];

    return priority.find(
        status => statuses.includes(status)
    ) ?? "not_tested";
}