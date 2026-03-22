MERGE (operatorFeature:FeatureSpec {node_id: "NODE-AES-REAL-001"})
SET operatorFeature += {
  feature_id: "FEAT-AES-REAL-001",
  name: "AES operator workflow and control plane",
  critical_domain: true,
  status: "ACTIVE",
  owner: "operator",
  authority_tier: "CANONICAL",
  supervised_builder: "claude",
  workflow_actions: [
    "prepare-build",
    "run-builder",
    "abort-builder",
    "record-diff",
    "record-test-run",
    "run-validators"
  ]
}

MERGE (bootstrapFeature:FeatureSpec {node_id: "NODE-AES-REAL-002"})
SET bootstrapFeature += {
  feature_id: "FEAT-AES-REAL-002",
  name: "AES runtime bootstrap and live dependency wiring",
  critical_domain: true,
  status: "ACTIVE",
  owner: "platform",
  authority_tier: "CANONICAL",
  entrypoint: "src/bootstrap/runtime-bootstrap.ts"
}

MERGE (builderFeature:FeatureSpec {node_id: "NODE-AES-REAL-003"})
SET builderFeature += {
  feature_id: "FEAT-AES-REAL-003",
  name: "AES builder supervision",
  critical_domain: true,
  status: "ACTIVE",
  owner: "platform",
  authority_tier: "CANONICAL",
  entrypoint: "src/bootstrap/builder-launch.ts"
}

MERGE (validatorFeature:FeatureSpec {node_id: "NODE-AES-REAL-004"})
SET validatorFeature += {
  feature_id: "FEAT-AES-REAL-004",
  name: "AES validator execution and write-back gate",
  critical_domain: true,
  status: "ACTIVE",
  owner: "platform",
  authority_tier: "CANONICAL",
  entrypoint: "src/postbuild/validator-coordinator.ts"
}

MERGE (registryFeature:FeatureSpec {node_id: "NODE-AES-REAL-005"})
SET registryFeature += {
  feature_id: "FEAT-AES-REAL-005",
  name: "AES artifact registry and audit trail",
  critical_domain: true,
  status: "ACTIVE",
  owner: "platform",
  authority_tier: "CANONICAL",
  entrypoint: "schema.sql"
}

MERGE (frontendShellFeature:FeatureSpec {node_id: "NODE-AES-REAL-006"})
SET frontendShellFeature += {
  feature_id: "FEAT-AES-REAL-006",
  name: "AES frontend shell and collaboration surface",
  critical_domain: false,
  status: "ACTIVE",
  owner: "frontend",
  authority_tier: "CANONICAL",
  entrypoint: "src/ui/operator-http-server.ts"
}

MERGE (notificationFeature:FeatureSpec {node_id: "NODE-AES-REAL-007"})
SET notificationFeature += {
  feature_id: "FEAT-AES-REAL-007",
  name: "AES attention queue and notification center",
  critical_domain: false,
  status: "ACTIVE",
  owner: "frontend",
  authority_tier: "CANONICAL",
  entrypoint: "src/ui/operator-http-server.ts"
}

MERGE (onboardingFeature:FeatureSpec {node_id: "NODE-AES-REAL-008"})
SET onboardingFeature += {
  feature_id: "FEAT-AES-REAL-008",
  name: "AES request onboarding and activation flow",
  critical_domain: false,
  status: "ACTIVE",
  owner: "frontend",
  authority_tier: "CANONICAL",
  entrypoint: "src/ui/operator-http-server.ts"
}

MERGE (workflowFeature:FeatureSpec {node_id: "NODE-AES-REAL-009"})
SET workflowFeature += {
  feature_id: "FEAT-AES-REAL-009",
  name: "AES build detail and workflow review surface",
  critical_domain: false,
  status: "ACTIVE",
  owner: "frontend",
  authority_tier: "CANONICAL",
  entrypoint: "src/ui/operator-http-server.ts"
}

MERGE (operatorService:RuntimeService {node_id: "NODE-AES-REAL-101"})
SET operatorService += {
  name: "aes-platform-operator-server",
  authority_tier: "CANONICAL",
  role: "operator-console",
  status: "ACTIVE",
  critical_domain: true,
  authority_tier: "CANONICAL",
  entrypoint: "src/ui/operator-http-server.ts"
}

MERGE (cliSurface:InterfaceSurface {node_id: "NODE-AES-REAL-102"})
SET cliSurface += {
  name: "aes-platform-cli",
  authority_tier: "CANONICAL",
  kind: "cli",
  commands: [
    "serve",
    "health",
    "prepare-build",
    "run-builder",
    "abort-builder",
    "record-diff",
    "record-test-run",
    "run-validators"
  ],
  entrypoint: "src/cli/aes-platform.ts"
}

MERGE (httpSurface:InterfaceSurface {node_id: "NODE-AES-REAL-103"})
SET httpSurface += {
  name: "aes-platform-http",
  authority_tier: "CANONICAL",
  kind: "http",
  route_prefix: "/api",
  workflow_routes: [
    "/api/builds/prepare",
    "/api/builds/:buildId/run-builder",
    "/api/builds/:buildId/abort-builder",
    "/api/builds/:buildId/record-diff",
    "/api/builds/:buildId/record-test-run",
    "/api/builds/:buildId/run-validators"
  ],
  authority_tier: "CANONICAL",
  entrypoint: "src/ui/operator-http-server.ts"
}

MERGE (bootstrapService:RuntimeService {node_id: "NODE-AES-REAL-104"})
SET bootstrapService += {
  name: "runtime-bootstrap",
  authority_tier: "CANONICAL",
  role: "service-bootstrap",
  status: "ACTIVE",
  critical_domain: true,
  authority_tier: "CANONICAL",
  entrypoint: "src/bootstrap/runtime-bootstrap.ts"
}

MERGE (builderService:RuntimeService {node_id: "NODE-AES-REAL-105"})
SET builderService += {
  name: "builder-session-manager",
  authority_tier: "CANONICAL",
  role: "builder-supervisor",
  status: "ACTIVE",
  critical_domain: true,
  entrypoint: "src/sessions/local-process-session-manager.ts"
}

MERGE (validatorService:RuntimeService {node_id: "NODE-AES-REAL-106"})
SET validatorService += {
  name: "validator-coordinator",
  authority_tier: "CANONICAL",
  role: "postbuild-governor",
  status: "ACTIVE",
  critical_domain: true,
  authority_tier: "CANONICAL",
  entrypoint: "src/postbuild/validator-coordinator.ts"
}

MERGE (truthService:RuntimeService {node_id: "NODE-AES-REAL-107"})
SET truthService += {
  name: "neo4j-truth-adapter",
  authority_tier: "CANONICAL",
  role: "graph-truth-adapter",
  status: "ACTIVE",
  critical_domain: true,
  entrypoint: "src/adapters/neo4j-truth-adapter.ts"
}

MERGE (registryService:RuntimeService {node_id: "NODE-AES-REAL-108"})
SET registryService += {
  name: "artifact-registry",
  authority_tier: "CANONICAL",
  role: "append-only-store",
  status: "ACTIVE",
  critical_domain: true,
  entrypoint: "src/registry/registry.ts"
}

MERGE (postgresStore:DataStore {node_id: "NODE-AES-REAL-201"})
SET postgresStore += {
  name: "aes-platform-postgres",
  authority_tier: "CANONICAL",
  engine: "postgres",
  mode: "append-only",
  status: "ACTIVE",
  connection_env: "AES_POSTGRES_URL"
}

MERGE (neo4jStore:DataStore {node_id: "NODE-AES-REAL-202"})
SET neo4jStore += {
  name: "aes-platform-neo4j",
  authority_tier: "CANONICAL",
  engine: "neo4j",
  mode: "graph-truth",
  status: "ACTIVE",
  connection_env: "AES_NEO4J_URI"
}

MERGE (artifactStore:DataStore {node_id: "NODE-AES-REAL-203"})
SET artifactStore += {
  name: "local-artifact-store",
  authority_tier: "CANONICAL",
  engine: "filesystem",
  mode: "blob-store",
  status: "ACTIVE",
  root_env: "AES_ARTIFACT_STORE_DIR"
}

MERGE (scopeRule:GovernanceRule {node_id: "NODE-AES-REAL-301"})
SET scopeRule += {
  name: "write-scope-boundary",
  critical_domain: true,
  authority_tier: "CANONICAL",
  severity: "HIGH",
  enforced_by: "ScopeGuard"
}

MERGE (validationRule:GovernanceRule {node_id: "NODE-AES-REAL-302"})
SET validationRule += {
  name: "validator-consensus-before-write-back",
  critical_domain: true,
  authority_tier: "CANONICAL",
  severity: "HIGH",
  enforced_by: "ValidatorCoordinator"
}

MERGE (supervisionRule:GovernanceRule {node_id: "NODE-AES-REAL-303"})
SET supervisionRule += {
  name: "supervised-builder-command-only",
  critical_domain: true,
  authority_tier: "CANONICAL",
  severity: "HIGH",
  enforced_by: "builder-launch"
}

MERGE (operatorFeature)-[edge001:IMPLEMENTS {edge_id: "EDGE-AES-REAL-001"}]->(operatorService)
SET edge001 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (operatorFeature)-[edge002:EXPOSES {edge_id: "EDGE-AES-REAL-002"}]->(cliSurface)
SET edge002 += {
  source: "live-runtime",
  relationship_kind: "operator_surface"
}

MERGE (operatorFeature)-[edge003:EXPOSES {edge_id: "EDGE-AES-REAL-003"}]->(httpSurface)
SET edge003 += {
  source: "live-runtime",
  relationship_kind: "operator_surface"
}

MERGE (operatorFeature)-[edge004:USES {edge_id: "EDGE-AES-REAL-004"}]->(builderService)
SET edge004 += {
  source: "live-runtime",
  relationship_kind: "supervision_dependency"
}

MERGE (operatorFeature)-[edge005:USES {edge_id: "EDGE-AES-REAL-005"}]->(validatorService)
SET edge005 += {
  source: "live-runtime",
  relationship_kind: "workflow_dependency"
}

MERGE (operatorFeature)-[edge006:READS_FROM {edge_id: "EDGE-AES-REAL-006"}]->(neo4jStore)
SET edge006 += {
  source: "live-runtime",
  relationship_kind: "truth_source"
}

MERGE (operatorFeature)-[edge007:WRITES_TO {edge_id: "EDGE-AES-REAL-007"}]->(postgresStore)
SET edge007 += {
  source: "live-runtime",
  relationship_kind: "registry_sink"
}

MERGE (operatorFeature)-[edge008:WRITES_TO {edge_id: "EDGE-AES-REAL-008"}]->(artifactStore)
SET edge008 += {
  source: "live-runtime",
  relationship_kind: "artifact_sink"
}

MERGE (operatorFeature)-[edge009:ENFORCES {edge_id: "EDGE-AES-REAL-009"}]->(scopeRule)
SET edge009 += {
  source: "live-runtime",
  relationship_kind: "governance_rule"
}

MERGE (operatorFeature)-[edge010:ENFORCES {edge_id: "EDGE-AES-REAL-010"}]->(validationRule)
SET edge010 += {
  source: "live-runtime",
  relationship_kind: "governance_rule"
}

MERGE (operatorFeature)-[edge011:ENFORCES {edge_id: "EDGE-AES-REAL-011"}]->(supervisionRule)
SET edge011 += {
  source: "live-runtime",
  relationship_kind: "governance_rule"
}

MERGE (operatorFeature)-[edge012:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-012"}]->(bootstrapFeature)
SET edge012 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}

MERGE (operatorFeature)-[edge013:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-013"}]->(builderFeature)
SET edge013 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}

MERGE (operatorFeature)-[edge014:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-014"}]->(validatorFeature)
SET edge014 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}

MERGE (operatorFeature)-[edge015:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-015"}]->(registryFeature)
SET edge015 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}

MERGE (bootstrapFeature)-[edge016:IMPLEMENTS {edge_id: "EDGE-AES-REAL-016"}]->(bootstrapService)
SET edge016 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (bootstrapFeature)-[edge017:READS_FROM {edge_id: "EDGE-AES-REAL-017"}]->(neo4jStore)
SET edge017 += {
  source: "live-runtime",
  relationship_kind: "seed_source"
}

MERGE (bootstrapFeature)-[edge018:WRITES_TO {edge_id: "EDGE-AES-REAL-018"}]->(postgresStore)
SET edge018 += {
  source: "live-runtime",
  relationship_kind: "schema_initializer"
}

MERGE (bootstrapFeature)-[edge019:WRITES_TO {edge_id: "EDGE-AES-REAL-019"}]->(artifactStore)
SET edge019 += {
  source: "live-runtime",
  relationship_kind: "artifact_initializer"
}

MERGE (builderFeature)-[edge020:IMPLEMENTS {edge_id: "EDGE-AES-REAL-020"}]->(builderService)
SET edge020 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (builderFeature)-[edge021:READS_FROM {edge_id: "EDGE-AES-REAL-021"}]->(neo4jStore)
SET edge021 += {
  source: "live-runtime",
  relationship_kind: "bridge_context_source"
}

MERGE (builderFeature)-[edge022:WRITES_TO {edge_id: "EDGE-AES-REAL-022"}]->(artifactStore)
SET edge022 += {
  source: "live-runtime",
  relationship_kind: "builder_output_sink"
}

MERGE (builderFeature)-[edge023:ENFORCES {edge_id: "EDGE-AES-REAL-023"}]->(supervisionRule)
SET edge023 += {
  source: "live-runtime",
  relationship_kind: "governance_rule"
}

MERGE (validatorFeature)-[edge024:IMPLEMENTS {edge_id: "EDGE-AES-REAL-024"}]->(validatorService)
SET edge024 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (validatorFeature)-[edge025:READS_FROM {edge_id: "EDGE-AES-REAL-025"}]->(postgresStore)
SET edge025 += {
  source: "live-runtime",
  relationship_kind: "validation_source"
}

MERGE (validatorFeature)-[edge026:WRITES_TO {edge_id: "EDGE-AES-REAL-026"}]->(artifactStore)
SET edge026 += {
  source: "live-runtime",
  relationship_kind: "validation_evidence_sink"
}

MERGE (validatorFeature)-[edge027:ENFORCES {edge_id: "EDGE-AES-REAL-027"}]->(validationRule)
SET edge027 += {
  source: "live-runtime",
  relationship_kind: "governance_rule"
}

MERGE (registryFeature)-[edge028:IMPLEMENTS {edge_id: "EDGE-AES-REAL-028"}]->(registryService)
SET edge028 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (registryFeature)-[edge029:READS_FROM {edge_id: "EDGE-AES-REAL-029"}]->(postgresStore)
SET edge029 += {
  source: "live-runtime",
  relationship_kind: "registry_source"
}

MERGE (registryFeature)-[edge030:WRITES_TO {edge_id: "EDGE-AES-REAL-030"}]->(postgresStore)
SET edge030 += {
  source: "live-runtime",
  relationship_kind: "registry_sink"
}

MERGE (registryFeature)-[edge031:USES {edge_id: "EDGE-AES-REAL-031"}]->(truthService)
SET edge031 += {
  source: "live-runtime",
  relationship_kind: "freshness_dependency"
}

MERGE (frontendShellFeature)-[edge032:IMPLEMENTS {edge_id: "EDGE-AES-REAL-032"}]->(operatorService)
SET edge032 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (frontendShellFeature)-[edge033:EXPOSES {edge_id: "EDGE-AES-REAL-033"}]->(httpSurface)
SET edge033 += {
  source: "live-runtime",
  relationship_kind: "operator_surface"
}

MERGE (frontendShellFeature)-[edge034:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-034"}]->(operatorFeature)
SET edge034 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}

MERGE (notificationFeature)-[edge035:IMPLEMENTS {edge_id: "EDGE-AES-REAL-035"}]->(operatorService)
SET edge035 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (notificationFeature)-[edge036:EXPOSES {edge_id: "EDGE-AES-REAL-036"}]->(httpSurface)
SET edge036 += {
  source: "live-runtime",
  relationship_kind: "operator_surface"
}

MERGE (notificationFeature)-[edge037:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-037"}]->(frontendShellFeature)
SET edge037 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}

MERGE (onboardingFeature)-[edge038:IMPLEMENTS {edge_id: "EDGE-AES-REAL-038"}]->(operatorService)
SET edge038 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (onboardingFeature)-[edge039:EXPOSES {edge_id: "EDGE-AES-REAL-039"}]->(httpSurface)
SET edge039 += {
  source: "live-runtime",
  relationship_kind: "operator_surface"
}

MERGE (onboardingFeature)-[edge040:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-040"}]->(frontendShellFeature)
SET edge040 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}

MERGE (workflowFeature)-[edge041:IMPLEMENTS {edge_id: "EDGE-AES-REAL-041"}]->(operatorService)
SET edge041 += {
  source: "live-runtime",
  relationship_kind: "feature_impl"
}

MERGE (workflowFeature)-[edge042:EXPOSES {edge_id: "EDGE-AES-REAL-042"}]->(httpSurface)
SET edge042 += {
  source: "live-runtime",
  relationship_kind: "operator_surface"
}

MERGE (workflowFeature)-[edge043:DEPENDS_ON_FEATURE {edge_id: "EDGE-AES-REAL-043"}]->(frontendShellFeature)
SET edge043 += {
  source: "live-runtime",
  relationship_kind: "feature_dependency"
}
