import { ArtifactRegistry, generateArtifactId } from "../registry";
import type {
  ArtifactRef,
  Bridge,
  Build,
  EscalationRecord,
  ReadScopeAmendment,
  ScopeExpansionRequest,
  StoredRecord,
} from "../types";

export interface ProtectedDomainRule {
  domain: string;
  paths: string[];
}

export interface ScopeDecision {
  allowed: boolean;
  path: string;
  access_type: "read" | "write";
  matched_scope: string | null;
  reason: string | null;
  protected_domains: string[];
}

export interface RequestReadScopeExpansionInput {
  build_id: string;
  requested_paths: string[];
  reason: string;
  artifact_refs?: ArtifactRef[];
}

export interface RequestReadScopeExpansionResult {
  request_record: StoredRecord<ScopeExpansionRequest>;
  escalation_record?: StoredRecord<EscalationRecord>;
  protected_domains: string[];
}

export interface ApproveReadScopeExpansionInput {
  scope_expansion_request_id: string;
  approved_paths: string[];
  approved_by: string;
  artifact_refs?: ArtifactRef[];
}

export interface ApproveReadScopeExpansionResult {
  request_record: StoredRecord<ScopeExpansionRequest>;
  amendment_record: StoredRecord<ReadScopeAmendment>;
  bridge_record: StoredRecord<Bridge>;
}

export interface RejectReadScopeExpansionInput {
  scope_expansion_request_id: string;
  artifact_refs?: ArtifactRef[];
}

export class BuildExecutionStateError extends Error {
  constructor(buildId: string, status: Build["status"]) {
    super(`Build ${buildId} must be RUNNING for builder execution controls, got ${status}.`);
    this.name = "BuildExecutionStateError";
  }
}

export class ScopeExpansionDecisionStateError extends Error {
  constructor(requestId: string, status: ScopeExpansionRequest["status"]) {
    super(`Scope expansion request ${requestId} must be PENDING, got ${status}.`);
    this.name = "ScopeExpansionDecisionStateError";
  }
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function pathMatches(pattern: string, repoPath: string): boolean {
  if (pattern === repoPath) {
    return true;
  }

  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return repoPath.startsWith(prefix);
  }

  return false;
}

function firstMatchingScope(
  repoPath: string,
  allowedPaths: string[]
): string | null {
  return allowedPaths.find((allowedPath) => pathMatches(allowedPath, repoPath)) ?? null;
}

function mergeArtifactRefs(...groups: ArtifactRef[][]): ArtifactRef[] {
  const seen = new Set<string>();
  const merged: ArtifactRef[] = [];

  for (const group of groups) {
    for (const artifactRef of group) {
      const key = `${artifactRef.artifact_type}::${artifactRef.artifact_id}::${artifactRef.role}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(artifactRef);
      }
    }
  }

  return merged;
}

export class ScopeGuard {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly options: {
      protected_domains?: ProtectedDomainRule[];
    } = {},
    private readonly now: () => Date = () => new Date()
  ) {}

  async evaluateRead(buildId: string, repoPath: string): Promise<ScopeDecision> {
    const { bridge } = await this.runningContext(buildId);
    const matchedScope = firstMatchingScope(repoPath, bridge.read_scope.paths);

    return {
      allowed: matchedScope !== null,
      path: repoPath,
      access_type: "read",
      matched_scope: matchedScope,
      reason:
        matchedScope === null
          ? `Path ${repoPath} is outside the approved read_scope.`
          : null,
      protected_domains:
        matchedScope === null ? this.protectedDomainsForPath(repoPath) : [],
    };
  }

  async evaluateWrite(buildId: string, repoPath: string): Promise<ScopeDecision> {
    const { bridge } = await this.runningContext(buildId);
    const matchedScope = firstMatchingScope(repoPath, bridge.write_scope.paths);

    return {
      allowed: matchedScope !== null,
      path: repoPath,
      access_type: "write",
      matched_scope: matchedScope,
      reason:
        matchedScope === null
          ? `Path ${repoPath} is outside the approved write_scope.`
          : null,
      protected_domains: [],
    };
  }

  async requestReadScopeExpansion(
    input: RequestReadScopeExpansionInput
  ): Promise<RequestReadScopeExpansionResult> {
    const { build, bridge } = await this.runningContext(input.build_id);
    const requestedPaths = dedupeStrings(input.requested_paths);
    const protectedDomains = this.protectedDomainsForPaths(requestedPaths);
    const request: ScopeExpansionRequest = {
      scope_expansion_request_id: generateArtifactId("scope_expansion_request"),
      build_id: build.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: build.feature_id,
      requested_at: this.now().toISOString(),
      requested_paths: requestedPaths,
      reason: input.reason,
      status: "PENDING",
      artifact_refs: mergeArtifactRefs(
        build.artifact_refs,
        [
          {
            artifact_type: "build",
            artifact_id: build.build_id,
            role: "scope_source",
          },
          {
            artifact_type: "bridge",
            artifact_id: bridge.bridge_id,
            role: "scope_source",
          },
        ],
        input.artifact_refs ?? []
      ),
    };
    const requestRecord = await this.registry.write(
      "scope_expansion_request",
      request
    );

    let escalationRecord: StoredRecord<EscalationRecord> | undefined;
    if (protectedDomains.length > 0) {
      const escalation: EscalationRecord = {
        escalation_record_id: generateArtifactId("escalation_record"),
        build_id: build.build_id,
        bridge_id: bridge.bridge_id,
        feature_id: build.feature_id,
        escalated_at: this.now().toISOString(),
        escalation_reason:
          `Read scope expansion touches protected domains: ${protectedDomains.join(", ")}.`,
        escalation_type: "manual",
        decision: null,
        decided_at: null,
        decided_by: null,
        rationale: null,
        artifact_refs: mergeArtifactRefs(
          request.artifact_refs,
          [
            {
              artifact_type: "build",
              artifact_id: build.build_id,
              role: "escalation_source",
            },
            {
              artifact_type: "bridge",
              artifact_id: bridge.bridge_id,
              role: "escalation_source",
            },
            {
              artifact_type: "scope_expansion_request",
              artifact_id: request.scope_expansion_request_id,
              role: "escalation_source",
            },
          ]
        ),
      };
      escalationRecord = await this.registry.write("escalation_record", escalation);
    }

    return {
      request_record: requestRecord,
      escalation_record: escalationRecord,
      protected_domains: protectedDomains,
    };
  }

  async approveReadScopeExpansion(
    input: ApproveReadScopeExpansionInput
  ): Promise<ApproveReadScopeExpansionResult> {
    const requestRecord = await this.registry.read<ScopeExpansionRequest>(
      "scope_expansion_request",
      input.scope_expansion_request_id
    );
    if (requestRecord.payload.status !== "PENDING") {
      throw new ScopeExpansionDecisionStateError(
        input.scope_expansion_request_id,
        requestRecord.payload.status
      );
    }

    const { build, bridge } = await this.runningContext(requestRecord.payload.build_id);
    const approvedPaths = dedupeStrings(input.approved_paths);
    const approvedRequestRecord = await this.registry.write("scope_expansion_request", {
      ...requestRecord.payload,
      status: "APPROVED",
      artifact_refs: mergeArtifactRefs(
        requestRecord.payload.artifact_refs,
        input.artifact_refs ?? []
      ),
    });
    const amendment: ReadScopeAmendment = {
      read_scope_amendment_id: generateArtifactId("read_scope_amendment"),
      scope_expansion_request_id: requestRecord.payload.scope_expansion_request_id,
      build_id: build.build_id,
      bridge_id: bridge.bridge_id,
      feature_id: build.feature_id,
      amended_at: this.now().toISOString(),
      approved_paths: approvedPaths,
      approved_by: input.approved_by,
      artifact_refs: mergeArtifactRefs(
        requestRecord.payload.artifact_refs,
        [
          {
            artifact_type: "build",
            artifact_id: build.build_id,
            role: "scope_source",
          },
          {
            artifact_type: "bridge",
            artifact_id: bridge.bridge_id,
            role: "scope_source",
          },
        ],
        input.artifact_refs ?? []
      ),
    };
    const amendmentRecord = await this.registry.write(
      "read_scope_amendment",
      amendment
    );
    const updatedBridge: Bridge = {
      ...bridge,
      read_scope: {
        ...bridge.read_scope,
        paths: dedupeStrings([...bridge.read_scope.paths, ...approvedPaths]),
      },
      read_scope_amendments: dedupeStrings([
        ...bridge.read_scope_amendments,
        amendment.read_scope_amendment_id,
      ]),
    };
    const bridgeRecord = await this.registry.write("bridge", updatedBridge);

    return {
      request_record: approvedRequestRecord,
      amendment_record: amendmentRecord,
      bridge_record: bridgeRecord,
    };
  }

  async rejectReadScopeExpansion(
    input: RejectReadScopeExpansionInput
  ): Promise<StoredRecord<ScopeExpansionRequest>> {
    const requestRecord = await this.registry.read<ScopeExpansionRequest>(
      "scope_expansion_request",
      input.scope_expansion_request_id
    );
    if (requestRecord.payload.status !== "PENDING") {
      throw new ScopeExpansionDecisionStateError(
        input.scope_expansion_request_id,
        requestRecord.payload.status
      );
    }

    return this.registry.write("scope_expansion_request", {
      ...requestRecord.payload,
      status: "REJECTED",
      artifact_refs: mergeArtifactRefs(
        requestRecord.payload.artifact_refs,
        input.artifact_refs ?? []
      ),
    });
  }

  private protectedDomainsForPaths(paths: string[]): string[] {
    const matchedDomains = new Set<string>();

    for (const repoPath of paths) {
      for (const domain of this.protectedDomainsForPath(repoPath)) {
        matchedDomains.add(domain);
      }
    }

    return Array.from(matchedDomains);
  }

  private protectedDomainsForPath(repoPath: string): string[] {
    const matches: string[] = [];
    for (const rule of this.options.protected_domains ?? []) {
      if (rule.paths.some((pattern) => pathMatches(pattern, repoPath))) {
        matches.push(rule.domain);
      }
    }
    return matches;
  }

  private async runningContext(
    buildId: string
  ): Promise<{ build: Build; bridge: Bridge }> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
    if (buildRecord.payload.status !== "RUNNING") {
      throw new BuildExecutionStateError(buildId, buildRecord.payload.status);
    }

    const bridgeRecord = await this.registry.read<Bridge>(
      "bridge",
      buildRecord.payload.bridge_id
    );

    return {
      build: buildRecord.payload,
      bridge: bridgeRecord.payload,
    };
  }
}
