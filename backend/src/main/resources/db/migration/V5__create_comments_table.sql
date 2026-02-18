-- V5: Create comments table
-- Comments are replies to questions

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    is_verified_answer BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    report_count INTEGER NOT NULL DEFAULT 0,
    karma_score INTEGER NOT NULL DEFAULT 0,
    edit_deadline TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_question_id ON comments(question_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- Add foreign key from questions.verified_answer_id to comments.id
-- Done here because comments table must exist first
ALTER TABLE questions
    ADD CONSTRAINT fk_questions_verified_answer
    FOREIGN KEY (verified_answer_id) REFERENCES comments(id)
    ON DELETE SET NULL;
