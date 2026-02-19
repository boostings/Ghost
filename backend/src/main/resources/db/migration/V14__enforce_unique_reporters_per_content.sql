-- Enforce one report per reporter per question/comment to support
-- "3 unique reports" auto-hide logic.

CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_reporter_question
    ON reports (reporter_id, question_id)
    WHERE question_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_reporter_comment
    ON reports (reporter_id, comment_id)
    WHERE comment_id IS NOT NULL;
