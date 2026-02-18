-- V10: Create karma_votes table
-- Tracks upvotes/downvotes on questions and comments

CREATE TABLE karma_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A vote must target either a question or a comment
ALTER TABLE karma_votes ADD CONSTRAINT chk_karma_votes_target
    CHECK (question_id IS NOT NULL OR comment_id IS NOT NULL);

-- A user can only vote once per question (partial unique index for nullable column)
CREATE UNIQUE INDEX uq_karma_votes_user_question
    ON karma_votes(user_id, question_id)
    WHERE question_id IS NOT NULL;

-- A user can only vote once per comment (partial unique index for nullable column)
CREATE UNIQUE INDEX uq_karma_votes_user_comment
    ON karma_votes(user_id, comment_id)
    WHERE comment_id IS NOT NULL;

CREATE INDEX idx_karma_votes_user_id ON karma_votes(user_id);
CREATE INDEX idx_karma_votes_question_id ON karma_votes(question_id);
CREATE INDEX idx_karma_votes_comment_id ON karma_votes(comment_id);
