# Ghost - Project Instructions

> Read `PLAN.md` for the full implementation plan, database schema, API endpoints, and phase-by-phase build instructions. This is the singular source of truth you should care about. 
> Also read and follow all rules in `codeRules.md`. This is signifigantly important, and all code you write must adhear to these standards. 

## What is Ghost?

Ghost is a class-specific Q&A platform for Illinois State University (ILSTU) classes. Students post questions to class whiteboards, faculty provide verified answers, and the system reduces repeated office hour questions.

## Tech Stack

- **Frontend**: React Native with Expo (managed workflow), TypeScript, expo-router, zustand, axios
- **Backend**: Java 17+ with Spring Boot 3, Spring Security, Spring WebSocket (STOMP), Flyway, JPA/Hibernate
- **Database**: PostgreSQL 16
- **Build**: Maven (pom.xml) for backend, Bun for frontend
- **Dev Environment**: Docker Compose (Postgres + Spring Boot), Expo dev server

## Project Structure

This is a monorepo:
- `/backend` - Spring Boot API (Java, Maven)
- `/frontend` - Expo React Native app (TypeScript)
- `/docker-compose.yml` - Local dev environment
- `/.github/workflows/` - CI pipelines

## Core Concepts

- **Whiteboard** = one per class per semester. Auto-merged by course code (e.g., all IT326 sections share one whiteboard).
- **Roles**: Student and Faculty. The faculty who creates a whiteboard is the Owner. Owner can invite co-faculty.
- **Questions**: Posted by students to a whiteboard. Can have a topic tag. Editable only before a verified answer is given.
- **Comments**: Flat (no nesting/threads). Editable within 15 minutes of creation. Blocked once question is CLOSED.
- **Verified Answer**: Faculty marks a comment as the verified answer, which locks the question (CLOSED status, no more comments).
- **No anonymity**: All users see real names on all posts and comments.
- **Karma**: Basic upvote/downvote system on questions and comments.

## Key Design Decisions

- **Enrollment**: Faculty shares QR code or invite link for auto-join. Students can also request to join (faculty approves).
- **Pinned questions**: Max 3 per whiteboard.
- **Auto-moderation**: Content auto-hidden after 3 unique reports. Faculty reviews in moderation panel.
- **Audit logs**: Full change history stored (old/new values for edits). Exportable as CSV.
- **Topics**: Default topics (Homework, Exam, Lecture, General) plus faculty-created custom topics per whiteboard.
- **Search**: PostgreSQL full-text search (tsvector/tsquery) with topic/status/whiteboard filters.
- **Real-time**: WebSockets via STOMP for live feed updates. Expo Push Notifications for device notifications.
- **Email verification**: @ilstu.edu required. In dev, verification codes are logged to console (no actual email sending).
- **Rate limiting**: In-memory rate limiting via Bucket4j. 100 req/min for auth endpoints, 300 req/min for general API.
- **Ownership transfer**: When transferred, the original owner is removed from the whiteboard entirely.
- **UI Style**: Modern glassmorphism - semi-transparent cards with blur, gradient backgrounds, rounded corners.

## Running Locally

```bash
# Start Postgres + backend
docker compose up

# Start frontend (in another terminal)
cd frontend
bun run start
```

Backend runs on `http://localhost:8080`, Postgres on port `5432` (db: `ghost_db`, user: `ghost_user`, pass: `ghost_pass`).

## Development Guidelines

### Backend
- Follow standard Spring Boot conventions (Controller -> Service -> Repository layers)
- All mutating actions MUST call `AuditLogService.logAction()` to record the change
- Use DTOs for all request/response payloads (never expose entities directly)
- All list endpoints must be paginated (default page size: 20)
- Validate all inputs with `@Valid` and Bean Validation annotations
- Use proper HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
- Global exception handler in `GlobalExceptionHandler.java`
- JWT access tokens expire in 15 minutes, refresh tokens in 7 days
- Write JUnit 5 tests for services and controllers

### Frontend
- Use expo-router file-based routing
- Use zustand for global state (auth, whiteboard)
- Use axios with interceptors for API calls (auto-attach JWT, auto-refresh on 401)
- Glassmorphism style: `expo-blur` BlurView (intensity 50-80), `rgba(255,255,255,0.15)` backgrounds, border-radius 16-20px, `rgba(255,255,255,0.3)` borders, deep purple/indigo primary color
- TypeScript strict mode
- Components go in `/components`, hooks in `/hooks`, API services in `/services`

### Database
- Flyway migrations in `/backend/src/main/resources/db/migration/`
- Migration naming: `V{number}__{description}.sql`
- Never modify existing migrations - always create new ones
- Use UUIDs for all primary keys

## Build Order

Follow PLAN.md phases 1-9 sequentially. Each phase builds on the previous. Within each phase, build backend first, then frontend.

## Environment Variables

Backend (`application.yml`):
- `SPRING_DATASOURCE_URL`: jdbc:postgresql://localhost:5432/ghost_db
- `SPRING_DATASOURCE_USERNAME`: ghost_user
- `SPRING_DATASOURCE_PASSWORD`: ghost_pass
- `JWT_SECRET`: (generate a secure random string, min 256 bits)
- `JWT_ACCESS_EXPIRATION_MS`: 900000 (15 min)
- `JWT_REFRESH_EXPIRATION_MS`: 604800000 (7 days)
