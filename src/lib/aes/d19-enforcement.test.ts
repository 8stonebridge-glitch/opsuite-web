/**
 * D19 Build Enforcement — Unit Tests
 *
 * Tests the enforcement pipeline against all violation types
 * and failure case recording using a mock CypherExecutor.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProtocolViolation,
  createFailureCase,
  resolveProtocolViolation,
  resolveFailureCase,
  mitigateFailureCase,
  ViolationType,
  Stage,
  Severity,
  DetectedBy,
} from './index';
import type { CypherExecutor, FeatureConsultation } from './index';
import {
  enforceClassification,
  enforceRetrieval,
  enforceConsultationGate,
  enforceBuildStart,
  enforceNoManualOverride,
  recordFailureCase,
  runEnforcementPipeline,
} from './enforcement';
import {
  queryViolationsByProject,
  queryOpenCriticalViolations,
  queryViolationCountsByType,
  queryFailuresByProject,
  queryOpenFailures,
  queryEnforcementSummary,
} from './audit-queries';

// ─── Mock executor ───

function mockExecutor(responses: unknown[][] = [[]]): CypherExecutor {
  let callIndex = 0;
  return {
    execute: vi.fn(async () => {
      const response = responses[callIndex] ?? [];
      callIndex++;
      return response;
    }),
  };
}

// ─── Helper factories ───

function makeConsultation(overrides: Partial<FeatureConsultation> = {}): FeatureConsultation {
  return {
    id: 'CONS-test-123',
    createdAt: new Date().toISOString(),
    status: 'complete',
    projectId: 'PROJ-test',
    featureType: 'authentication-flow',
    domainsRequiredCount: 2,
    domainsConsultedCount: 2,
    missingCoverage: [],
    ...overrides,
  };
}

// ─── Tests ───

describe('D19 Build Enforcement', () => {
  describe('createProtocolViolation', () => {
    it('generates valid Cypher and violation object', () => {
      const result = createProtocolViolation({
        projectId: 'PROJ-test',
        featureType: 'authentication-flow',
        consultationId: 'CONS-123',
        violationType: ViolationType.UNKNOWN_FEATURE_TYPE,
        message: 'No match found',
        stage: Stage.CLASSIFICATION,
        severity: Severity.CRITICAL,
      });

      expect(result.violation.id).toMatch(/^PV-/);
      expect(result.violation.status).toBe('open');
      expect(result.violation.violationType).toBe('UNKNOWN_FEATURE_TYPE');
      expect(result.violation.stage).toBe('classification');
      expect(result.violation.severity).toBe('CRITICAL');
      expect(result.query).toContain('CREATE (pv:ProtocolViolation');
      expect(result.query).toContain(':ON_PROJECT');
      expect(result.query).toContain(':ON_FEATURE');
      expect(result.query).toContain(':FROM_CONSULTATION');
      expect(result.params.violationId).toBe(result.violation.id);
      expect(result.params.projectId).toBe('PROJ-test');
    });
  });

  describe('createFailureCase', () => {
    it('generates valid Cypher and failure case object', () => {
      const result = createFailureCase({
        projectId: 'PROJ-test',
        featureType: 'authentication-flow',
        domain: 'auth-session-security',
        title: 'Auth redirect loop',
        symptom: 'User sees infinite redirect after login',
        cause: 'Missing auth state check on root route',
        evidence: 'Codex review identified redirect chain',
        detectedBy: DetectedBy.CODEX,
        severity: Severity.CRITICAL,
        fixPattern: 'Add auth state guard before redirect',
      });

      expect(result.failureCase.id).toMatch(/^FC-/);
      expect(result.failureCase.status).toBe('open');
      expect(result.failureCase.scope).toBe('project');
      expect(result.failureCase.detectedBy).toBe('codex');
      expect(result.query).toContain('CREATE (fc:FailureCase');
      expect(result.query).toContain(':ON_PROJECT');
      expect(result.query).toContain(':ON_FEATURE');
      expect(result.query).toContain(':IN_DOMAIN');
      expect(result.params.failureCaseId).toBe(result.failureCase.id);
    });

    it('defaults fixPattern to "undetermined" when not provided', () => {
      const result = createFailureCase({
        projectId: 'PROJ-test',
        featureType: 'authentication-flow',
        domain: 'auth-session-security',
        title: 'Crash',
        symptom: 'Page crashes',
        cause: 'Unknown',
        evidence: 'Runtime error log',
        detectedBy: DetectedBy.RUNTIME,
        severity: Severity.CRITICAL,
      });

      expect(result.params.fixPattern).toBe('undetermined');
    });
  });

  describe('resolveProtocolViolation', () => {
    it('generates resolve Cypher', () => {
      const result = resolveProtocolViolation('PV-abc-123');
      expect(result.query).toContain("SET pv.status = 'resolved'");
      expect(result.params.violationId).toBe('PV-abc-123');
    });
  });

  describe('resolveFailureCase', () => {
    it('generates resolve Cypher with fixPattern', () => {
      const result = resolveFailureCase('FC-abc-123', 'Added auth guard');
      expect(result.query).toContain("SET fc.status = 'resolved'");
      expect(result.params.failureCaseId).toBe('FC-abc-123');
      expect(result.params.fixPattern).toBe('Added auth guard');
    });
  });

  describe('mitigateFailureCase', () => {
    it('generates mitigate Cypher with MITIGATED_BY relationship', () => {
      const result = mitigateFailureCase('FC-abc-123', 'SPEC-guard-1');
      expect(result.query).toContain("SET fc.status = 'mitigated'");
      expect(result.query).toContain(':MITIGATED_BY');
      expect(result.params.specId).toBe('SPEC-guard-1');
    });
  });

  describe('enforceClassification', () => {
    it('allows when exact FeatureType match exists', async () => {
      const exec = mockExecutor([[{ name: 'authentication-flow' }]]);
      const result = await enforceClassification(exec, 'PROJ-test', 'authentication-flow');

      expect(result.allowed).toBe(true);
      expect(result.featureType).toBe('authentication-flow');
      expect(result.violations).toHaveLength(0);
    });

    it('blocks and writes PV when no FeatureType match', async () => {
      // First call: FeatureType query returns empty
      // Second call: PV write succeeds
      const exec = mockExecutor([[], [{ id: 'PV-xxx' }]]);
      const result = await enforceClassification(exec, 'PROJ-test', 'nonexistent-type');

      expect(result.allowed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].violationType).toBe('UNKNOWN_FEATURE_TYPE');
      expect(result.violations[0].severity).toBe('CRITICAL');
      expect(result.stage).toBe('classification');
      expect(exec.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('enforceRetrieval', () => {
    it('allows when retrieval returns valid data', async () => {
      const exec = mockExecutor([
        [
          {
            projectId: 'PROJ-test',
            featureType: 'authentication-flow',
            domainsRequired: ['auth-session-security', 'forms-input'],
            featureSpecs: [
              { id: 'SPEC-1', name: 'clerk-redirect', domain: 'auth-session-security', rank: 1 },
            ],
            dependencyIds: [],
          },
        ],
      ]);
      const result = await enforceRetrieval(exec, 'PROJ-test', 'authentication-flow');

      expect(result.allowed).toBe(true);
      expect(result.retrieval?.domainsRequired).toEqual(['auth-session-security', 'forms-input']);
    });

    it('blocks and writes PV when retrieval returns empty', async () => {
      const exec = mockExecutor([[], [{ id: 'PV-xxx' }]]);
      const result = await enforceRetrieval(exec, 'PROJ-test', 'authentication-flow');

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('RETRIEVAL_FAILED');
    });

    it('blocks when retrieval has no domainsRequired', async () => {
      const exec = mockExecutor([
        [{ projectId: 'PROJ-test', featureType: 'auth', domainsRequired: [], featureSpecs: [], dependencyIds: [] }],
        [{ id: 'PV-xxx' }],
      ]);
      const result = await enforceRetrieval(exec, 'PROJ-test', 'auth');

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('RETRIEVAL_FAILED');
    });

    it('blocks when executor throws', async () => {
      const exec: CypherExecutor = {
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('Neo4j timeout'))
          .mockResolvedValueOnce([{ id: 'PV-xxx' }]),
      };
      const result = await enforceRetrieval(exec, 'PROJ-test', 'authentication-flow');

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('RETRIEVAL_FAILED');
      expect(result.violations[0].message).toContain('Neo4j timeout');
    });
  });

  describe('enforceConsultationGate', () => {
    it('allows when domains match exactly', async () => {
      const exec = mockExecutor();
      const result = await enforceConsultationGate(
        exec,
        'PROJ-test',
        'authentication-flow',
        ['auth-session-security', 'forms-input'],
        ['auth-session-security', 'forms-input'],
        'CONS-123',
      );

      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('allows superset (extra consulted domains OK)', async () => {
      const exec = mockExecutor();
      const result = await enforceConsultationGate(
        exec,
        'PROJ-test',
        'authentication-flow',
        ['auth-session-security'],
        ['auth-session-security', 'forms-input', 'extra-domain'],
        'CONS-123',
      );

      expect(result.allowed).toBe(true);
    });

    it('blocks when required domain is missing', async () => {
      const exec = mockExecutor([[{ id: 'PV-xxx' }]]);
      const result = await enforceConsultationGate(
        exec,
        'PROJ-test',
        'authentication-flow',
        ['auth-session-security', 'forms-input', 'error_states'],
        ['auth-session-security', 'forms-input'],
        'CONS-123',
      );

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('MISSING_REQUIRED_DOMAIN');
      expect(result.violations[0].message).toContain('error_states');
    });

    it('blocks on empty domainsConsulted', async () => {
      const exec = mockExecutor([[{ id: 'PV-xxx' }]]);
      const result = await enforceConsultationGate(
        exec,
        'PROJ-test',
        'authentication-flow',
        ['auth-session-security'],
        [],
        'CONS-123',
      );

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('MISSING_REQUIRED_DOMAIN');
    });

    it('does not allow partial coverage (no percentage-based approval)', async () => {
      const exec = mockExecutor([[{ id: 'PV-xxx' }]]);
      // 3 of 4 domains = 75% — must be blocked
      const result = await enforceConsultationGate(
        exec,
        'PROJ-test',
        'authentication-flow',
        ['d1', 'd2', 'd3', 'd4'],
        ['d1', 'd2', 'd3'],
        'CONS-123',
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('enforceBuildStart', () => {
    it('allows when consultation status is complete', async () => {
      const exec = mockExecutor();
      const result = await enforceBuildStart(
        exec,
        'PROJ-test',
        'authentication-flow',
        makeConsultation(),
      );

      expect(result.allowed).toBe(true);
    });

    it('blocks when consultation is null', async () => {
      const exec = mockExecutor([[{ id: 'PV-xxx' }]]);
      const result = await enforceBuildStart(exec, 'PROJ-test', 'authentication-flow', null);

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('BUILD_WITHOUT_COMPLETE_CONSULTATION');
    });

    it('blocks when consultation status is incomplete', async () => {
      const exec = mockExecutor([[{ id: 'PV-xxx' }]]);
      const result = await enforceBuildStart(
        exec,
        'PROJ-test',
        'authentication-flow',
        makeConsultation({ status: 'incomplete' }),
      );

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('BUILD_WITHOUT_COMPLETE_CONSULTATION');
      expect(result.violations[0].message).toContain('incomplete');
    });

    it('blocks when consultation status is rejected', async () => {
      const exec = mockExecutor([[{ id: 'PV-xxx' }]]);
      const result = await enforceBuildStart(
        exec,
        'PROJ-test',
        'authentication-flow',
        makeConsultation({ status: 'rejected' }),
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('enforceNoManualOverride', () => {
    it('always blocks and writes MANUAL_OVERRIDE_ATTEMPT', async () => {
      const exec = mockExecutor([[{ id: 'PV-xxx' }]]);
      const result = await enforceNoManualOverride(exec, 'PROJ-test', 'authentication-flow', 'CONS-123');

      expect(result.allowed).toBe(false);
      expect(result.violations[0].violationType).toBe('MANUAL_OVERRIDE_ATTEMPT');
      expect(result.violations[0].severity).toBe('CRITICAL');
    });
  });

  describe('recordFailureCase', () => {
    it('writes FailureCase and returns it', async () => {
      const exec = mockExecutor([[{ id: 'FC-xxx' }]]);
      const fc = await recordFailureCase(exec, {
        projectId: 'PROJ-test',
        featureType: 'authentication-flow',
        domain: 'auth-session-security',
        title: 'Auth redirect loop',
        symptom: 'Infinite redirect after login',
        cause: 'No auth state check on root',
        evidence: 'Codex review + test failure',
        detectedBy: DetectedBy.CODEX,
        severity: Severity.CRITICAL,
        fixPattern: 'Add auth guard',
      });

      expect(fc.id).toMatch(/^FC-/);
      expect(fc.status).toBe('open');
      expect(fc.title).toBe('Auth redirect loop');
      expect(exec.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('runEnforcementPipeline', () => {
    it('passes all stages with valid data', async () => {
      const exec = mockExecutor([
        // Stage 1: classification
        [{ name: 'authentication-flow' }],
        // Stage 2: retrieval
        [
          {
            projectId: 'PROJ-test',
            featureType: 'authentication-flow',
            domainsRequired: ['auth-session-security'],
            featureSpecs: [
              { id: 'SPEC-1', name: 'clerk-redirect', domain: 'auth-session-security', rank: 1 },
            ],
            dependencyIds: [],
          },
        ],
        // No gate PV write needed (passes)
        // No build PV write needed (passes)
      ]);

      const { result, featureType, retrieval } = await runEnforcementPipeline(
        exec,
        'PROJ-test',
        'authentication-flow',
        makeConsultation({ domainsRequiredCount: 1, domainsConsultedCount: 1 }),
      );

      expect(result.allowed).toBe(true);
      expect(featureType).toBe('authentication-flow');
      expect(retrieval?.domainsRequired).toEqual(['auth-session-security']);
    });

    it('stops at classification if FeatureType unknown', async () => {
      const exec = mockExecutor([
        [], // no match
        [{ id: 'PV-xxx' }], // PV write
      ]);

      const { result } = await runEnforcementPipeline(
        exec,
        'PROJ-test',
        'unknown-type',
        null,
      );

      expect(result.allowed).toBe(false);
      expect(result.stage).toBe('classification');
    });

    it('stops at retrieval if it fails', async () => {
      const exec = mockExecutor([
        [{ name: 'authentication-flow' }], // classification OK
        [], // retrieval empty
        [{ id: 'PV-xxx' }], // PV write
      ]);

      const { result } = await runEnforcementPipeline(
        exec,
        'PROJ-test',
        'authentication-flow',
        null,
      );

      expect(result.allowed).toBe(false);
      expect(result.stage).toBe('retrieval');
    });

    it('stops at gate if domain coverage incomplete', async () => {
      const exec = mockExecutor([
        [{ name: 'authentication-flow' }], // classification
        [
          {
            projectId: 'PROJ-test',
            featureType: 'authentication-flow',
            domainsRequired: ['auth-session-security', 'forms-input'],
            featureSpecs: [
              { id: 'SPEC-1', name: 'clerk-redirect', domain: 'auth-session-security', rank: 1 },
              // forms-input has no specs → missing domain
            ],
            dependencyIds: [],
          },
        ],
        [{ id: 'PV-xxx' }], // gate PV write
      ]);

      const { result } = await runEnforcementPipeline(
        exec,
        'PROJ-test',
        'authentication-flow',
        makeConsultation(),
      );

      expect(result.allowed).toBe(false);
      expect(result.stage).toBe('gate');
    });

    it('stops at build if consultation not complete', async () => {
      const exec = mockExecutor([
        [{ name: 'authentication-flow' }], // classification
        [
          {
            projectId: 'PROJ-test',
            featureType: 'authentication-flow',
            domainsRequired: ['auth-session-security'],
            featureSpecs: [
              { id: 'SPEC-1', name: 'clerk-redirect', domain: 'auth-session-security', rank: 1 },
            ],
            dependencyIds: [],
          },
        ],
        // gate passes (domains match)
        [{ id: 'PV-xxx' }], // build PV write
      ]);

      const { result } = await runEnforcementPipeline(
        exec,
        'PROJ-test',
        'authentication-flow',
        makeConsultation({ status: 'rejected' }),
      );

      expect(result.allowed).toBe(false);
      expect(result.stage).toBe('build');
    });
  });

  describe('Audit queries', () => {
    it('queryViolationsByProject returns valid query shape', () => {
      const q = queryViolationsByProject('PROJ-test');
      expect(q.query).toContain('ProtocolViolation');
      expect(q.query).toContain('ORDER BY');
      expect(q.params.projectId).toBe('PROJ-test');
    });

    it('queryOpenCriticalViolations filters by severity and status', () => {
      const q = queryOpenCriticalViolations('PROJ-test');
      expect(q.query).toContain("severity: 'CRITICAL'");
      expect(q.query).toContain("status: 'open'");
    });

    it('queryViolationCountsByType groups by type', () => {
      const q = queryViolationCountsByType('PROJ-test');
      expect(q.query).toContain('count(pv)');
    });

    it('queryFailuresByProject returns valid query shape', () => {
      const q = queryFailuresByProject('PROJ-test');
      expect(q.query).toContain('FailureCase');
      expect(q.query).toContain('ORDER BY');
    });

    it('queryOpenFailures filters by open/mitigated status', () => {
      const q = queryOpenFailures('PROJ-test');
      expect(q.query).toContain("'open', 'mitigated'");
    });

    it('queryEnforcementSummary returns combined stats', () => {
      const q = queryEnforcementSummary('PROJ-test');
      expect(q.query).toContain('totalViolations');
      expect(q.query).toContain('totalFailures');
      expect(q.query).toContain('criticalViolations');
      expect(q.query).toContain('criticalFailures');
    });
  });
});
