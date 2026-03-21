/**
 * D19 Build Enforcement Engine
 *
 * Wired into every pipeline stage:
 *   classification → retrieval → consultation gate → build → review → verify → deploy
 *
 * Rules:
 * - Exact FeatureType match only. No fuzzy matching.
 * - Exact canonical domain comparison only.
 * - No override path.
 * - Build allowed only when consultation status = complete and 100% domain coverage.
 * - Process break → write ProtocolViolation immediately.
 * - Real defect confirmed → write FailureCase.
 */

import {
  type CreateProtocolViolationInput,
  type CreateFailureCaseInput,
  type ProtocolViolation,
  type FailureCase,
  type EnforcementResult,
  type FeatureConsultation,
  ViolationType,
  Stage,
  Severity,
} from './types';
import { createProtocolViolation, createFailureCase } from './neo4j-helpers';

// ─── Types for graph query results ───

export interface FeatureTypeNode {
  name: string;
}

export interface RetrievalResult {
  projectId: string;
  featureType: string;
  domainsRequired: string[];
  featureSpecs: Array<{
    id: string;
    name: string;
    domain: string;
    stack?: string;
    rank: number;
  }>;
  dependencyIds: string[];
}

// ─── Cypher query executor interface ───
// The orchestrator provides this — it wraps the neo4j-memory MCP execute_query tool.
export interface CypherExecutor {
  execute(query: string, params: Record<string, unknown>): Promise<unknown[]>;
}

// ─── Stage enforcers ───

/**
 * Stage 1: Classification
 * FeatureType must resolve to an exact node name. No fuzzy matching.
 */
export async function enforceClassification(
  executor: CypherExecutor,
  projectId: string,
  featureTypeInput: string,
): Promise<EnforcementResult & { featureType?: string }> {
  const violations: ProtocolViolation[] = [];

  // Exact match query — no CONTAINS, no toLower, no fuzzy
  const results = await executor.execute(
    `MATCH (ft:FeatureType {name: $featureType}) RETURN ft.name AS name`,
    { featureType: featureTypeInput },
  );

  if (!results || results.length === 0) {
    const pv = createProtocolViolation({
      projectId,
      featureType: featureTypeInput,
      consultationId: '',
      violationType: ViolationType.UNKNOWN_FEATURE_TYPE,
      message: `No exact FeatureType match for "${featureTypeInput}". Fuzzy matching is not allowed.`,
      stage: Stage.CLASSIFICATION,
      severity: Severity.CRITICAL,
    });

    // Write violation to graph
    await executor.execute(pv.query, pv.params);
    violations.push(pv.violation);

    return { allowed: false, stage: Stage.CLASSIFICATION, violations };
  }

  const matched = results[0] as FeatureTypeNode;
  return {
    allowed: true,
    stage: Stage.CLASSIFICATION,
    violations,
    featureType: matched.name,
  };
}

/**
 * Stage 2: Retrieval
 * D17.5 retrieval must complete successfully.
 */
export async function enforceRetrieval(
  executor: CypherExecutor,
  projectId: string,
  featureType: string,
  appArchetype?: string,
  stack?: string,
): Promise<EnforcementResult & { retrieval?: RetrievalResult }> {
  const violations: ProtocolViolation[] = [];

  const query = `
    MATCH (proj:Project {id: $projectId})
    MATCH (ft:FeatureType {name: $featureType})
    MATCH (ft)-[:REQUIRES_DOMAIN]->(fd:FeatureDomain)
    OPTIONAL MATCH (fd)-[:ALIAS_OF]->(canon:FeatureDomain)
    WITH proj, ft,
         CASE WHEN canon IS NOT NULL THEN canon ELSE fd END AS domain
    OPTIONAL MATCH (fs:FeatureSpec)
    WHERE ((fs)-[:IN_DOMAIN]->(domain) OR fs.domain = domain.name)
      AND fs.status = 'active'
    OPTIONAL MATCH (fs)-[:DEPENDS_ON]->(dep:FeatureSpec)
    WHERE dep.status = 'active'
    RETURN
      proj.id AS projectId,
      ft.name AS featureType,
      collect(DISTINCT domain.name) AS domainsRequired,
      collect(DISTINCT {
        id:     fs.id,
        name:   fs.name,
        domain: domain.name,
        stack:  fs.stack,
        rank:   CASE
                  WHEN fs.stack = $stack THEN 1
                  ELSE 3
                END
      }) AS featureSpecs,
      collect(DISTINCT dep.id) AS dependencyIds
  `.trim();

  try {
    const results = await executor.execute(query, {
      projectId,
      featureType,
      appArchetype: appArchetype ?? '',
      stack: stack ?? '',
    });

    if (!results || results.length === 0) {
      const pv = createProtocolViolation({
        projectId,
        featureType,
        consultationId: '',
        violationType: ViolationType.RETRIEVAL_FAILED,
        message: `D17.5 retrieval returned no results for project "${projectId}", featureType "${featureType}".`,
        stage: Stage.RETRIEVAL,
        severity: Severity.CRITICAL,
      });
      await executor.execute(pv.query, pv.params);
      violations.push(pv.violation);
      return { allowed: false, stage: Stage.RETRIEVAL, violations };
    }

    const row = results[0] as RetrievalResult;

    // Validate structure
    if (!row.domainsRequired || !Array.isArray(row.domainsRequired) || row.domainsRequired.length === 0) {
      const pv = createProtocolViolation({
        projectId,
        featureType,
        consultationId: '',
        violationType: ViolationType.RETRIEVAL_FAILED,
        message: `D17.5 retrieval returned invalid structure: no domainsRequired.`,
        stage: Stage.RETRIEVAL,
        severity: Severity.CRITICAL,
      });
      await executor.execute(pv.query, pv.params);
      violations.push(pv.violation);
      return { allowed: false, stage: Stage.RETRIEVAL, violations };
    }

    return {
      allowed: true,
      stage: Stage.RETRIEVAL,
      violations,
      retrieval: row,
    };
  } catch (err) {
    const pv = createProtocolViolation({
      projectId,
      featureType,
      consultationId: '',
      violationType: ViolationType.RETRIEVAL_FAILED,
      message: `D17.5 retrieval failed: ${err instanceof Error ? err.message : String(err)}`,
      stage: Stage.RETRIEVAL,
      severity: Severity.CRITICAL,
    });
    await executor.execute(pv.query, pv.params);
    violations.push(pv.violation);
    return { allowed: false, stage: Stage.RETRIEVAL, violations };
  }
}

/**
 * Stage 3: Consultation Gate
 * 100% required canonical domain coverage is mandatory.
 */
export async function enforceConsultationGate(
  executor: CypherExecutor,
  projectId: string,
  featureType: string,
  domainsRequired: string[],
  domainsConsulted: string[],
  consultationId: string,
): Promise<EnforcementResult> {
  const violations: ProtocolViolation[] = [];

  // Exact set comparison — no fuzzy, no partial approval
  const requiredSet = new Set(domainsRequired);
  const consultedSet = new Set(domainsConsulted);

  const missingDomains: string[] = [];
  domainsRequired.forEach((required) => {
    if (!consultedSet.has(required)) {
      missingDomains.push(required);
    }
  });

  // Extra domains in consulted are allowed (superset OK)
  // But every required domain must be present
  if (missingDomains.length > 0) {
    const pv = createProtocolViolation({
      projectId,
      featureType,
      consultationId,
      violationType: ViolationType.MISSING_REQUIRED_DOMAIN,
      message: `Missing required canonical domains: [${missingDomains.join(', ')}]. Coverage: ${domainsConsulted.length}/${domainsRequired.length}. 100% required.`,
      stage: Stage.GATE,
      severity: Severity.CRITICAL,
    });
    await executor.execute(pv.query, pv.params);
    violations.push(pv.violation);
    return { allowed: false, stage: Stage.GATE, violations };
  }

  // Verify exact match: domainsConsulted must contain every required domain
  const domainsMatch = domainsRequired.every((d) => domainsConsulted.includes(d));
  if (!domainsMatch) {
    const pv = createProtocolViolation({
      projectId,
      featureType,
      consultationId,
      violationType: ViolationType.MISSING_REQUIRED_DOMAIN,
      message: `domainsConsulted does not exactly cover required canonical domains.`,
      stage: Stage.GATE,
      severity: Severity.CRITICAL,
    });
    await executor.execute(pv.query, pv.params);
    violations.push(pv.violation);
    return { allowed: false, stage: Stage.GATE, violations };
  }

  return { allowed: true, stage: Stage.GATE, violations };
}

/**
 * Stage 4: Build
 * Build must not start unless FeatureConsultation.status = complete.
 */
export async function enforceBuildStart(
  executor: CypherExecutor,
  projectId: string,
  featureType: string,
  consultation: FeatureConsultation | null,
): Promise<EnforcementResult> {
  const violations: ProtocolViolation[] = [];

  if (!consultation) {
    const pv = createProtocolViolation({
      projectId,
      featureType,
      consultationId: '',
      violationType: ViolationType.BUILD_WITHOUT_COMPLETE_CONSULTATION,
      message: `Build attempted with no FeatureConsultation artifact. Consultation must exist before build.`,
      stage: Stage.BUILD,
      severity: Severity.CRITICAL,
    });
    await executor.execute(pv.query, pv.params);
    violations.push(pv.violation);
    return { allowed: false, stage: Stage.BUILD, violations };
  }

  if (consultation.status !== 'complete') {
    const pv = createProtocolViolation({
      projectId,
      featureType,
      consultationId: consultation.id,
      violationType: ViolationType.BUILD_WITHOUT_COMPLETE_CONSULTATION,
      message: `Build attempted with consultation status "${consultation.status}". Only "complete" allows build.`,
      stage: Stage.BUILD,
      severity: Severity.CRITICAL,
    });
    await executor.execute(pv.query, pv.params);
    violations.push(pv.violation);
    return { allowed: false, stage: Stage.BUILD, violations, consultation };
  }

  return { allowed: true, stage: Stage.BUILD, violations, consultation };
}

/**
 * Block any manual override attempt after a gate block.
 */
export async function enforceNoManualOverride(
  executor: CypherExecutor,
  projectId: string,
  featureType: string,
  consultationId: string,
): Promise<EnforcementResult> {
  const pv = createProtocolViolation({
    projectId,
    featureType,
    consultationId,
    violationType: ViolationType.MANUAL_OVERRIDE_ATTEMPT,
    message: `Manual override or "proceed anyway" attempted after gate block. This is not allowed.`,
    stage: Stage.BUILD,
    severity: Severity.CRITICAL,
  });
  await executor.execute(pv.query, pv.params);
  return {
    allowed: false,
    stage: Stage.BUILD,
    violations: [pv.violation],
  };
}

/**
 * Stages 5-7: Review / Verify / Deploy — FailureCase writer
 * When evidence confirms a real defect, write a FailureCase.
 */
export async function recordFailureCase(
  executor: CypherExecutor,
  input: CreateFailureCaseInput,
): Promise<FailureCase> {
  const fc = createFailureCase(input);
  await executor.execute(fc.query, fc.params);
  return fc.failureCase;
}

// ─── Full pipeline enforcer ───

/**
 * Run the complete D19 enforcement pipeline:
 *   classification → retrieval → gate → build readiness
 *
 * Returns the final enforcement result. If any stage fails,
 * the pipeline stops and returns the violations.
 */
export async function runEnforcementPipeline(
  executor: CypherExecutor,
  projectId: string,
  featureTypeInput: string,
  consultation: FeatureConsultation | null,
  appArchetype?: string,
  stack?: string,
): Promise<{
  result: EnforcementResult;
  featureType?: string;
  retrieval?: RetrievalResult;
}> {
  // Stage 1: Classification
  const classResult = await enforceClassification(executor, projectId, featureTypeInput);
  if (!classResult.allowed) {
    return { result: classResult };
  }
  const featureType = classResult.featureType!;

  // Stage 2: Retrieval
  const retResult = await enforceRetrieval(executor, projectId, featureType, appArchetype, stack);
  if (!retResult.allowed) {
    return { result: retResult, featureType };
  }
  const retrieval = retResult.retrieval!;

  // Stage 3: Consultation Gate
  // Derive domainsConsulted from the retrieval's specs that have loaded data
  const domainsWithSpecs = new Set(
    retrieval.featureSpecs
      .filter((s) => s.id != null)
      .map((s) => s.domain),
  );
  const domainsConsulted: string[] = [];
  domainsWithSpecs.forEach((d) => domainsConsulted.push(d));
  const consultationId = consultation?.id ?? '';

  const gateResult = await enforceConsultationGate(
    executor,
    projectId,
    featureType,
    retrieval.domainsRequired,
    domainsConsulted,
    consultationId,
  );
  if (!gateResult.allowed) {
    return { result: gateResult, featureType, retrieval };
  }

  // Stage 4: Build readiness
  const buildResult = await enforceBuildStart(executor, projectId, featureType, consultation);
  if (!buildResult.allowed) {
    return { result: buildResult, featureType, retrieval };
  }

  return {
    result: { allowed: true, stage: Stage.BUILD, violations: [], consultation: consultation! },
    featureType,
    retrieval,
  };
}
