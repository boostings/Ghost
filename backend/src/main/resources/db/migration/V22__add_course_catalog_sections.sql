-- V22: Store imported Course Finder catalog data separately from opened whiteboards.
-- Importing catalog sections must not create whiteboard rows; faculty opens whiteboards later.

ALTER TABLE courses
    ADD COLUMN subject VARCHAR(20),
    ADD COLUMN catalog_number VARCHAR(20),
    ADD COLUMN department_name VARCHAR(255),
    ADD COLUMN course_description TEXT,
    ADD COLUMN credit VARCHAR(40),
    ADD COLUMN source_course_id VARCHAR(80);

UPDATE courses
SET subject = upper(substring(course_code from '^[A-Za-z]+')),
    catalog_number = substring(course_code from '[0-9].*$')
WHERE subject IS NULL OR catalog_number IS NULL;

CREATE TABLE course_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    source_object_id VARCHAR(120) NOT NULL,
    term_id VARCHAR(40),
    section VARCHAR(20) NOT NULL,
    class_number VARCHAR(40) NOT NULL,
    instructor VARCHAR(255),
    session VARCHAR(80),
    career VARCHAR(80),
    instruction_mode VARCHAR(80),
    meeting_pattern TEXT,
    meeting_times TEXT,
    number_of_weeks INTEGER,
    is_open_section BOOLEAN NOT NULL DEFAULT FALSE,
    is_low_cost_materials_section BOOLEAN NOT NULL DEFAULT FALSE,
    is_no_cost_materials_section BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_sections_source_object_id UNIQUE (source_object_id),
    CONSTRAINT uq_course_sections_course_semester_section_class
        UNIQUE (course_id, semester_id, section, class_number)
);

CREATE INDEX idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX idx_course_sections_semester_id ON course_sections(semester_id);
CREATE INDEX idx_course_sections_class_number ON course_sections(class_number);

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS chk_audit_logs_target_type;
ALTER TABLE audit_logs
    ADD CONSTRAINT chk_audit_logs_target_type
    CHECK (target_type IN (
        'USER',
        'WHITEBOARD',
        'QUESTION',
        'COMMENT',
        'TOPIC',
        'REPORT',
        'JOIN_REQUEST',
        'NOTIFICATION',
        'BOOKMARK',
        'KARMA_VOTE',
        'COURSE_CATALOG',
        'UNKNOWN'
    ));
