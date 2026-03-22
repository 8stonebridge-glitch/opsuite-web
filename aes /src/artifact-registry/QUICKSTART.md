# AES Quick Start

If you want the fastest Claude-only path, use [CLAUDE_BYPASS_QUICKSTART.md](/Users/sunday/Desktop/aes%20research/src/artifact-registry/CLAUDE_BYPASS_QUICKSTART.md).

Run everything from:

```bash
/Users/sunday/Desktop/aes research/src/artifact-registry
```

## 1. Start AES

```bash
npm run start:real
```

## 2. Check Health

```bash
npm run health:live
```

Or open:

`http://127.0.0.1:4100/api/health`

## 3. Prepare a Build

Pick a feature ID first:

- `FEAT-AES-REAL-001` backend/operator
- `FEAT-AES-REAL-006` frontend shell
- `FEAT-AES-REAL-007` notifications
- `FEAT-AES-REAL-008` onboarding
- `FEAT-AES-REAL-009` workflow

Then run:

```bash
node dist/cli/aes-platform.js prepare-build --input -
```

Paste:

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

Save the returned `build_id`.

If you are doing backend work, swap that example feature ID to `FEAT-AES-REAL-001`.

## 4. Run the Build

```bash
node dist/cli/aes-platform.js run-builder <build-id>
```

If you need to stop it:

```bash
node dist/cli/aes-platform.js abort-builder <build-id>
```

## 5. Record the Diff

```bash
node dist/cli/aes-platform.js record-diff <build-id> --input -
```

Paste:

```json
{
  "changed_files": [
    {
      "path": "src/file.ts",
      "change_type": "modified",
      "lines_added": 10,
      "lines_removed": 2
    }
  ],
  "diff_text": "diff --git a/src/file.ts b/src/file.ts"
}
```

## 6. Record Test Results

```bash
node dist/cli/aes-platform.js record-test-run <build-id> --input -
```

Paste:

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

## 7. Run Validators

```bash
node dist/cli/aes-platform.js run-validators <build-id>
```

## 8. Open the Operator Page

`http://127.0.0.1:4100`

## 9. Stop AES

```bash
npm run stack:down
```

This stops services without deleting them.
