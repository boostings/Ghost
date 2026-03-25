# ADR-001: Shared Whiteboards And Verified Answers

## Status

Accepted

## Context

Ghost is meant to reduce repeated class questions, not create isolated section-specific silos. At the same time, faculty need a clear ownership trail for authoritative answers and moderation actions.

Two domain rules shape most of the system:

1. A whiteboard represents a course and semester, shared across sections.
2. A verified answer is an explicit faculty action that closes the question and should identify the verifier.

## Decision

- Model whiteboards at the course-code plus semester level rather than the section level.
- Treat verified answers as a faculty relationship on `Comment` (`verifiedBy`) instead of a bare boolean flag.
- Return verifier identity in backend DTOs so the frontend can display who verified the answer.
- Preserve question-level closure state and `verifiedAnswerId` so reads remain efficient.
- Record verification and closure actions in the audit log.

## Consequences

### Positive

- Repeated section questions converge into one searchable knowledge base.
- Faculty actions are attributable, auditable, and explainable in the UI.
- The data model aligns with the class diagram and moderation requirements.

### Negative

- Verification now requires a migration and DTO contract change instead of a trivial boolean field.
- Shared whiteboards increase the need for clear moderation and membership rules.

## Implementation Notes

- Backend entities: `Whiteboard` owns `questions` and `topics`; `Question` owns `comments`; `Comment` references `verifiedBy`.
- Frontend screens consume verifier identity through `CommentResponse`.
- Migration `V18__replace_verified_answer_flag_with_verifier.sql` backfills historical verified comments.
