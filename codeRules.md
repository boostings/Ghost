# agents.md — Applying Software Engineering Principles to an App Codebase

Copy/paste sections into your `agents.md` (or keep as a standalone policy doc). This is a practical, code-focused checklist derived from:
- Process Models (communication → planning → modeling → construction → deployment)
- Agile Development
- Software Architecture & quality attributes
- Requirements Engineering
- UML Modeling
- Design Concepts + Patterns
- Software Testing

---

## 1) Process model principles → repo workflow rules

- **Always run the “generic activities” loop**: communication → planning → modeling → construction → deployment.
  - Communication = issue template + problem statement
  - Planning = milestone/sprint goal + estimates
  - Modeling = diagrams + API contracts
  - Construction = implementation + tests
  - Deployment = release notes + rollout plan
- **Never treat phases as “one-and-done.”** Plan for iteration and rework loops.
- **Every PR must declare its “phase intent”** (modeling-only vs construction vs deployment work) to avoid mixing too much risk.
- **Short feedback cycles beat late verification**: validate early with spikes/prototypes/tests.
- **Use prototyping deliberately**:
  - Build a quick UI/API spike to validate fuzzy requirements
  - Label throwaway code vs production code
  - Convert validated spikes into planned work items
- **Spiral-style risk control**:
  - Each milestone has a risk list (security, scaling, unknown integrations, etc.)
  - Tackle the riskiest items first; re-evaluate risks each iteration

---

## 2) Agile principles → coding & planning “non-negotiables”

- **Working software is the primary measure of progress**: each iteration ends with a demoable build.
- **Deliver frequently**:
  - Prefer small PRs (1–3 days of work)
  - Merge behind feature flags when needed
  - Release incrementally (even if features are hidden)
- **Welcome changing requirements**:
  - Write requirements as editable stories with acceptance criteria
  - Store decisions in ADRs (Architecture Decision Records)
  - Keep backlog reprioritization cheap
- **Customer collaboration**:
  - Stakeholder review checkbox per feature
  - Treat feedback like a failing test: it creates a ticket with a clear repro
- **Sustainable pace**:
  - Cap WIP (work in progress)
  - Define “done” strictly (tests + docs + monitoring)
- **Technical excellence enables agility**:
  - Enforce lint/format/type checks
  - Enforce architectural boundaries (imports/module rules)
  - Refactor continuously (not “later”)
- **Retrospectives**:
  - After each release: what hurt, what helped, what to change next time

---

## 3) Requirements engineering → make code traceable to intent

- **Requirements are iterative**: keep them living and versioned.
- **Write requirements in two layers**:
  - **Functional**: features / behaviors
  - **Non-functional**: performance, reliability, security, usability, etc.
- **Acceptance criteria for every story** (verifiable and testable).
- **Validation rules (before building too much)**:
  - Validity: does this meet user needs?
  - Consistency: conflicts with other requirements?
  - Completeness: missing flows?
  - Realism: feasible with time/tech?
  - Verifiability: can we test it?
- **Ban vague words** (“fast”, “easy”, “secure”) unless paired with metrics (p95 latency, OWASP controls, uptime target…).
- **Traceability in repo**:
  - Issue/Story ID in PR title
  - Story ID in commit messages
  - Tests reference acceptance criteria (e.g., `AC1_login_denies_unverified_email`)
- **Change management**:
  - Each requirement change includes an impact note (modules, tests, data model changes)

---

## 4) UML thinking → reduce confusion before you code

Use UML as a **communication tool**, not bureaucracy.

- **Use case diagrams**:
  - For each major feature: actors, triggers, pre/post conditions, exceptions
  - Use case report fields: Name, Scenario, Trigger, Description, Related Use Cases, Pre/Post Conditions, Stakeholders, Exceptions, Flow of Events (Actor vs System columns)
  - Identify actors and their dependencies, actions and dependencies between actions
  - Use `<<includes>>` for mandatory subtasks ("X includes Y" = completing X requires Y)
  - Use `<<extends>>` for optional extensions ("X extends Y" = X is like Y with extra steps)
  - Use generalization arrows for actor hierarchies (e.g., Supervisor inherits Library Employee use cases)
  - Captures the external perspective and boundaries of the system
  - Translate each use case into endpoints/pages/events + acceptance tests
- **Activity diagrams**:
  - Model the flow of activities — an activity is a collection of actions
  - Identify: activities, actions, actors responsible, sequential vs parallel actions, control mechanisms
  - Draw multi-step flows (checkout/onboarding/payments)
  - Mark decision points (diamonds) and failure paths
  - Use swimlanes to separate actors (user/system/external services)
  - Use interruptible activity regions for flows that can be canceled mid-process
  - Convert decisions into explicit branches + tests
- **Class diagrams**:
  - Provides static view/blueprint of the system — classes, associations, relationships, interfaces
  - Each class box: name, attributes (with visibility: `+` public, `-` private, `#` protected, `~` package), method signatures
  - Association: line between classes, described by a verb, can be 1-way (arrow) or 2-way
  - Multiplicity: 1-to-1, 1-to-many (`*`), many-to-many, constrained ranges (`0..3`)
  - Aggregation (open diamond): "part of" — parts can exist independently (Car has Engine)
  - Composition (filled diamond): "owns" — parts cannot exist without the whole (LinkedList owns Nodes)
  - Generalization/Specialization: inheritance hierarchy (triangle pointing toward base class)
  - Realization: dashed arrow to interface (implementation of contract)
  - Association class: captures behavior of the association itself (e.g., Advised with StartDate between Student and Advisor)
  - Keep domain vocabulary consistent with business terms
  - Use relationships/multiplicity to drive schema constraints & invariants
- **Sequence diagrams**:
  - Dynamic view: how and when messages are exchanged between participating classes/objects
  - Emphasis on ordering of messages across lifelines
  - Solid lines = request messages; dashed lines = return messages
  - Lifeline = instantiation to deletion; activation bar = object is active/processing
  - Use `loop(min,max)` for repeated message exchanges
  - Use `opt` for optional fragments, `par` for parallel fragments
  - For cross-service flows: draw message ordering
  - Implement explicit timeouts/retries/idempotency
  - Add integration tests mirroring the sequence
- **State diagrams**:
  - Model the various states an individual object goes through during its lifetime
  - State = a situation/condition/role an object has taken; transition = event/trigger/signal that changes state
  - Notation: `event [guard condition] / action` on transitions
  - Self-transitions: object stays in same state but performs an action
  - For lifecycle objects (Order/Subscription/Ticket/Question): define states + transitions
  - Enforce transitions in code; test illegal transitions

---

## 5) Architecture principles → make quality attributes “real”

- **Choose architecture to satisfy quality attributes**, not vibes:
  - Availability, performance (latency/throughput), interoperability, scalability, security
- **Make NFRs executable**:
  - Performance budgets in CI (load tests/benchmarks)
  - Availability targets → health checks + graceful degradation
  - Security targets → threat model + security tests
- **Layered architecture guardrails** (Controller → Service → Repository):
  - Every entity must follow the three-layer split:
    - **Entity** (`/model/`): Pure data model — fields, JPA associations, getters/setters only. No business logic.
    - **Controller** (`/controller/`): Receives HTTP requests, deserializes DTOs, delegates to service. Does no business logic itself.
    - **Service** (`/service/`): Business logic, validation, authorization checks, orchestration. Calls repository for persistence.
    - **Repository** (`/repository/`): Database CRUD via `JpaRepository`. Custom queries via `@Query`.
  - Enforce “no skipping layers” — controllers never call repositories directly; services never return HTTP responses
  - Never expose JPA entities in API responses — always map to DTOs via mapper classes
  - Avoid leaking DB models into UI components
  - Entity classes must not contain service-layer methods — if a class diagram shows methods on an entity, those methods belong in the corresponding Service class
  - **Association back-references**: Only add `@OneToMany` back-references on the owning entity when required for cascade operations or authorization. Otherwise, fetch via repository queries to avoid N+1 performance problems.
- **Microservices guardrails** (if distributed):
  - Boundaries by domain capability (not tables)
  - Standardize comms + versioning
  - Observability is mandatory (logs/metrics/traces)
- **Event-driven guardrails**:
  - Events are immutable facts; version them
  - Consumers must be idempotent
  - Monitoring covers producers + brokers + consumers
- **Pipe-and-filter guardrails**:
  - Each filter independently testable
  - No silent data loss between stages
  - Idempotency + replay strategy required
- **Serverless guardrails**:
  - Design for provider constraints (cold starts, limits)
  - Avoid accidental lock-in unless intentional
  - Testing includes local + deployed validation

---

## 6) OO design concepts → enforce maintainability in code shape

- **Encapsulation**:
  - Keep state private; expose minimal methods
  - No “reach into objects” via public fields — use getters/setters with access control
  - Stable interfaces, swappable implementations
  - Implementation can change with no impact to the application or its dependencies
  - Visibility modifiers (`private`, `protected`, `public`, `package`) provide access control
- **Abstraction**:
  - Design should include various levels of abstraction with important design decisions at each level
  - Expose ONLY the behavior the client needs to know
  - Hide the complexity of how the exposed behavior is performed — the client doesn’t need to know
  - Define “ports” (interfaces) for DB/queues/external APIs
- **Inheritance**:
  - Enables reusability — design new components by using existing components
  - Enables polymorphism and dynamic binding
  - **Risk**: Superclasses are fragile — changes to a superclass ripple to all subclasses
  - IS-A vs HAS-A: use inheritance only for strong IS-A relationships
- **Composition**:
  - Prefer composition over inheritance — it is easier to change composition than inheritance
  - Composition allows delayed creation of composed objects (unlike subclass objects which hold an image of superclass)
  - Compose services with dependencies instead of subclassing everything
  - Use inheritance mainly for polymorphism at boundaries (strategies/handlers)
- **Polymorphism**:
  - Ability to associate many meanings to a single method, achieved through dynamic binding
  - Enables treating different subtypes uniformly through a shared interface

---

## 6a) GRASP principles → assign responsibilities correctly

GRASP = General Responsibility Assignment Software Principles. Use these to decide which class gets which responsibility.

- **Information Expert**:
  - Assign responsibility to the class that has the information necessary to fulfill it
  - “Who should know the grand total?” → the class that holds the line items
  - Leads to high cohesion and low coupling; code is easier to understand by reading it
- **Creator**:
  - Assign class B the responsibility to create class A if: B aggregates A, B contains A, B closely uses A, or B has the initializing data for A
  - Leads to low coupling and clear design
- **Controller**:
  - Assign responsibility for handling system events to a controller object (facade or use-case handler)
  - Controller should delegate work to other objects — it does not do much work itself
  - Use facade controllers when few system events; use-case controllers when the facade is becoming bloated
  - No application logic in the GUI / interface layer
- **High Cohesion**:
  - Group together entities that fulfill a distinct purpose — strong relationship between pieces of functionality within a module
  - Bad cohesion example: a Student class with address fields, phone fields, and course maps all flattened in one class
  - Good cohesion: extract Address, Contact, and Course into separate classes composed by Student
  - Advantages: reduces complexity, increases reusability, easier to maintain/read/understand
- **Low Coupling**:
  - Minimize the dependence of one module on another
  - Leads to greater functional independence — change one without affecting others
  - High coupling → cannot test one module without others, error domino effects
  - **Coupling types (worst to best)**:
    - **Content coupling** (worst): one module directly accesses/modifies another module’s data (e.g., `feds.interest` directly instead of `feds.getInterest()`)
    - **Common coupling**: two or more modules share global data/variables — any change has ripple effects
    - **Control coupling**: one module controls the flow of another by passing control data (flags, enums)
    - **Stamp coupling**: modules share a composite data structure but use only part of it
    - **Data coupling** (best): modules share data only through parameters
- **Pure Fabrication**:
  - When no domain class is a good fit for a responsibility without violating cohesion/coupling, create an artificial class (e.g., a `SaleSave` class for persistence)
  - Maintains high cohesion, low coupling, and reuse
- **Separation of Concerns**:
  - Each component fulfills a distinct purpose → functional independence
  - One role = clarity, good grouping, minimal interference, easy to replace
  - “Design by interface, not implementation” — think of components in terms of the interface they offer
  - Strive for extremely replaceable components — can you neatly and surgically remove and replace any component?

---

## 6b) SOLID principles → enforce design at the class/component level

- **Single Responsibility (SRP)**:
  - “A class should have only one reason to change”
  - A class must handle only ONE responsibility
  - Bad: a DB class that connects, queries, AND creates objects (3 reasons to change)
  - Good: split into DBConnection, DBQuery, and ObjectCreator — each with one reason to change
- **Open-Closed Principle (OCP)**:
  - “Open for extension, closed for modification”
  - Extend behavior via new implementations, not modifying existing classes
  - Why not just change the code? → must re-test, verify old functionality, sometimes not an option
  - Solution: define abstractions (interfaces/abstract classes) so new types can be added without modifying existing code
- **Liskov Substitution Principle (LSP)**:
  - “Subclasses should be substitutable for their base classes”
  - Code that works with a base class MUST NOT break with a derived class
  - Violated when: returning incompatible objects, throwing new exceptions, changing semantics/side effects
  - Bad: Ostrich extends Bird but throws exception on `fly()` — forces `instanceof` checks everywhere
  - Solution: remove non-universal behavior from the base class; use interfaces for specialized behavior (e.g., `Fly` interface only implemented by birds that can fly)
  - Subtypes must be usable anywhere their base type is expected (avoid “not supported” overrides)
- **Interface Segregation Principle (ISP)**:
  - “Many client-specific interfaces are better than one general-purpose interface”
  - Clients MUST NOT be forced to implement methods they don’t use
  - Bad: a `Machine` interface with print/scan/staple/photoCopy — a ScanMachine is forced to implement empty print/staple/photoCopy
  - Good: split into `Printer`, `Scanner`, `Stapler`, `PhotoCopier` — each class implements only what it needs
- **Dependency Inversion Principle (DIP)**:
  - “Depend on abstractions, not implementations”
  - Design based on contracts (interfaces), not how they are fulfilled
  - Bad: `PrintJob` depends on `WordDocument` and `DotPrinter` directly — cannot print PDFs to a LaserPrinter
  - Good: `PrintJob` depends on `Document` and `Printer` interfaces — any implementation works

---

## 7) Design patterns → make changes cheaper (not “pattern worship”)

Use patterns when they reduce repetition or risk. If you introduce a pattern, document: **intent, where used, consequences, alternatives**.

- **Factory Method / Abstract Factory**
  - Use when multiple implementations exist (payment providers, storage backends)
  - Centralize creation logic; callers don’t know concrete classes
- **Builder**
  - Use when object creation has many parameters/variants (requests/config)
  - Avoid “constructor soup”
- **Prototype**
  - Use when creation is expensive; clone configured templates
- **Singleton (careful)**
  - Use only when truly one instance is required and safe; otherwise prefer DI

---

## 8) Testing principles → make correctness continuous

- **TDD loop for core logic**
  - Write test → run (fail) → implement → run (pass) → refactor
- **Unit tests**
  - Test logic and edge cases in isolation
  - Keep fast: no network, no real DB
- **Integration tests**
  - Verify components connect correctly
  - Use stubs/drivers if not all modules are ready
- **Avoid “big bang” integration**
  - Integrate gradually; failures are easier to locate
- **Regression testing discipline**
  - Every bug fix adds a test that would have caught it
  - Maintain a prioritized regression suite in CI
- **Smoke tests for every build/deploy**
  - App boots, auth works, critical flow runs
- **Black-box tests**
  - Validate outputs for given inputs (API contract tests, UI flow tests)
- **White-box tests**
  - Cover branches/paths for complex logic
  - If complexity is high: refactor and/or add tests
- **User Acceptance Testing**
  - Convert real scenarios into scripted E2E tests where possible

---

## 9) Deployment as engineering (not an afterthought)

- **Deployment is a first-class activity**: plan and test deploy paths.
- **Definition of Done includes deployability**
  - Config documented
  - Migrations safe + rollbackable
  - Observability in place
  - Post-deploy smoke tests run
- **Release notes map to requirements**
  - Each release lists delivered stories + known gaps

---

## 10) Guardrails you can enforce automatically (CI + templates)

### PR template MUST include
- Linked requirement/story
- Acceptance criteria checklist
- Risks + mitigations
- Tests added/updated
- Observability added/updated (if applicable)

### CI gates MUST include
- Unit tests + smoke tests required
- Coverage thresholds for critical modules
- Lint/format/typecheck required

### Architecture boundaries MUST be enforced
- Layer imports enforced (if layered)
- Event immutability + versioning rules (if event-driven)

### Complexity gates SHOULD exist
- If a function/module exceeds complexity threshold:
  - Requires refactor plan **and** extra tests

### Requirements quality gates SHOULD exist
- Block tickets with untestable acceptance criteria (“easy/fast/secure” without metrics)

---

## 11) Professor feedback — design review action items (from class diagram review)

These are specific design changes identified during diagram review. Apply when implementing.

### 11a) Entity purity rule
- Entity classes (`/model/`) must contain ONLY fields, JPA annotations, and Lombok annotations
- No business methods, no service logic, no repository calls on entities
- If a class diagram shows methods on an entity box, those methods belong in the corresponding `XService` class — the diagram is a visual convention, not a code structure directive

### 11b) Association back-references — add selectively
- `Question` should have `@OneToMany List<Comment> comments` (back-ref for "Question has Comments") — the diagram shows this as a core relationship
- `Whiteboard` should have `@OneToMany List<Question> questions` and `@OneToMany List<Topic> topics` if cascade/orphan removal is needed
- `User` should have `@OneToMany List<WhiteboardMembership> memberships` if authorization needs it in-memory
- **Performance rule**: Only add back-references when they serve a purpose (cascade, authorization). Use `FetchType.LAZY` always. For read-only queries, prefer repository methods over navigating collections.

### 11c) Verified answer — capture WHO verified
- Change `Comment.isVerifiedAnswer` (boolean) → `Comment.verifiedBy` (User reference, nullable)
- `null` = not verified; non-null = verified by that faculty member
- Ripple effects:
  - All `comment.isVerifiedAnswer()` checks → `comment.getVerifiedBy() != null`
  - `markAsVerifiedAnswer()` in CommentService must set the User reference
  - `CommentResponse` DTO should include verifier info (userId, name)
  - Database migration: add `verified_by_id` FK column to `comments` table referencing `users`; drop `is_verified_answer` boolean after data migration

### 11d) Whiteboard cohesion — consider Course/Semester extraction
- Current: `courseCode`, `courseName`, `section`, `semester` are flat String fields on Whiteboard
- Professor feedback: extract into `Course` (courseCode, courseName, section) and `Semester` (name) entities for better cohesion
- **Trade-off**: Adds 2 tables, 2 entities, 2 repositories, joins on every Whiteboard query. The current flat design works with the unique constraint on `(courseCode, semester)` for auto-merging.
- **Decision**: Evaluate whether the added complexity is justified. If courses/semesters are reused across multiple whiteboards or need their own lifecycle, extract. If they're essentially labels, keep flat.

### 11e) Class diagram ↔ code alignment rules
- Every entity in the class diagram MUST have corresponding Controller, Service, and Repository classes in code
- Methods shown on entity boxes in diagrams represent Service-layer operations, not entity methods
- Relationship arrows in diagrams MUST be reflected as JPA annotations in entity code (`@ManyToOne`, `@OneToMany`, etc.)
- Multiplicity markers on diagrams drive database constraints (NOT NULL, unique constraints, check constraints)
- Conceptual subclasses in diagrams (e.g., Student/Faculty) may be implemented as role enums rather than separate Java classes — document the mapping

---

## Optional: repo structure hints (drop-in)
- `/docs/requirements/` — user stories, acceptance criteria, non-functional targets
- `/docs/architecture/` — diagrams, ADRs
- `/docs/testing/` — test strategy, regression suite notes
- `/docs/runbooks/` — deploy/rollback, incident response
- `.github/PULL_REQUEST_TEMPLATE.md` — enforce PR checklist
- CI pipeline — lint/typecheck/tests/perf budgets/security scans
