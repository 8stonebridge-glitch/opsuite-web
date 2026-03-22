"use strict";
/**
 * AES Planning — Promotion Engine
 *
 * Pure logic that evaluates typed packages against promotion gates and hard vetoes.
 * No I/O, no side effects. Takes AppSpec + FeatureSpec[], returns PromotionEvaluation.
 *
 * Pattern follows: policy/hard-veto-engine.ts
 *
 * Rules from CLAUDE.md §7:
 * - A package promotes only if all gates pass and no hard veto triggers
 * - No model should be able to argue its way through a weak spec
 * - Promotion is earned by passing gates, not by sounding persuasive
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePromotionGates = evaluatePromotionGates;
exports.evaluateSpecHardVetoes = evaluateSpecHardVetoes;
exports.evaluatePromotion = evaluatePromotion;
exports.computeDependencyOrder = computeDependencyOrder;
const artifact_meta_1 = require("../registry/artifact-meta");
// ─── ID Generation ─────────────────────────────────────────────────────────────
let evalCounter = 0;
function generateEvaluationId() {
    const prefix = artifact_meta_1.ARTIFACT_META.promotion_evaluation.prefix;
    const ts = Date.now().toString(36);
    const seq = (++evalCounter).toString(36).padStart(4, "0");
    return `${prefix}-${ts}-${seq}`;
}
// ─── Topological Sort ──────────────────────────────────────────────────────────
function topologicalSort(features) {
    const ids = new Set(features.map((f) => f.feature_id));
    const missingDeps = [];
    // Check all deps reference existing features
    for (const f of features) {
        for (const dep of f.dependencies) {
            if (!ids.has(dep)) {
                missingDeps.push(`${f.feature_id} depends on unknown ${dep}`);
            }
        }
    }
    if (missingDeps.length > 0) {
        return { order: [], hasCycle: false, missingDeps };
    }
    // Kahn's algorithm
    const inDegree = new Map();
    const adjList = new Map();
    for (const f of features) {
        inDegree.set(f.feature_id, 0);
        adjList.set(f.feature_id, []);
    }
    for (const f of features) {
        for (const dep of f.dependencies) {
            inDegree.set(f.feature_id, (inDegree.get(f.feature_id) ?? 0) + 1);
            adjList.get(dep)?.push(f.feature_id);
        }
    }
    const queue = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0)
            queue.push(id);
    }
    const order = [];
    while (queue.length > 0) {
        const current = queue.shift();
        order.push(current);
        for (const neighbor of adjList.get(current) ?? []) {
            const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
            inDegree.set(neighbor, newDeg);
            if (newDeg === 0)
                queue.push(neighbor);
        }
    }
    return {
        order,
        hasCycle: order.length !== features.length,
        missingDeps: [],
    };
}
// ─── Gate Evaluators ───────────────────────────────────────────────────────────
function evaluateCoverageGate(app, features) {
    const issues = [];
    // Every feature should have at least one backend surface
    for (const f of features) {
        if (f.backend_surfaces.length === 0 && f.frontend_surfaces.length === 0) {
            issues.push(`${f.feature_id} has no backend or frontend surfaces`);
        }
    }
    // Every role should be referenced by at least one feature
    for (const role of app.roles) {
        const covered = features.some((f) => f.user_roles.includes(role));
        if (!covered) {
            issues.push(`Role "${role}" is not referenced by any feature`);
        }
    }
    return {
        gate: "COVERAGE",
        passed: issues.length === 0,
        message: issues.length === 0
            ? "All features have surfaces and all roles are covered"
            : `Coverage gaps: ${issues.join("; ")}`,
        details: issues.length > 0 ? { issues } : undefined,
    };
}
function evaluateDependencyGate(features) {
    const { order, hasCycle, missingDeps } = topologicalSort(features);
    if (missingDeps.length > 0) {
        return {
            gate: "DEPENDENCY",
            passed: false,
            message: `Missing dependencies: ${missingDeps.join("; ")}`,
            details: { missingDeps },
        };
    }
    if (hasCycle) {
        return {
            gate: "DEPENDENCY",
            passed: false,
            message: "Circular dependency detected in feature graph",
            details: { order },
        };
    }
    return {
        gate: "DEPENDENCY",
        passed: true,
        message: `Dependency order valid: ${order.join(" → ")}`,
        details: { order },
    };
}
function evaluateFlowGate(features) {
    const issues = [];
    for (const f of features) {
        const hasMandatoryCriterion = f.acceptance_criteria.some((c) => c.mandatory);
        if (!hasMandatoryCriterion) {
            issues.push(`${f.feature_id} has no mandatory acceptance criteria`);
        }
    }
    return {
        gate: "FLOW",
        passed: issues.length === 0,
        message: issues.length === 0
            ? "All features have mandatory acceptance criteria"
            : `Flow gaps: ${issues.join("; ")}`,
        details: issues.length > 0 ? { issues } : undefined,
    };
}
function evaluateBuildabilityGate(features) {
    const issues = [];
    for (const f of features) {
        if (!f.feature_type || f.feature_type.trim() === "") {
            issues.push(`${f.feature_id} has no feature_type`);
        }
        if (!f.description || f.description.trim().length < 10) {
            issues.push(`${f.feature_id} has insufficient description (< 10 chars)`);
        }
    }
    return {
        gate: "BUILDABILITY",
        passed: issues.length === 0,
        message: issues.length === 0
            ? "All features are concrete enough to build"
            : `Buildability issues: ${issues.join("; ")}`,
        details: issues.length > 0 ? { issues } : undefined,
    };
}
function evaluateContradictionGate(features) {
    const issues = [];
    const entityOwners = new Map();
    for (const f of features) {
        for (const entity of f.data_entities) {
            const owners = entityOwners.get(entity.name) ?? [];
            if (entity.owner_feature_id) {
                owners.push(entity.owner_feature_id);
            }
            entityOwners.set(entity.name, owners);
        }
    }
    for (const [entity, owners] of entityOwners) {
        const uniqueOwners = [...new Set(owners)];
        if (uniqueOwners.length > 1) {
            issues.push(`Data entity "${entity}" claimed by multiple owners: ${uniqueOwners.join(", ")}`);
        }
    }
    return {
        gate: "CONTRADICTION",
        passed: issues.length === 0,
        message: issues.length === 0
            ? "No contradictions found"
            : `Contradictions: ${issues.join("; ")}`,
        details: issues.length > 0 ? { issues } : undefined,
    };
}
function evaluateConfidenceThresholdGate(features) {
    const lowConfidence = [];
    for (const f of features) {
        if (f.confidence_summary.overall < 0.6) {
            lowConfidence.push(`${f.feature_id} confidence ${f.confidence_summary.overall.toFixed(2)} < 0.60`);
        }
    }
    return {
        gate: "CONFIDENCE_THRESHOLD",
        passed: lowConfidence.length === 0,
        message: lowConfidence.length === 0
            ? "All features meet confidence threshold (≥ 0.60)"
            : `Low confidence: ${lowConfidence.join("; ")}`,
        details: lowConfidence.length > 0 ? { lowConfidence } : undefined,
    };
}
function evaluateMissingQuestionsGate(app, features) {
    const issues = [];
    if (app.open_questions.length > 0) {
        issues.push(`App has ${app.open_questions.length} open questions: ${app.open_questions.join("; ")}`);
    }
    for (const f of features) {
        if (f.missing_questions.length > 3) {
            issues.push(`${f.feature_id} has ${f.missing_questions.length} missing questions (max 3)`);
        }
    }
    return {
        gate: "MISSING_QUESTIONS",
        passed: issues.length === 0,
        message: issues.length === 0
            ? "No critical missing questions"
            : `Missing questions: ${issues.join("; ")}`,
        details: issues.length > 0 ? { issues } : undefined,
    };
}
// ─── Public API ────────────────────────────────────────────────────────────────
/**
 * Evaluate all promotion gates for an app + feature package.
 */
function evaluatePromotionGates(app, features) {
    return [
        evaluateCoverageGate(app, features),
        evaluateDependencyGate(features),
        evaluateFlowGate(features),
        evaluateBuildabilityGate(features),
        evaluateContradictionGate(features),
        evaluateConfidenceThresholdGate(features),
        evaluateMissingQuestionsGate(app, features),
    ];
}
/**
 * Evaluate hard vetoes against a feature package.
 * Any blocking veto prevents promotion.
 */
function evaluateSpecHardVetoes(features) {
    const vetoes = [];
    const featureIds = new Set(features.map((f) => f.feature_id));
    for (const f of features) {
        // AUTH_AMBIGUITY: empty auth requirements
        if (f.auth_requirements.length === 0) {
            vetoes.push({
                code: "AUTH_AMBIGUITY",
                feature_id: f.feature_id,
                message: `${f.feature_id} has no auth requirements defined`,
                blocking: true,
            });
        }
        // PERMISSION_AMBIGUITY: role_based auth with no roles
        for (const auth of f.auth_requirements) {
            if (auth.type === "role_based" &&
                (!auth.roles || auth.roles.length === 0)) {
                vetoes.push({
                    code: "PERMISSION_AMBIGUITY",
                    feature_id: f.feature_id,
                    message: `${f.feature_id} declares role_based auth but lists no roles`,
                    blocking: true,
                });
            }
        }
        // MISSING_DATA_OWNERSHIP: data entity with no owner or owner not in features
        for (const entity of f.data_entities) {
            if (!entity.owner_feature_id) {
                vetoes.push({
                    code: "MISSING_DATA_OWNERSHIP",
                    feature_id: f.feature_id,
                    message: `Data entity "${entity.name}" in ${f.feature_id} has no owner`,
                    blocking: true,
                });
            }
            else if (!featureIds.has(entity.owner_feature_id)) {
                vetoes.push({
                    code: "MISSING_DATA_OWNERSHIP",
                    feature_id: f.feature_id,
                    message: `Data entity "${entity.name}" owner "${entity.owner_feature_id}" does not exist`,
                    blocking: true,
                });
            }
        }
        // UNDEFINED_DESTRUCTIVE_BEHAVIOR: irreversible + not audit logged
        for (const action of f.destructive_actions) {
            if (!action.reversible && !action.audit_logged) {
                vetoes.push({
                    code: "UNDEFINED_DESTRUCTIVE_BEHAVIOR",
                    feature_id: f.feature_id,
                    message: `Destructive action "${action.action}" in ${f.feature_id} is irreversible and not audit-logged`,
                    blocking: true,
                });
            }
        }
        // UNRESOLVED_DEPENDENCY_CONFLICT: depends on REJECTED or BLOCKED feature
        for (const dep of f.dependencies) {
            const depFeature = features.find((df) => df.feature_id === dep);
            if (depFeature &&
                (depFeature.promotion_status === "REJECTED" ||
                    depFeature.promotion_status === "BLOCKED")) {
                vetoes.push({
                    code: "UNRESOLVED_DEPENDENCY_CONFLICT",
                    feature_id: f.feature_id,
                    message: `${f.feature_id} depends on ${dep} which is ${depFeature.promotion_status}`,
                    blocking: true,
                });
            }
        }
        // INCOMPLETE_CRITICAL_ACCEPTANCE_TESTS: mandatory criteria with no linked test
        for (const criterion of f.acceptance_criteria) {
            if (criterion.mandatory) {
                const hasLinkedTest = f.test_cases.some((t) => t.linked_criterion_id === criterion.id);
                if (!hasLinkedTest) {
                    vetoes.push({
                        code: "INCOMPLETE_CRITICAL_ACCEPTANCE_TESTS",
                        feature_id: f.feature_id,
                        message: `Mandatory criterion "${criterion.id}" in ${f.feature_id} has no linked test case`,
                        blocking: true,
                    });
                }
            }
        }
    }
    return vetoes;
}
/**
 * Full promotion evaluation: gates + vetoes → decision.
 * Optionally incorporates a verification report.
 */
function evaluatePromotion(app, features, verificationReport) {
    const gates = evaluatePromotionGates(app, features);
    const hardVetoes = evaluateSpecHardVetoes(features);
    const allGatesPassed = gates.every((g) => g.passed);
    const hardBlocked = hardVetoes.some((v) => v.blocking);
    // If verification report recommends REJECT, add to reasons
    const reasons = [];
    if (!allGatesPassed) {
        const failedGates = gates
            .filter((g) => !g.passed)
            .map((g) => g.gate);
        reasons.push(`Failed gates: ${failedGates.join(", ")}`);
    }
    if (hardBlocked) {
        const vetoSummary = hardVetoes
            .filter((v) => v.blocking)
            .map((v) => `${v.code} (${v.feature_id})`)
            .join(", ");
        reasons.push(`Hard vetoes: ${vetoSummary}`);
    }
    if (verificationReport?.recommendation === "REJECT") {
        reasons.push(`Verification rejected: ${verificationReport.notes.join("; ")}`);
    }
    let decision;
    if (hardBlocked) {
        decision = "BLOCKED";
    }
    else if (!allGatesPassed) {
        decision = "REJECTED";
    }
    else if (verificationReport?.recommendation === "REJECT") {
        decision = "REJECTED";
    }
    else {
        decision = "PROMOTED";
    }
    return {
        evaluation_id: generateEvaluationId(),
        app_id: app.app_id,
        gates,
        hard_vetoes: hardVetoes,
        all_gates_passed: allGatesPassed,
        hard_blocked: hardBlocked,
        decision,
        reasons,
        evaluated_at: new Date().toISOString(),
    };
}
/**
 * Compute topological dependency order for a set of features.
 * Exported for use by other planning modules.
 */
function computeDependencyOrder(features) {
    return topologicalSort(features);
}
//# sourceMappingURL=promotion-engine.js.map