# Backend Audit vs `codeRules.md` (2026-04-27)

Status of each concrete, code-level rule from §5 / §6 / §11 of `codeRules.md`
applied to `backend/src/main/java/com/ghost/`. Sections 1–4 (process / agile /
requirements / UML) are workflow guidance and are not addressed here — they
belong in PR templates and the work tracker.

## ✅ Compliant

| Rule | Notes |
|---|---|
| §5 No layer skipping | No controller imports a `Repository`. No service returns `ResponseEntity`. |
| §5 No entity leakage | All `@RestController` methods return DTOs from `dto/response/`. |
| §11c `Comment.verifiedBy` reference | Implemented as `verifierId` + `verifiedByName` on `CommentResponse`. The legacy `isVerifiedAnswer` boolean still rides along on the response so the client can highlight the verified comment without an extra null check; both fields are kept in sync. |
| §11d Course / Semester extraction | Done in V19 migration (`extract_courses_and_semesters.sql`). `Whiteboard` references `Course` and `Semester` entities. |
| Boolean property naming | All `private boolean isXxx` fields in `dto/response/` are protected by `@JsonAutoDetect(isGetterVisibility = Visibility.NONE)` + `@JsonProperty("isXxx")`. Verified live on Render. |

## ✅ Fixed in this commit

| Rule | Files |
|---|---|
| §11b explicit `FetchType.LAZY` on every `@OneToMany` | `Question.java:46`, `Whiteboard.java:57,63,69` — `@OneToMany` defaults to LAZY in JPA, but the rule asks for it to be explicit. |

## 📝 Deliberate deviations (commented in source)

### `User.getRole()` / `User.isFaculty()` / `User.isStudent()` — `model/User.java:78-95`

§11a forbids business methods on entities. These three accessors expose the
single-table-inheritance discriminator (`FacultyUser` vs base `User`) as a
`Role` enum. They are kept on the entity because:

- The value is structurally derived from the runtime Java type. No state is
  mutated, no repository is called.
- Moving them into a service would force `CustomUserDetailsService`,
  `UserMapper`, and ~20 other call sites to depend on that service just to
  answer "what kind of user is this?".
- Removing them would still leave the `instanceof FacultyUser` check at every
  call site — same logic, scattered.

A code comment in `User.java` records the rationale.

## 🚧 Known weaknesses, not yet addressed

These are real but high-blast-radius. Open items, not silent debt:

### Service classes near the SRP threshold (§6b SRP)

| Class | Lines | Responsibilities |
|---|---|---|
| `QuestionService` | 434 | create / edit / delete / close / pin / forward / pagination / filtering |
| `ReportService` | 394 | report creation / moderation / escalation / filtering |
| `AuthService` | 375 | registration / email verification / password reset / refresh / delete |

Each is *coherent* (single domain) but has multiple "reasons to change". A
clean split would be along verbs:

- `QuestionService` → `QuestionWriteService` (create/edit/delete) +
  `QuestionLifecycleService` (close/pin/forward) + `QuestionQueryService`.
- `AuthService` → `RegistrationService` + `PasswordResetService` +
  `TokenService`.

Splitting touches every controller and every test that wires these. Worth
queuing as a planned refactor PR with its own design note; not worth doing
during a bug-fix sweep.

### Repository complex queries (§5 vs §6 trade-off)

`QuestionRepository.searchQuestions` and `ReportRepository.findFiltered` push
multi-clause filtering into `@Query` JPQL. The audit flagged this as
"business filtering belongs in the service layer". The counter-argument is
the §5 NFR rule: "make NFRs executable" — keeping filters in SQL keeps them
indexable and avoids pulling rows the user can't see.

Resolution: keep these queries in the repository, but every new filter
condition should be added with an integration test that asserts the row
budget and an explain plan check, not just a unit test. (Process change, not
a code change.)

## 🔧 Tooling (§10 CI gates) — already in place

- Lint / format / typecheck enforced (`bun run lint`, `bun run format:check`,
  `bun run typecheck` in `frontend-ci.yml`).
- Backend coverage gate via `jacoco-maven-plugin` (`pom.xml`): line ≥ 0.70
  for the bundle and line ≥ 0.70 / branch ≥ 0.50 for `AuthService`,
  `QuestionService`, `CommentService`, `SearchService`, `JwtTokenProvider`.
- Smoke tests run on every push (`backend-ci.yml` runs
  `AuthControllerTest,AuditLogControllerTest`; `frontend-ci.yml` runs
  `bunx expo export`).

## 🚫 Not in scope for code

`codeRules.md` §1–§4 (process, agile, requirements, UML) and parts of §10
(PR template) are not enforceable from inside the codebase. They should
live in:

- `.github/PULL_REQUEST_TEMPLATE.md` (PR checklist with phase intent +
  acceptance criteria).
- `docs/requirements/` (user stories with verifiable AC).
- `docs/architecture/` (ADRs, this audit, future class diagrams).

These are TODO and tracked separately from this audit.
