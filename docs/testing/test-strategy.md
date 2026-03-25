# Test Strategy

## Goal

Ghost uses automated tests to protect domain rules, UI contracts, and key client-side state transitions without relying on manual regression checks.
Core workflow tests should reference acceptance-criteria IDs from `docs/requirements/software-requirements.md` when they cover a user-visible contract.

## Test Layers

- Backend architecture tests: enforce controller, repository, and query contracts.
- Backend mapper contract tests: keep mapper classes repository-free and move lookup work into assembler services.
- Backend service tests: verify domain workflows such as verified answers and authentication.
- Frontend component tests: cover reusable cards and glass UI primitives.
- Frontend store and utility tests: cover notification state, whiteboard state, formatting, sanitization, and event parsing.
- Frontend service tests: cover API contract normalization, cache invalidation, and pagination behavior.

## Coverage Gates

- Backend JaCoCo bundle minimums:
  - Line coverage: `25%`
  - Branch coverage: `20%`
- Frontend Jest global minimums:
  - Branches: `50%`
  - Functions: `52%`
  - Lines: `58%`
  - Statements: `58%`

The backend thresholds were raised after extracting pure mappers, support services, and explicit architecture tests. The frontend gate stays focused on services, hooks, and event-processing utilities instead of only low-risk UI primitives.

## Commands

```bash
# Backend
cd backend
mvn verify

# Frontend
cd frontend
bun run typecheck
bun run lint
bun run test -- --runInBand
```

## Review Checklist

- Does the change modify DTOs, migrations, or API behavior? Add backend and frontend contract coverage.
- Does the change introduce caching or local state? Add invalidation or deduplication tests.
- Does the change affect moderation, audit logging, or verified answers? Confirm audit paths and faculty-only behavior.
- Does the change move orchestration into a hook or utility? Add focused tests for the extracted logic.
