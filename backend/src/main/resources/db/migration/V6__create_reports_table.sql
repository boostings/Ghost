-- V6: Create reports table
-- Reports allow users to flag questions or comments for moderation

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A report must target either a question or a comment (or both, but at least one)
ALTER TABLE reports ADD CONSTRAINT chk_reports_target
    CHECK (question_id IS NOT NULL OR comment_id IS NOT NULL);

CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_question_id ON reports(question_id);
CREATE INDEX idx_reports_comment_id ON reports(comment_id);
CREATE INDEX idx_reports_status ON reports(status);
