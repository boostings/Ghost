-- Replace boolean verified-answer flag with verifier relationship

ALTER TABLE comments
    ADD COLUMN verified_by_id UUID;

ALTER TABLE comments
    ADD CONSTRAINT fk_comments_verified_by
        FOREIGN KEY (verified_by_id) REFERENCES users(id)
            ON DELETE SET NULL;

CREATE INDEX idx_comments_verified_by_id ON comments(verified_by_id);

WITH latest_verification_logs AS (
    SELECT DISTINCT ON (target_id)
        target_id,
        actor_id
    FROM audit_logs
    WHERE action = 'VERIFIED_ANSWER_PROVIDED'
      AND target_type = 'COMMENT'
      AND actor_id IS NOT NULL
    ORDER BY target_id, created_at DESC
)
UPDATE comments c
SET verified_by_id = latest_verification_logs.actor_id
FROM latest_verification_logs
WHERE c.id = latest_verification_logs.target_id
  AND c.is_verified_answer = TRUE
  AND c.verified_by_id IS NULL;

UPDATE comments c
SET verified_by_id = w.owner_id
FROM questions q
         JOIN whiteboards w ON w.id = q.whiteboard_id
WHERE c.question_id = q.id
  AND (c.is_verified_answer = TRUE OR q.verified_answer_id = c.id)
  AND c.verified_by_id IS NULL;

ALTER TABLE comments
    DROP COLUMN is_verified_answer;
