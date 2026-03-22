# AES User Manual

This is the simplest way to use AES in this repo.

If you want the shortest version, use [QUICKSTART.md](/Users/sunday/Desktop/aes%20research/src/artifact-registry/QUICKSTART.md).

If you want the fastest Claude-only path, use [CLAUDE_BYPASS_QUICKSTART.md](/Users/sunday/Desktop/aes%20research/src/artifact-registry/CLAUDE_BYPASS_QUICKSTART.md).

## What AES Does

AES helps you run a supervised build workflow:

1. Prepare a build
2. Run the builder
3. Record what changed
4. Record test results
5. Run validators
6. Finalize the build

In this setup:

- `Postgres` stores build records and audit history
- `Neo4j` stores graph truth and feature relationships
- the operator server runs at `http://127.0.0.1:4100`
- the default supervised builder is `claude`

## Where To Run Commands

Run all commands from:

```bash
/Users/sunday/Desktop/aes research/src/artifact-registry
```

## Start AES

Start the live stack:

```bash
npm run start:real
```

This starts:

- local Postgres
- local Neo4j
- the AES operator server

## Check Health

Use either:

```bash
npm run health:live
```

or open:

`http://127.0.0.1:4100/api/health`

If health is good, AES is ready.

## Open The Operator Page

Open:

`http://127.0.0.1:4100`

The page is a simple operator console.

## Pick The Right Feature ID

Use the feature ID that matches the kind of work you want AES to supervise:

- `FEAT-AES-REAL-001` backend and operator work
- `FEAT-AES-REAL-006` frontend shell and collaboration UI
- `FEAT-AES-REAL-007` notifications and attention queue UI
- `FEAT-AES-REAL-008` onboarding and activation UI
- `FEAT-AES-REAL-009` workflow and detail-view UI

Simple rule:

- backend change: use `FEAT-AES-REAL-001`
- frontend change: use the frontend feature ID that matches the screen or flow

## Normal Happy Path

### 1. Prepare a build

Run:

```bash
node dist/cli/aes-platform.js prepare-build --input -
```

Paste JSON like this:

```json
{
  "submit_request": {
    "feature_id": "FEAT-AES-REAL-007",
    "intent": "Make a change",
    "requested_by": "you"
  },
  "scope": { "paths": ["src/**"] },
  "read_scope": { "paths": ["src/**"] },
  "write_scope": { "paths": ["src/**"] },
  "acceptance_criteria": [
    {
      "id": "AC-1",
      "description": "Change works",
      "type": "functional",
      "mandatory": true
    }
  ],
  "test_cases": [
    {
      "id": "TC-1",
      "description": "Smoke test",
      "type": "integration",
      "linked_criterion_id": "AC-1",
      "mandatory": true
    }
  ],
  "confidence_breakdown": {
    "graph_coverage": 0.95,
    "pattern_strength": 0.90,
    "rule_consistency": 0.92,
    "evidence_level": 0.90
  }
}
```

AES returns a `build_id`.

### 2. Run the builder

Replace `<build-id>` with the real build ID:

```bash
node dist/cli/aes-platform.js run-builder <build-id>
```

If the builder gets stuck or should stop:

```bash
node dist/cli/aes-platform.js abort-builder <build-id>
```

### 3. Record the diff

Run:

```bash
node dist/cli/aes-platform.js record-diff <build-id> --input -
```

Paste JSON like this:

```json
{
  "changed_files": [
    {
      "path": "src/ui/operator-http-server.ts",
      "change_type": "modified",
      "lines_added": 10,
      "lines_removed": 2
    }
  ],
  "diff_text": "diff --git a/src/ui/operator-http-server.ts b/src/ui/operator-http-server.ts"
}
```

### 4. Record the test run

Run:

```bash
node dist/cli/aes-platform.js record-test-run <build-id> --input -
```

Paste JSON like this:

```json
{
  "status": "PASS",
  "test_cases_run": 3,
  "passed": 3,
  "failed": 0,
  "skipped": 0,
  "output_text": "all tests passed"
}
```

### 5. Run validators

Run:

```bash
node dist/cli/aes-platform.js run-validators <build-id>
```

If validation passes, AES finalizes the build.

## Fast Version

If you just want the shortest checklist:

```bash
npm run start:real
npm run health:live
node dist/cli/aes-platform.js prepare-build --input -
node dist/cli/aes-platform.js run-builder <build-id>
node dist/cli/aes-platform.js record-diff <build-id> --input -
node dist/cli/aes-platform.js record-test-run <build-id> --input -
node dist/cli/aes-platform.js run-validators <build-id>
```

## HTTP API

AES also exposes HTTP routes:

- `POST /api/builds/prepare`
- `POST /api/builds/:buildId/run-builder`
- `POST /api/builds/:buildId/abort-builder`
- `POST /api/builds/:buildId/record-diff`
- `POST /api/builds/:buildId/record-test-run`
- `POST /api/builds/:buildId/run-validators`
- `GET /api/health`

Base URL:

`http://127.0.0.1:4100`

## Stop The Local Stack

Stop the local services without deleting them:

```bash
npm run stack:down
```

## Important Notes

- `127.0.0.1` means AES is only available on your machine
- `stack:down` stops services but does not delete containers or volumes
- `.env.local` controls the live configuration
- `FEAT-AES-REAL-001` is the main backend/operator feature
- `FEAT-AES-REAL-006` to `FEAT-AES-REAL-009` are the frontend-ready seeded features
