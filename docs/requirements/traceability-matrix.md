# Traceability Matrix

This matrix keeps the current codebase aligned with `codeRules.md` by mapping acceptance criteria to implementation and automated checks.

| ID | Requirement Summary | Primary Implementation | Automated Coverage |
|---|---|---|---|
| `AC1` | Unverified users cannot log in until email verification succeeds | `backend/src/main/java/com/ghost/service/AuthService.java` | `backend/src/test/java/com/ghost/service/AuthServiceTest.java` |
| `AC2` | Whiteboard creation auto-merges by course code and semester | `backend/src/main/java/com/ghost/service/WhiteboardService.java` | `backend/src/test/java/com/ghost/service/WhiteboardServiceTest.java` |
| `AC3` | Verified answers store verifier identity and close the question | `backend/src/main/java/com/ghost/service/CommentService.java`, `backend/src/main/java/com/ghost/service/QuestionService.java` | `backend/src/test/java/com/ghost/service/CommentServiceTest.java`, `backend/src/test/java/com/ghost/service/QuestionServiceTest.java` |
| `AC4` | Mutating actions remain auditable with before/after context | `backend/src/main/java/com/ghost/service/AuditLogService.java`, `backend/src/main/java/com/ghost/service/UserService.java`, `backend/src/main/java/com/ghost/service/ReportService.java` | `backend/src/test/java/com/ghost/service/UserServiceTest.java`, `backend/src/test/java/com/ghost/service/ReportServiceTest.java` |
| `AC5` | Moderation reports can be listed, reviewed, and dismissed with the latest payload shape | `backend/src/main/java/com/ghost/service/ReportService.java`, `frontend/services/reportService.ts` | `backend/src/test/java/com/ghost/service/ReportServiceTest.java`, `frontend/services/reportService.test.ts` |
| `AC6` | WebSocket question events keep the whiteboard feed in sync | `frontend/hooks/useWhiteboardDetailModel.ts`, `frontend/utils/questionEvents.ts`, `backend/src/main/java/com/ghost/service/QuestionService.java` | `frontend/utils/questionEvents.test.ts`, `backend/src/test/java/com/ghost/service/QuestionServiceTest.java` |
