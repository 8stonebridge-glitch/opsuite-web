/**
 * D19 Build Enforcement — TypeScript Interfaces
 *
 * Two enforcement memory types:
 * - ProtocolViolation: AES process/pipeline broke procedure
 * - FailureCase: built feature failed in actual behavior
 */

// ─── Enums ───

export const ViolationType = {
  UNKNOWN_FEATURE_TYPE: 'UNKNOWN_FEATURE_TYPE',
  RETRIEVAL_FAILED: 'RETRIEVAL_FAILED',
  MISSING_REQUIRED_DOMAIN: 'MISSING_REQUIRED_DOMAIN',
  BUILD_WITHOUT_COMPLETE_CONSULTATION: 'BUILD_WITHOUT_COMPLETE_CONSULTATION',
  MANUAL_OVERRIDE_ATTEMPT: 'MANUAL_OVERRIDE_ATTEMPT',
} as const;
export type ViolationType = (typeof ViolationType)[keyof typeof ViolationType];

export const Stage = {
  CLASSIFICATION: 'classification',
  RETRIEVAL: 'retrieval',
  GATE: 'gate',
  BUILD: 'build',
  REVIEW: 'review',
  VERIFY: 'verify',
  DEPLOY: 'deploy',
} as const;
export type Stage = (typeof Stage)[keyof typeof Stage];

export const Severity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const PVStatus = {
  OPEN: 'open',
  RESOLVED: 'resolved',
} as const;
export type PVStatus = (typeof PVStatus)[keyof typeof PVStatus];

export const FCStatus = {
  OPEN: 'open',
  MITIGATED: 'mitigated',
  RESOLVED: 'resolved',
} as const;
export type FCStatus = (typeof FCStatus)[keyof typeof FCStatus];

export const DetectedBy = {
  CODEX: 'codex',
  TESTS: 'tests',
  VERIFIER: 'verifier',
  RUNTIME: 'runtime',
  USER: 'user',
} as const;
export type DetectedBy = (typeof DetectedBy)[keyof typeof DetectedBy];

// ─── Node Interfaces ───

export interface ProtocolViolation {
  id: string;
  createdAt: string; // ISO datetime
  projectId: string;
  featureType: string;
  consultationId: string;
  violationType: ViolationType;
  message: string;
  stage: Stage;
  severity: Severity;
  status: PVStatus;
}

export interface FailureCase {
  id: string;
  createdAt: string; // ISO datetime
  projectId: string;
  featureType: string;
  domain: string;
  title: string;
  symptom: string;
  cause: string;
  evidence: string;
  detectedBy: DetectedBy;
  severity: Severity;
  status: FCStatus;
  fixPattern?: string;
  scope?: string;
}

// ─── Input types (for creation helpers) ───

export interface CreateProtocolViolationInput {
  projectId: string;
  featureType: string;
  consultationId: string;
  violationType: ViolationType;
  message: string;
  stage: Stage;
  severity: Severity;
}

export interface CreateFailureCaseInput {
  projectId: string;
  featureType: string;
  domain: string;
  title: string;
  symptom: string;
  cause: string;
  evidence: string;
  detectedBy: DetectedBy;
  severity: Severity;
  fixPattern?: string;
}

// ─── Consultation artifact (referenced from D18) ───

export interface FeatureConsultation {
  id: string;
  createdAt: string;
  status: 'pending' | 'complete' | 'incomplete' | 'rejected';
  projectId: string;
  featureType: string;
  domainsRequiredCount: number;
  domainsConsultedCount: number;
  missingCoverage: string[];
}

// ─── Enforcement result ───

export interface EnforcementResult {
  allowed: boolean;
  stage: Stage;
  violations: ProtocolViolation[];
  consultation?: FeatureConsultation;
}
