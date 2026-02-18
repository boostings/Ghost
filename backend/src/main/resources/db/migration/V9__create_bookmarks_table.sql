-- V9: Create bookmarks table
-- Bookmarks allow users to save questions for later reference

CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A user can only bookmark a question once
ALTER TABLE bookmarks ADD CONSTRAINT uq_bookmarks_user_question UNIQUE (user_id, question_id);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_question_id ON bookmarks(question_id);
