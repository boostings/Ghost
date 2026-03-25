# Software Requirements

## Purpose

Ghost is a class-specific Q&A platform for Illinois State University classes. The system reduces repeated office hour questions by giving each course whiteboard a persistent question feed and a faculty-owned verified-answer workflow.

## Stakeholders

- Students: ask questions, comment, vote, search, bookmark, and receive notifications.
- Faculty: create whiteboards, moderate content, verify answers, manage membership, and export audit logs.
- Course staff: co-manage whiteboards after invitation or ownership transfer.

## Functional Requirements

1. The system shall create one whiteboard per course code and semester, shared across sections.
2. The system shall require `@ilstu.edu` email verification before granting full access.
3. The system shall allow students to post, edit, delete, search, report, and bookmark questions they are authorized to view.
4. The system shall allow members to add flat comments to open questions.
5. The system shall prevent new comments once a question is closed.
6. The system shall let faculty mark a single comment as the verified answer.
7. The system shall record which faculty member verified an answer.
8. The system shall close the parent question immediately after a verified answer is chosen.
9. The system shall log every mutating action in the audit log, including before and after values where applicable.
10. The system shall export audit logs as CSV for faculty review.
11. The system shall auto-hide content after three unique reports and surface it in moderation flows.
12. The system shall support live feed updates through WebSockets and unread notification tracking.

## Quality Requirements

- Security: JWT access tokens expire after 15 minutes and refresh tokens after 7 days.
- Security: no default JWT secret may be embedded in committed configuration.
- Traceability: DTOs, migrations, tests, and UI contracts must stay aligned with the domain model.
- Maintainability: screen components should delegate orchestration to hooks or services instead of embedding large multi-concern workflows.
- Maintainability: mapper classes should stay pure; repository-backed enrichment belongs in services or assembler layers.
- Testability: backend and frontend pipelines must enforce meaningful coverage gates instead of placeholder thresholds.
- Auditability: faculty-visible actions must be reconstructable from stored audit data and exported artifacts.

## Acceptance Signals

- `backend`: `mvn verify` passes.
- `frontend`: `bun run typecheck`, `bun run lint`, and `bun run test -- --runInBand` pass.
- Verified-answer responses include verifier identity.
- Audit-log export produces an actual downloadable or shareable artifact.
- Documentation in `docs/` stays consistent with `PLAN.md` and `codeRules.md`.

## Acceptance Criteria IDs

The repo uses these IDs for test and review traceability.

- `AC1`: Unverified users cannot authenticate until `@ilstu.edu` email verification succeeds.
- `AC2`: Whiteboard creation auto-merges faculty into an existing course-code plus semester whiteboard.
- `AC3`: Faculty verification records `verifiedBy`, closes the question, and returns verifier identity.
- `AC4`: Mutating user, moderation, and question actions write reconstructable audit-log entries.
- `AC5`: Three unique reports hide content, and faculty moderation can review or dismiss the report.
- `AC6`: Whiteboard question updates propagate through WebSocket event payloads without requiring a full refresh.
