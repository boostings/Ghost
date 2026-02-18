-- V3: Create topics table
-- Topics categorize questions within a whiteboard

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Each topic name must be unique within a whiteboard
ALTER TABLE topics ADD CONSTRAINT uq_topics_whiteboard_name UNIQUE (whiteboard_id, name);

CREATE INDEX idx_topics_whiteboard_id ON topics(whiteboard_id);
