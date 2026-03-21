/**
 * D19 Build Enforcement — Public API
 */

// Types
export type {
  ProtocolViolation,
  FailureCase,
  CreateProtocolViolationInput,
  CreateFailureCaseInput,
  FeatureConsultation,
  EnforcementResult,
} from './types';

export {
  ViolationType,
  Stage,
  Severity,
  PVStatus,
  FCStatus,
  DetectedBy,
} from './types';

// Neo4j write helpers
export {
  pvId,
  fcId,
  createProtocolViolation,
  createFailureCase,
  resolveProtocolViolation,
  resolveFailureCase,
  mitigateFailureCase,
} from './neo4j-helpers';

// Enforcement engine
export type { CypherExecutor, FeatureTypeNode, RetrievalResult } from './enforcement';
export {
  enforceClassification,
  enforceRetrieval,
  enforceConsultationGate,
  enforceBuildStart,
  enforceNoManualOverride,
  recordFailureCase,
  runEnforcementPipeline,
} from './enforcement';

// Audit queries
export {
  queryViolationsByProject,
  queryOpenCriticalViolations,
  queryViolationCountsByType,
  queryViolationsByStage,
  queryRepeatedViolations,
  queryFailuresByProject,
  queryOpenFailures,
  queryFailuresByFeatureType,
  queryRepeatedFailures,
  queryGeneralizationCandidates,
  queryEnforcementSummary,
} from './audit-queries';
