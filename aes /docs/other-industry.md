# Other Industry

This file is the working reference for expanding AES into additional industries where the system is most practical.

Use this file when deciding:
- which industries AES should target next
- which existing AES capabilities transfer well
- which AES docs already support those industries
- what reusable product primitives already exist

## 1. Where AES Fits Best

AES is most practical in industries where software is:
- rule-heavy
- workflow-driven
- multi-role
- auditable
- costly to get wrong
- repetitive enough for patterns to compound over time

Best-fit industries:
- financial services
- insurance
- healthcare operations
- compliance / regtech
- enterprise SaaS
- logistics / operations
- identity / access systems
- internal government or enterprise workflow systems

Less ideal first targets:
- highly experimental consumer apps
- creative-first products
- one-off marketing sites
- fast-changing prototype products with weak rule stability

## 2. Why These Industries Fit AES

These industries map well to `Graph -> Bridge -> Build` because they usually need:
- strict permissions and role separation
- backend-enforced business rules
- stateful workflows
- audit trails
- notifications and escalations
- reporting and operational metrics
- low tolerance for drift, hallucination, or fake completion

AES is strongest when the product behaves like an operating system for work, not just a loose UI.

## 3. Common Product Primitives Across Industries

These are the repeatable building blocks AES can reuse across multiple industries:

### Identity and access
- roles
- invitations
- onboarding
- permissions
- backend enforcement

### Workflow and case handling
- request intake
- approval / review chains
- state transitions
- delegation
- escalation
- SLAs

### Communication and coordination
- notifications
- inboxes
- assignment routing
- retry and dead-letter handling

### Oversight and evidence
- audit trail
- reporting
- freshness / timeliness indicators
- metrics
- operational dashboards

### Governance-sensitive domains
- finance
- compliance
- security
- healthcare operations
- regulated internal controls

## 4. Existing AES Assets That Already Fit These Industries

### Core AES runtime docs

These are the main architecture docs for industry-targeted AES work:

- [CLAUDE.md](/Users/sunday/Desktop/aes%20research/CLAUDE.md)
- [aes-runtime-quick-reference.md](/Users/sunday/Desktop/aes%20research/aes-runtime-quick-reference.md)
- [runtime-architecture.md](/Users/sunday/Desktop/aes%20research/docs/runtime-architecture.md)
- [artifact-model.md](/Users/sunday/Desktop/aes%20research/docs/artifact-model.md)
- [enforcement-hooks.md](/Users/sunday/Desktop/aes%20research/docs/enforcement-hooks.md)
- [state-machines.md](/Users/sunday/Desktop/aes%20research/docs/state-machines.md)
- [governance.md](/Users/sunday/Desktop/aes%20research/docs/governance.md)
- [claude-code-runtime.md](/Users/sunday/Desktop/aes%20research/docs/claude-code-runtime.md)
- [deployment-path.md](/Users/sunday/Desktop/aes%20research/docs/deployment-path.md)

Why they matter:
- they define how AES enforces correctness
- they are useful for any industry with governed workflows
- they are not industry-specific and should remain reusable platform docs

### Legacy feature execution docs that still transfer well

These are no longer the default runtime path, but they remain valuable as domain references and reusable business-pattern material:

- [approval_workflow.md](/Users/sunday/Desktop/aes%20research/aes_execution_docs_lowercase%20(7)/approval_workflow.md)
- [approval_workflow_execution_board.md](/Users/sunday/Desktop/aes%20research/aes_execution_docs_lowercase%20(7)/approval_workflow_execution_board.md)
- [onboarding.md](/Users/sunday/Desktop/aes%20research/aes_execution_docs_lowercase%20(7)/onboarding.md)
- [onboarding_execution_board.md](/Users/sunday/Desktop/aes%20research/aes_execution_docs_lowercase%20(7)/onboarding_execution_board.md)
- [notification_system.md](/Users/sunday/Desktop/aes%20research/aes_execution_docs_lowercase%20(7)/notification_system.md)
- [notification_system_execution_board.md](/Users/sunday/Desktop/aes%20research/aes_execution_docs_lowercase%20(7)/notification_system_execution_board.md)
- [reporting.md](/Users/sunday/Desktop/aes%20research/aes_execution_docs_lowercase%20(7)/reporting.md)

Why they matter:
- they encode real enterprise workflow behavior
- they already map to regulated/internal process-heavy products
- they provide reusable patterns for roles, flow sequencing, approvals, notifications, and reporting

### Graph and governance docs that support industry expansion

- [graph-retrieval.md](/Users/sunday/Desktop/aes%20research/references/graph-retrieval.md)
- [consultation-gate.md](/Users/sunday/Desktop/aes%20research/references/consultation-gate.md)
- [build-enforcement.md](/Users/sunday/Desktop/aes%20research/references/build-enforcement.md)
- [domain-normalization.md](/Users/sunday/Desktop/aes%20research/references/domain-normalization.md)
- [flow-knowledge.md](/Users/sunday/Desktop/aes%20research/references/flow-knowledge.md)
- [schema.md](/Users/sunday/Desktop/aes%20research/references/schema.md)

Why they matter:
- they define how AES grounds itself in graph truth
- they support safe adaptation into new domains
- they are critical for moving from one product vertical to another without losing control

## 5. Strong First Industry Targets

### 1. Compliance / regtech

Good fit because:
- approval and review flows are central
- evidence and auditability matter
- rules are explicit
- reporting is required

Reusable AES assets:
- approval workflow
- reporting
- notifications
- governance and validator model

### 2. Logistics / operations

Good fit because:
- role-based task routing is common
- inbox and notification behavior matter
- operational states and escalations are common
- dashboards and reporting are core

Reusable AES assets:
- onboarding
- approval workflow
- notification system
- reporting

### 3. Insurance / claims

Good fit because:
- intake, review, approval, escalation, and evidence chains are common
- multiple roles participate in stateful workflows
- decisions require traceability

Reusable AES assets:
- onboarding as intake/setup pattern
- approval workflow as case progression pattern
- notification system
- reporting

### 4. Healthcare operations

Good fit because:
- role separation matters
- stateful flows and escalations matter
- audit trails and reporting matter

Main caution:
- human governance and sensitive-domain boundaries must be stricter

### 5. Enterprise internal tooling

Good fit because:
- many internal systems are workflow-heavy
- rules and permissions are relatively stable
- reuse across builds is high

## 6. Industry Expansion Strategy

Recommended sequence:

1. Start with industries that look most like existing AES feature patterns
2. Reuse the existing workflow/onboarding/notification/reporting building blocks
3. Add industry-specific rules, anti-patterns, and constraints into the graph
4. Keep the runtime generic and push industry specialization into graph truth and bridge generation
5. Escalate to human review for protected-domain decisions

## 7. What To Work On Next For This Track

Good next work items:
- define a target-industry matrix with required graph domains per industry
- identify which existing AES feature patterns transfer directly
- define missing graph nodes/rules for the first chosen industry
- create example industry bridges for one feature in each target vertical
- decide the first industry-specific pilot product

## 8. Working Principle

AES should not become a separate platform per industry.

The platform stays the same.
What changes by industry is:
- graph truth
- constraints
- patterns
- anti-patterns
- governance sensitivity
- bridge content

That means industry expansion should happen mostly through:
- graph enrichment
- bridge generation logic
- validator rules

not by rewriting the AES runtime itself.
