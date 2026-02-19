-- Tighten data constraints and add missing performance index.

-- Enforce XOR target semantics for reports and karma votes.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_target;
ALTER TABLE reports
    ADD CONSTRAINT chk_reports_target
    CHECK ((question_id IS NULL) <> (comment_id IS NULL));

ALTER TABLE karma_votes DROP CONSTRAINT IF EXISTS chk_karma_votes_target;
ALTER TABLE karma_votes
    ADD CONSTRAINT chk_karma_votes_target
    CHECK ((question_id IS NULL) <> (comment_id IS NULL));

-- Normalize audit target types and enforce allowed values.
UPDATE audit_logs
SET target_type = 'UNKNOWN'
WHERE target_type IS NULL OR btrim(target_type) = '';

UPDATE audit_logs
SET target_type = upper(
        regexp_replace(
            regexp_replace(target_type, '([a-z0-9])([A-Z])', '\1_\2', 'g'),
            '[^A-Za-z0-9]+',
            '_',
            'g'
        )
    );

UPDATE audit_logs
SET target_type = 'UNKNOWN'
WHERE target_type NOT IN (
    'USER',
    'WHITEBOARD',
    'QUESTION',
    'COMMENT',
    'TOPIC',
    'REPORT',
    'JOIN_REQUEST',
    'NOTIFICATION',
    'BOOKMARK',
    'KARMA_VOTE',
    'UNKNOWN'
);

ALTER TABLE audit_logs ALTER COLUMN target_type SET DEFAULT 'UNKNOWN';
ALTER TABLE audit_logs ALTER COLUMN target_type SET NOT NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS chk_audit_logs_target_type;
ALTER TABLE audit_logs
    ADD CONSTRAINT chk_audit_logs_target_type
    CHECK (target_type IN (
        'USER',
        'WHITEBOARD',
        'QUESTION',
        'COMMENT',
        'TOPIC',
        'REPORT',
        'JOIN_REQUEST',
        'NOTIFICATION',
        'BOOKMARK',
        'KARMA_VOTE',
        'UNKNOWN'
    ));

-- Normalize notification reference types and enforce allowed values.
UPDATE notifications
SET reference_type = 'UNKNOWN'
WHERE reference_type IS NULL OR btrim(reference_type) = '';

UPDATE notifications
SET reference_type = upper(
        regexp_replace(
            regexp_replace(reference_type, '([a-z0-9])([A-Z])', '\1_\2', 'g'),
            '[^A-Za-z0-9]+',
            '_',
            'g'
        )
    );

UPDATE notifications
SET reference_type = 'UNKNOWN'
WHERE reference_type NOT IN (
    'QUESTION',
    'COMMENT',
    'TOPIC',
    'REPORT',
    'WHITEBOARD',
    'JOIN_REQUEST',
    'USER',
    'UNKNOWN'
);

ALTER TABLE notifications ALTER COLUMN reference_type SET DEFAULT 'UNKNOWN';
ALTER TABLE notifications ALTER COLUMN reference_type SET NOT NULL;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_reference_type;
ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_reference_type
    CHECK (reference_type IN (
        'QUESTION',
        'COMMENT',
        'TOPIC',
        'REPORT',
        'WHITEBOARD',
        'JOIN_REQUEST',
        'USER',
        'UNKNOWN'
    ));

-- Missing composite index for whiteboard feed sorting.
CREATE INDEX IF NOT EXISTS idx_questions_whiteboard_pinned_created_at
    ON questions(whiteboard_id, is_pinned, created_at DESC);
