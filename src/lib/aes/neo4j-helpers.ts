/**
 * D19 Build Enforcement — Neo4j Write Helpers
 *
 * These helpers generate Cypher queries for the neo4j-memory MCP tool.
 * They do not execute queries directly — the orchestrator calls
 * execute_query with the returned { query, params } objects.
 */

import { randomUUID } from 'crypto';
import type {
  CreateProtocolViolationInput,
  CreateFailureCaseInput,
  ProtocolViolation,
  FailureCase,
} from './types';

// ─── ID generators ───

export function pvId(): string {
  return `PV-${randomUUID()}`;
}

export function fcId(): string {
  return `FC-${randomUUID()}`;
}

// ─── Write helpers ───

export function createProtocolViolation(input: CreateProtocolViolationInput): {
  query: string;
  params: Record<string, unknown>;
  violation: ProtocolViolation;
} {
  const id = pvId();
  const now = new Date().toISOString();

  const violation: ProtocolViolation = {
    id,
    createdAt: now,
    projectId: input.projectId,
    featureType: input.featureType,
    consultationId: input.consultationId,
    violationType: input.violationType,
    message: input.message,
    stage: input.stage,
    severity: input.severity,
    status: 'open',
  };

  const query = `
    CREATE (pv:ProtocolViolation {
      id:              $violationId,
      createdAt:       datetime($createdAt),
      projectId:       $projectId,
      featureType:     $featureType,
      consultationId:  $consultationId,
      violationType:   $violationType,
      message:         $message,
      stage:           $stage,
      severity:        $severity,
      status:          'open'
    })
    WITH pv
    MATCH (proj:Project {id: $projectId})
    MERGE (pv)-[:ON_PROJECT]->(proj)
    WITH pv
    OPTIONAL MATCH (ft:FeatureType {name: $featureType})
    FOREACH (_ IN CASE WHEN ft IS NOT NULL THEN [1] ELSE [] END |
      MERGE (pv)-[:ON_FEATURE]->(ft)
    )
    WITH pv
    OPTIONAL MATCH (cons:FeatureConsultation {id: $consultationId})
    FOREACH (_ IN CASE WHEN cons IS NOT NULL THEN [1] ELSE [] END |
      MERGE (pv)-[:FROM_CONSULTATION]->(cons)
    )
    RETURN pv.id AS id
  `.trim();

  const params = {
    violationId: id,
    createdAt: now,
    projectId: input.projectId,
    featureType: input.featureType,
    consultationId: input.consultationId,
    violationType: input.violationType,
    message: input.message,
    stage: input.stage,
    severity: input.severity,
  };

  return { query, params, violation };
}

export function createFailureCase(input: CreateFailureCaseInput): {
  query: string;
  params: Record<string, unknown>;
  failureCase: FailureCase;
} {
  const id = fcId();
  const now = new Date().toISOString();

  const failureCase: FailureCase = {
    id,
    createdAt: now,
    projectId: input.projectId,
    featureType: input.featureType,
    domain: input.domain,
    title: input.title,
    symptom: input.symptom,
    cause: input.cause,
    evidence: input.evidence,
    detectedBy: input.detectedBy,
    severity: input.severity,
    status: 'open',
    fixPattern: input.fixPattern,
    scope: 'project',
  };

  const query = `
    CREATE (fc:FailureCase {
      id:          $failureCaseId,
      createdAt:   datetime($createdAt),
      projectId:   $projectId,
      featureType: $featureType,
      domain:      $domain,
      title:       $title,
      symptom:     $symptom,
      cause:       $cause,
      evidence:    $evidence,
      detectedBy:  $detectedBy,
      severity:    $severity,
      status:      'open',
      fixPattern:  $fixPattern,
      scope:       'project'
    })
    WITH fc
    MATCH (proj:Project {id: $projectId})
    MERGE (fc)-[:ON_PROJECT]->(proj)
    WITH fc
    OPTIONAL MATCH (ft:FeatureType {name: $featureType})
    FOREACH (_ IN CASE WHEN ft IS NOT NULL THEN [1] ELSE [] END |
      MERGE (fc)-[:ON_FEATURE]->(ft)
    )
    WITH fc
    OPTIONAL MATCH (fd:FeatureDomain {name: $domain})
    FOREACH (_ IN CASE WHEN fd IS NOT NULL THEN [1] ELSE [] END |
      MERGE (fc)-[:IN_DOMAIN]->(fd)
    )
    RETURN fc.id AS id
  `.trim();

  const params = {
    failureCaseId: id,
    createdAt: now,
    projectId: input.projectId,
    featureType: input.featureType,
    domain: input.domain,
    title: input.title,
    symptom: input.symptom,
    cause: input.cause,
    evidence: input.evidence,
    detectedBy: input.detectedBy,
    severity: input.severity,
    fixPattern: input.fixPattern ?? 'undetermined',
  };

  return { query, params, failureCase };
}

// ─── Resolve helpers ───

export function resolveProtocolViolation(violationId: string): {
  query: string;
  params: Record<string, unknown>;
} {
  return {
    query: `
      MATCH (pv:ProtocolViolation {id: $violationId})
      SET pv.status = 'resolved', pv.resolvedAt = datetime()
      RETURN pv.id AS id, pv.status AS status
    `.trim(),
    params: { violationId },
  };
}

export function resolveFailureCase(
  failureCaseId: string,
  fixPattern: string,
): {
  query: string;
  params: Record<string, unknown>;
} {
  return {
    query: `
      MATCH (fc:FailureCase {id: $failureCaseId})
      SET fc.status = 'resolved',
          fc.fixPattern = $fixPattern,
          fc.resolvedAt = datetime()
      RETURN fc.id AS id, fc.status AS status
    `.trim(),
    params: { failureCaseId, fixPattern },
  };
}

export function mitigateFailureCase(
  failureCaseId: string,
  specId: string,
): {
  query: string;
  params: Record<string, unknown>;
} {
  return {
    query: `
      MATCH (fc:FailureCase {id: $failureCaseId})
      SET fc.status = 'mitigated'
      WITH fc
      OPTIONAL MATCH (fs:FeatureSpec {id: $specId})
      FOREACH (_ IN CASE WHEN fs IS NOT NULL THEN [1] ELSE [] END |
        MERGE (fc)-[:MITIGATED_BY]->(fs)
      )
      RETURN fc.id AS id, fc.status AS status
    `.trim(),
    params: { failureCaseId, specId },
  };
}
