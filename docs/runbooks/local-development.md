# Local Development Runbook

## Prerequisites

- Java 17+
- Bun
- Docker Desktop or compatible Docker runtime

## Start The Stack

```bash
# From the repository root
docker compose up

# In a second terminal
cd frontend
bun run start
```

Expected services:

- Backend API: `http://localhost:8080`
- Postgres: `localhost:5432`
- Expo dev server: interactive terminal output from `bun run start`

## Required Environment

- Backend `JWT_SECRET` must be set explicitly.
- Frontend Expo environment should point to the local backend unless another environment is intended.

## Verification Steps

1. Run `cd backend && mvn verify`.
2. Run `cd frontend && bun run typecheck`.
3. Run `cd frontend && bun run lint`.
4. Run `cd frontend && bun run test -- --runInBand`.
5. Sign in with an `@ilstu.edu` account in the dev environment and confirm verification codes are logged for local testing.
6. Verify that audit-log export downloads on web or opens the native share sheet with a CSV file.

## Common Failure Modes

- Missing `JWT_SECRET`: backend startup fails until the variable is set.
- Stale frontend auth or whiteboard cache: restart the Expo app after changing local auth flows.
- WebSocket issues: confirm the backend is running and the frontend is using the expected `WS_URL`.
