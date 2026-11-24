import type {
    WCAGCriterion,
    RuleResult,
    TestStatus,
    CriterionCoverage
} from "../types/index.js";

const resolvedStatuses = new Set<TestStatus>([
    "pass",
    "fail",
    "not_applicable"
]);

export function evaluateCoverage(
    criterion: WCAGCriterion,
    results: readonly RuleResult[]
): CriterionCoverage {
    const plan = criterion.coveragePlan;

    const requiredRuleIds = [
        ...new Set(plan?.requiredRuleIds ?? [])
    ];

    const resultMap = new Map(
        results.map(result => [result.ruleId, result])
    );

    const missingRuleIds: string[] = [];
    const unresolvedRuleIds: string[] = [];

    let executedRules = 0;
    let resolvedRules = 0;
    let passingRules = 0;
    let failingRules = 0;
    let pendingRules = 0;

    for (const ruleId of requiredRuleIds) {
        const result = resultMap.get(ruleId);

        if (!result) {
            missingRuleIds.push(ruleId);
            pendingRules++;
            continue;
        }

        if (
            result.status !== "disabled" &&
            result.status !== "not_tested"
        ) {
            executedRules++;
        }

        if (result.status === "pass") {
            passingRules++;
        }

        if (result.status === "fail") {
            failingRules++;
        }

        if (resolvedStatuses.has(result.status)) {
            resolvedRules++;
        } else {
            unresolvedRuleIds.push(ruleId);
            pendingRules++;
        }
    }

    let status: CriterionCoverage["status"] =
        "not_implemented";

    if (plan && requiredRuleIds.length > 0) {
        status =
            resolvedRules === requiredRuleIds.length
                ? "complete"
                : "partial";
    }

    return {
        status,

        ...(plan
            ? { planVersion: plan.version }
            : {}),

        requiredRules: requiredRuleIds.length,
        executedRules,
        resolvedRules,

        passingRules,
        failingRules,
        pendingRules,

        missingRuleIds,
        unresolvedRuleIds
    };
}

export function applyCoverageStatus(
    status: TestStatus,
    coverage: CriterionCoverage
): TestStatus {
    if (
        coverage.status !== "complete" &&
        (
            status === "pass" ||
            status === "not_applicable"
        )
    ) {
        return "not_tested";
    }

    return status;
}