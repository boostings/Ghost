CREATE INDEX IF NOT EXISTS idx_questions_whiteboard_status_created_at
    ON questions(whiteboard_id, status, created_at DESC);
