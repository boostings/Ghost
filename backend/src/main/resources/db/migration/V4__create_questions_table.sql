-- V4: Create questions table
-- Questions are the primary content within whiteboards

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    topic_id UUID REFERENCES topics(id),
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    report_count INTEGER NOT NULL DEFAULT 0,
    karma_score INTEGER NOT NULL DEFAULT 0,
    verified_answer_id UUID,
    search_vector TSVECTOR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_whiteboard_id ON questions(whiteboard_id);
CREATE INDEX idx_questions_author_id ON questions(author_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_topic_id ON questions(topic_id);
CREATE INDEX idx_questions_search_vector ON questions USING GIN (search_vector);
