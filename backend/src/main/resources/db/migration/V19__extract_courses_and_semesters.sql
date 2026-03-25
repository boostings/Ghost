-- V19: Extract course and semester reference tables for whiteboards
-- Preserve existing whiteboards while normalizing the model toward the class diagram.

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    section VARCHAR(10)
);

ALTER TABLE courses
    ADD CONSTRAINT uq_courses_course_code UNIQUE (course_code);

CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(40) NOT NULL
);

ALTER TABLE semesters
    ADD CONSTRAINT uq_semesters_name UNIQUE (name);

INSERT INTO courses (course_code, course_name, section)
SELECT DISTINCT ON (w.course_code)
    w.course_code,
    w.course_name,
    w.section
FROM whiteboards w
ORDER BY w.course_code, w.created_at DESC;

INSERT INTO semesters (name)
SELECT DISTINCT w.semester
FROM whiteboards w;

ALTER TABLE whiteboards
    ADD COLUMN course_id UUID,
    ADD COLUMN semester_id UUID;

UPDATE whiteboards w
SET course_id = c.id
FROM courses c
WHERE w.course_code = c.course_code;

UPDATE whiteboards w
SET semester_id = s.id
FROM semesters s
WHERE w.semester = s.name;

ALTER TABLE whiteboards
    ALTER COLUMN course_id SET NOT NULL,
    ALTER COLUMN semester_id SET NOT NULL;

ALTER TABLE whiteboards
    ADD CONSTRAINT fk_whiteboards_course
        FOREIGN KEY (course_id) REFERENCES courses(id),
    ADD CONSTRAINT fk_whiteboards_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id);

DROP INDEX IF EXISTS idx_whiteboards_owner_id;

ALTER TABLE whiteboards
    DROP CONSTRAINT uq_whiteboards_course_semester;

ALTER TABLE whiteboards
    DROP COLUMN course_code,
    DROP COLUMN course_name,
    DROP COLUMN section,
    DROP COLUMN semester;

ALTER TABLE whiteboards
    ADD CONSTRAINT uq_whiteboards_course_semester UNIQUE (course_id, semester_id);

CREATE INDEX idx_whiteboards_owner_id ON whiteboards(owner_id);
CREATE INDEX idx_whiteboards_course_id ON whiteboards(course_id);
CREATE INDEX idx_whiteboards_semester_id ON whiteboards(semester_id);
