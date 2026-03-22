# Claude Bypass Quick Start

This is the fastest way to get `claude` running on an AES build.

In this doc, "bypass" means:

- use AES to prepare the build
- launch `claude` immediately
- skip the rest of the audit flow for now

This is useful for quick operator testing.

It is not the full closeout flow.
If you want a finalized AES record, you still need:

- `record-diff`
- `record-test-run`
- `run-validators`

## Run Commands From

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

## 3. Prepare a Build

Pick the feature ID that matches the work:

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
    "intent": "Run Claude on this build",
    "requested_by": "you"
  },
  "scope": { "paths": ["src/**"] },
  "read_scope": { "paths": ["src/**"] },
  "write_scope": { "paths": ["src/**"] },
  "acceptance_criteria": [
    {
      "id": "AC-1",
      "description": "Claude can work the build",
      "type": "functional",
      "mandatory": true
    }
  ],
  "test_cases": [
    {
      "id": "TC-1",
      "description": "Smoke test placeholder",
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

If this is backend work, use `FEAT-AES-REAL-001` instead.

## 4. Run Claude

This repo already defaults to `claude`, so the normal command is:

```bash
node dist/cli/aes-platform.js run-builder <build-id>
```

If you want to force `claude` explicitly, run:

```bash
AES_BUILDER_COMMAND=claude AES_BUILDER_ARGS_JSON='["-p","{{prompt}}"]' node dist/cli/aes-platform.js run-builder <build-id>
```

## 5. Stop Claude If Needed

```bash
node dist/cli/aes-platform.js abort-builder <build-id>
```

## 6. If You Want The Full AES Finish

Continue with:

```bash
node dist/cli/aes-platform.js record-diff <build-id> --input -
node dist/cli/aes-platform.js record-test-run <build-id> --input -
node dist/cli/aes-platform.js run-validators <build-id>
```

## 7. Open The Operator Page

`http://127.0.0.1:4100`

## 8. Stop AES

```bash
npm run stack:down
```

This stops services without deleting them.
