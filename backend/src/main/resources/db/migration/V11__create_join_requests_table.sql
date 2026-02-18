-- V11: Create join_requests table
-- Join requests for whiteboards that require approval

CREATE TABLE join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A user can only have one join request per whiteboard
ALTER TABLE join_requests ADD CONSTRAINT uq_join_requests_user_whiteboard UNIQUE (user_id, whiteboard_id);

CREATE INDEX idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX idx_join_requests_whiteboard_id ON join_requests(whiteboard_id);
CREATE INDEX idx_join_requests_status ON join_requests(status);
