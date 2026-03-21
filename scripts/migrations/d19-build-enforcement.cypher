// ───────────────────────────────────────────────────────────
// D19 Build Enforcement — Neo4j Migration
// Schema version: v12 (extends v11 from D17-D18)
// ───────────────────────────────────────────────────────────

// ─── Constraints ───

CREATE CONSTRAINT protocolviolation_id_unique IF NOT EXISTS
FOR (pv:ProtocolViolation) REQUIRE pv.id IS UNIQUE;

CREATE CONSTRAINT failurecase_id_unique IF NOT EXISTS
FOR (fc:FailureCase) REQUIRE fc.id IS UNIQUE;

// ─── Indexes ───

// ProtocolViolation indexes for common query patterns
CREATE INDEX pv_projectId IF NOT EXISTS FOR (pv:ProtocolViolation) ON (pv.projectId);
CREATE INDEX pv_violationType IF NOT EXISTS FOR (pv:ProtocolViolation) ON (pv.violationType);
CREATE INDEX pv_stage IF NOT EXISTS FOR (pv:ProtocolViolation) ON (pv.stage);
CREATE INDEX pv_severity IF NOT EXISTS FOR (pv:ProtocolViolation) ON (pv.severity);
CREATE INDEX pv_status IF NOT EXISTS FOR (pv:ProtocolViolation) ON (pv.status);
CREATE INDEX pv_createdAt IF NOT EXISTS FOR (pv:ProtocolViolation) ON (pv.createdAt);

// FailureCase indexes for common query patterns
CREATE INDEX fc_projectId IF NOT EXISTS FOR (fc:FailureCase) ON (fc.projectId);
CREATE INDEX fc_featureType IF NOT EXISTS FOR (fc:FailureCase) ON (fc.featureType);
CREATE INDEX fc_domain IF NOT EXISTS FOR (fc:FailureCase) ON (fc.domain);
CREATE INDEX fc_detectedBy IF NOT EXISTS FOR (fc:FailureCase) ON (fc.detectedBy);
CREATE INDEX fc_severity IF NOT EXISTS FOR (fc:FailureCase) ON (fc.severity);
CREATE INDEX fc_status IF NOT EXISTS FOR (fc:FailureCase) ON (fc.status);
CREATE INDEX fc_createdAt IF NOT EXISTS FOR (fc:FailureCase) ON (fc.createdAt);

// ─── Verification ───

// Verify constraints exist
SHOW CONSTRAINTS
WHERE name IN ['protocolviolation_id_unique', 'failurecase_id_unique']
RETURN name, type, entityType, labelsOrTypes, properties;

// Verify indexes exist
SHOW INDEXES
WHERE name STARTS WITH 'pv_' OR name STARTS WITH 'fc_'
RETURN name, type, entityType, labelsOrTypes, properties;
