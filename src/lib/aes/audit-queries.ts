/**
 * D19 Build Enforcement — Audit Queries
 *
 * Read-only Cypher queries for inspecting protocol violations and failure cases.
 * Each function returns { query, params } for the neo4j-memory execute_query tool.
 */

// ─── Protocol Violation queries ───

/** All violations for a project, newest first */
export function queryViolationsByProject(projectId: string) {
  return {
    query: `
      MATCH (pv:ProtocolViolation {projectId: $projectId})
      RETURN pv.id AS id,
             pv.violationType AS violationType,
             pv.message AS message,
             pv.stage AS stage,
             pv.severity AS severity,
             pv.status AS status,
             pv.featureType AS featureType,
             pv.consultationId AS consultationId,
             pv.createdAt AS createdAt
      ORDER BY pv.createdAt DESC
    `.trim(),
    params: { projectId },
  };
}

/** Open CRITICAL violations for a project */
export function queryOpenCriticalViolations(projectId: string) {
  return {
    query: `
      MATCH (pv:ProtocolViolation {projectId: $projectId, severity: 'CRITICAL', status: 'open'})
      RETURN pv.id AS id,
             pv.violationType AS violationType,
             pv.message AS message,
             pv.stage AS stage,
             pv.featureType AS featureType,
             pv.createdAt AS createdAt
      ORDER BY pv.createdAt DESC
    `.trim(),
    params: { projectId },
  };
}

/** Count violations by type for a project */
export function queryViolationCountsByType(projectId: string) {
  return {
    query: `
      MATCH (pv:ProtocolViolation {projectId: $projectId})
      RETURN pv.violationType AS violationType,
             pv.severity AS severity,
             count(pv) AS count
      ORDER BY count DESC
    `.trim(),
    params: { projectId },
  };
}

/** Violations by stage across all projects */
export function queryViolationsByStage() {
  return {
    query: `
      MATCH (pv:ProtocolViolation)
      RETURN pv.stage AS stage,
             pv.severity AS severity,
             count(pv) AS count
      ORDER BY count DESC
    `.trim(),
    params: {},
  };
}

/** Repeated violation pattern within 7 days (same project, same type) */
export function queryRepeatedViolations(projectId: string, violationType: string) {
  return {
    query: `
      MATCH (pv:ProtocolViolation {projectId: $projectId, violationType: $violationType})
      WHERE pv.createdAt > datetime() - duration('P7D')
      RETURN count(pv) AS recentCount,
             collect(pv.id) AS violationIds
    `.trim(),
    params: { projectId, violationType },
  };
}

// ─── Failure Case queries ───

/** All failure cases for a project, newest first */
export function queryFailuresByProject(projectId: string) {
  return {
    query: `
      MATCH (fc:FailureCase {projectId: $projectId})
      RETURN fc.id AS id,
             fc.featureType AS featureType,
             fc.domain AS domain,
             fc.title AS title,
             fc.symptom AS symptom,
             fc.cause AS cause,
             fc.evidence AS evidence,
             fc.detectedBy AS detectedBy,
             fc.severity AS severity,
             fc.status AS status,
             fc.fixPattern AS fixPattern,
             fc.createdAt AS createdAt
      ORDER BY fc.createdAt DESC
    `.trim(),
    params: { projectId },
  };
}

/** Open failure cases for a project */
export function queryOpenFailures(projectId: string) {
  return {
    query: `
      MATCH (fc:FailureCase {projectId: $projectId})
      WHERE fc.status IN ['open', 'mitigated']
      RETURN fc.id AS id,
             fc.featureType AS featureType,
             fc.domain AS domain,
             fc.title AS title,
             fc.symptom AS symptom,
             fc.severity AS severity,
             fc.status AS status,
             fc.createdAt AS createdAt
      ORDER BY fc.createdAt DESC
    `.trim(),
    params: { projectId },
  };
}

/** Failures by featureType for a project */
export function queryFailuresByFeatureType(projectId: string, featureType: string) {
  return {
    query: `
      MATCH (fc:FailureCase {projectId: $projectId, featureType: $featureType})
      RETURN fc.id AS id,
             fc.domain AS domain,
             fc.title AS title,
             fc.symptom AS symptom,
             fc.cause AS cause,
             fc.severity AS severity,
             fc.status AS status,
             fc.fixPattern AS fixPattern,
             fc.createdAt AS createdAt
      ORDER BY fc.createdAt DESC
    `.trim(),
    params: { projectId, featureType },
  };
}

/** Repeated failure causes (same project, same featureType+cause) */
export function queryRepeatedFailures(projectId: string) {
  return {
    query: `
      MATCH (fc:FailureCase {projectId: $projectId})
      WITH fc.featureType AS featureType,
           fc.cause AS cause,
           count(fc) AS occurrences
      WHERE occurrences > 1
      RETURN featureType, cause, occurrences
      ORDER BY occurrences DESC
    `.trim(),
    params: { projectId },
  };
}

/** Cross-project failure candidates for D13 generalization */
export function queryGeneralizationCandidates() {
  return {
    query: `
      MATCH (fc:FailureCase)
      WITH fc.featureType AS featureType,
           fc.cause AS cause,
           collect(DISTINCT fc.projectId) AS projects,
           count(fc) AS total
      WHERE size(projects) >= 2
      RETURN featureType, cause, projects, total
      ORDER BY total DESC
    `.trim(),
    params: {},
  };
}

// ─── Combined audit summary ───

/** Full enforcement health for a project */
export function queryEnforcementSummary(projectId: string) {
  return {
    query: `
      OPTIONAL MATCH (pv:ProtocolViolation {projectId: $projectId})
      WITH count(pv) AS totalViolations,
           sum(CASE WHEN pv.status = 'open' THEN 1 ELSE 0 END) AS openViolations,
           sum(CASE WHEN pv.severity = 'CRITICAL' THEN 1 ELSE 0 END) AS criticalViolations
      OPTIONAL MATCH (fc:FailureCase {projectId: $projectId})
      WITH totalViolations, openViolations, criticalViolations,
           count(fc) AS totalFailures,
           sum(CASE WHEN fc.status = 'open' THEN 1 ELSE 0 END) AS openFailures,
           sum(CASE WHEN fc.severity = 'CRITICAL' THEN 1 ELSE 0 END) AS criticalFailures
      RETURN totalViolations, openViolations, criticalViolations,
             totalFailures, openFailures, criticalFailures
    `.trim(),
    params: { projectId },
  };
}
