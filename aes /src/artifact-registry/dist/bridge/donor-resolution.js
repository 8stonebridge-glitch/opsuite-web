"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDonorBridgeInputs = resolveDonorBridgeInputs;
const types_1 = require("../types");
function stringProp(properties, key) {
    const value = properties[key];
    return typeof value === "string" && value.trim() !== "" ? value : null;
}
function stringListProp(properties, key) {
    const value = properties[key];
    return Array.isArray(value)
        ? value.filter((item) => typeof item === "string")
        : [];
}
function isEnforceable(node) {
    return node.properties["enforceable"] === true;
}
function isCanonical(node) {
    return node.properties["promotion_stage"] === "CANONICAL";
}
function uniqueStrings(values) {
    return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim() !== "")));
}
function criterionId(prefix, index) {
    const safePrefix = prefix.replace(/[^A-Za-z0-9]+/g, "-").toUpperCase();
    return `AC-DONOR-${safePrefix}-${index + 1}`;
}
function testCaseId(prefix, index) {
    const safePrefix = prefix.replace(/[^A-Za-z0-9]+/g, "-").toUpperCase();
    return `TC-DONOR-${safePrefix}-${index + 1}`;
}
const VALID_AUTHORITY_TIERS = new Set([
    "CANONICAL", "VERIFIED", "VERIFIED_RESTRICTED", "PROVISIONAL", "DONOR_RAW", "UNTESTED",
]);
function nodeAuthorityTier(node) {
    const tier = node.properties["authority_tier"];
    if (typeof tier === "string" && VALID_AUTHORITY_TIERS.has(tier)) {
        return tier;
    }
    if (isCanonical(node))
        return "CANONICAL";
    return "DONOR_RAW";
}
function edgeTouches(edge, nodeId) {
    return edge.from_node_id === nodeId || edge.to_node_id === nodeId;
}
function oppositeNodeId(edge, nodeId) {
    if (edge.from_node_id === nodeId) {
        return edge.to_node_id;
    }
    if (edge.to_node_id === nodeId) {
        return edge.from_node_id;
    }
    return null;
}
function resolveDonorBridgeInputs(featureId, referencedNodes, referencedEdges) {
    const nodeById = new Map(referencedNodes.map((node) => [node.node_id, node]));
    const featureNode = referencedNodes.find((node) => node.label === "FeatureSpec" &&
        stringProp(node.properties, "feature_id") === featureId) ?? null;
    const featureTypeNodeId = (featureNode
        ? referencedEdges
            .filter((edge) => edge.relationship === "USES_FEATURE_TYPE" &&
            edge.from_node_id === featureNode.node_id)
            .map((edge) => edge.to_node_id)
            .find((nodeId) => nodeById.get(nodeId)?.label === "FeatureType")
        : null) ??
        referencedNodes.find((node) => node.label === "FeatureType")?.node_id ??
        null;
    const featureTypeNode = featureTypeNodeId
        ? nodeById.get(featureTypeNodeId) ?? null
        : null;
    const featureClass = featureTypeNode && stringProp(featureTypeNode.properties, "feature_class");
    const bundleNodes = referencedNodes
        .filter((node) => node.label === "ValidatorBundle" &&
        isCanonical(node) &&
        isEnforceable(node) &&
        (featureTypeNodeId === null ||
            referencedEdges.some((edge) => edge.relationship === "VALIDATES_FEATURE" &&
                edge.from_node_id === node.node_id &&
                edge.to_node_id === featureTypeNodeId)))
        .sort((left, right) => left.node_id.localeCompare(right.node_id));
    const bundles = bundleNodes.map((node) => ({
        id: stringProp(node.properties, "id") ?? node.node_id,
        bundle_name: stringProp(node.properties, "bundle_name") ?? node.node_id,
        blocking_validators: stringListProp(node.properties, "blocking_validators"),
        advisory_validators: stringListProp(node.properties, "advisory_validators"),
    }));
    const presetNodes = referencedNodes
        .filter((node) => node.label === "BridgePreset" &&
        isCanonical(node) &&
        isEnforceable(node) &&
        (featureTypeNodeId === null ||
            referencedEdges.some((edge) => edge.relationship === "APPLIES_TO_FEATURE" &&
                edge.from_node_id === node.node_id &&
                edge.to_node_id === featureTypeNodeId)))
        .sort((left, right) => (stringProp(left.properties, "id") ?? left.node_id).localeCompare(stringProp(right.properties, "id") ?? right.node_id));
    const presetNode = presetNodes[0] ?? null;
    const preset = presetNode
        ? {
            id: stringProp(presetNode.properties, "id") ?? presetNode.node_id,
            preset_name: stringProp(presetNode.properties, "preset_name") ?? presetNode.node_id,
            required_outcomes: stringListProp(presetNode.properties, "required_outcomes"),
            forbidden_shortcuts: stringListProp(presetNode.properties, "forbidden_shortcuts"),
            required_validators: stringListProp(presetNode.properties, "required_validators"),
            approved_surface_scope: stringListProp(presetNode.properties, "approved_surface_scope"),
        }
        : null;
    const scenarioNodes = referencedNodes
        .filter((node) => node.label === "ScenarioPack" &&
        isCanonical(node) &&
        isEnforceable(node) &&
        (featureTypeNodeId === null ||
            referencedEdges.some((edge) => edge.relationship === "TESTS_FEATURE" &&
                edge.from_node_id === node.node_id &&
                edge.to_node_id === featureTypeNodeId)))
        .sort((left, right) => left.node_id.localeCompare(right.node_id));
    const scenarios = scenarioNodes.map((node) => ({
        id: stringProp(node.properties, "id") ?? node.node_id,
        scenario_name: stringProp(node.properties, "scenario_name") ?? node.node_id,
        setup_conditions: stringListProp(node.properties, "setup_conditions"),
        expected_states: stringListProp(node.properties, "expected_states"),
        expected_actions: stringListProp(node.properties, "expected_actions"),
        expected_validators: stringListProp(node.properties, "expected_validators"),
        derived_from_donors: stringListProp(node.properties, "derived_from_donors"),
    }));
    const selectedAssetNodeIds = new Set([
        ...bundleNodes.map((node) => node.node_id),
        ...scenarioNodes.map((node) => node.node_id),
        ...(presetNode ? [presetNode.node_id] : []),
    ]);
    const patterns = referencedNodes
        .filter((node) => node.label === "PatternLibraryEntry" &&
        isCanonical(node) &&
        stringProp(node.properties, "status") === "accepted" &&
        referencedEdges.some((edge) => edgeTouches(edge, node.node_id) &&
            selectedAssetNodeIds.has(oppositeNodeId(edge, node.node_id) ?? "") &&
            [
                "REQUIRES_VALIDATOR_BUNDLE",
                "FEEDS_BRIDGE_PRESET",
                "HAS_SCENARIO_PACK",
            ].includes(edge.relationship)))
        .map((node) => ({
        id: stringProp(node.properties, "id") ?? node.node_id,
        pattern_name: stringProp(node.properties, "pattern_name") ?? node.node_id,
        summary: stringProp(node.properties, "summary") ?? "",
        anti_patterns: stringListProp(node.properties, "anti_patterns"),
        source_donors: stringListProp(node.properties, "source_donors"),
    }));
    const constraints = uniqueStrings([
        ...(preset?.required_outcomes.map((value) => `Required outcome: ${value}`) ?? []),
        ...(preset
            ? [`Use bridge preset ${preset.id} (${preset.preset_name}).`]
            : []),
        ...(preset?.required_validators.map((value) => `Run validator bundle ${value} before write-back.`) ?? []),
        ...(preset?.approved_surface_scope.length
            ? [
                `Stay within approved surfaces: ${preset.approved_surface_scope.join(", ")}.`,
            ]
            : []),
        ...(bundles.length > 0
            ? [
                `Blocking validators: ${uniqueStrings(bundles.flatMap((bundle) => bundle.blocking_validators)).join(", ")}.`,
            ]
            : []),
    ]);
    const tieredConstraintSources = [
        ...(preset?.required_outcomes.map((value) => ({
            text: `Required outcome: ${value}`,
            node: presetNode,
        })) ?? []),
        ...(preset
            ? [{ text: `Use bridge preset ${preset.id} (${preset.preset_name}).`, node: presetNode }]
            : []),
        ...(preset?.required_validators.map((value) => ({
            text: `Run validator bundle ${value} before write-back.`,
            node: presetNode,
        })) ?? []),
        ...bundleNodes.map((node) => ({
            text: `Blocking validators: ${stringListProp(node.properties, "blocking_validators").join(", ")}.`,
            node,
        })),
    ];
    const tiered_constraints = tieredConstraintSources
        .filter((entry) => entry.text.trim() !== "")
        .map((entry) => {
        const tier = entry.node ? nodeAuthorityTier(entry.node) : "DONOR_RAW";
        return {
            text: entry.text,
            authority_tier: tier,
            source_node_id: entry.node?.node_id,
            enforcement: (0, types_1.enforcementFromTier)(tier),
        };
    });
    const antiPatterns = uniqueStrings([
        ...patterns.flatMap((pattern) => pattern.anti_patterns),
        ...(preset?.forbidden_shortcuts ?? []),
    ]);
    const acceptanceCriteria = [
        ...(preset?.required_outcomes.map((outcome, index) => ({
            id: criterionId(preset.id, index),
            description: outcome,
            type: "functional",
            mandatory: true,
        })) ?? []),
        ...scenarios.flatMap((scenario) => scenario.expected_states.map((state, index) => ({
            id: criterionId(scenario.id, index),
            description: `${scenario.scenario_name}: ${state}`,
            type: "functional",
            mandatory: true,
        }))),
    ];
    const fallbackCriterionId = acceptanceCriteria[0]?.id;
    const testCases = scenarios.flatMap((scenario) => scenario.expected_actions.map((action, index) => ({
        id: testCaseId(scenario.id, index),
        description: `${scenario.scenario_name}: ${action}`,
        type: "integration",
        linked_criterion_id: fallbackCriterionId,
        mandatory: true,
    })));
    return {
        feature_class: featureClass ?? null,
        patterns: uniqueStrings(patterns.map((pattern) => pattern.id)),
        constraints,
        tiered_constraints,
        anti_patterns: antiPatterns,
        acceptance_criteria: acceptanceCriteria,
        test_cases: testCases,
        execution_payload: {
            feature_class: featureClass ?? null,
            pattern_ids: uniqueStrings(patterns.map((pattern) => pattern.id)),
            validator_bundle_ids: uniqueStrings(bundles.map((bundle) => bundle.id)),
            bridge_preset_id: preset?.id ?? null,
            scenario_pack_ids: uniqueStrings(scenarios.map((scenario) => scenario.id)),
            source_donor_lineage: uniqueStrings([
                ...patterns.flatMap((pattern) => pattern.source_donors),
                ...scenarios.flatMap((scenario) => scenario.derived_from_donors),
            ]),
            pattern_summaries: patterns.map((pattern) => ({
                id: pattern.id,
                pattern_name: pattern.pattern_name,
                summary: pattern.summary,
            })),
            validator_bundles: bundles,
            bridge_preset: preset
                ? {
                    id: preset.id,
                    preset_name: preset.preset_name,
                    required_outcomes: preset.required_outcomes,
                    approved_surface_scope: preset.approved_surface_scope,
                    required_validators: preset.required_validators,
                }
                : null,
            scenario_packs: scenarios,
        },
    };
}
//# sourceMappingURL=donor-resolution.js.map