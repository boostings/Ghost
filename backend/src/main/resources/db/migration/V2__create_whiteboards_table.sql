-- V2: Create whiteboards and whiteboard_memberships tables
-- Whiteboards represent course-based discussion boards

CREATE TABLE whiteboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    section VARCHAR(10),
    semester VARCHAR(20) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Auto-merge constraint: only one whiteboard per course per semester
ALTER TABLE whiteboards ADD CONSTRAINT uq_whiteboards_course_semester UNIQUE (course_code, semester);

CREATE INDEX idx_whiteboards_owner_id ON whiteboards(owner_id);

-- Whiteboard memberships link users to whiteboards with a role
CREATE TABLE whiteboard_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE whiteboard_memberships ADD CONSTRAINT uq_membership_whiteboard_user UNIQUE (whiteboard_id, user_id);

CREATE INDEX idx_memberships_whiteboard_id ON whiteboard_memberships(whiteboard_id);
CREATE INDEX idx_memberships_user_id ON whiteboard_memberships(user_id);
