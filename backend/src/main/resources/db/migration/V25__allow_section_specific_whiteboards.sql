-- V25: Allow separate whiteboards for different sections of the same course.

ALTER TABLE whiteboards
    DROP CONSTRAINT IF EXISTS uq_whiteboards_course_semester;

ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS uq_courses_course_code;

CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_course_code_section
    ON courses (course_code, section)
    WHERE section IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_course_code_no_section
    ON courses (course_code)
    WHERE section IS NULL;

ALTER TABLE whiteboards
    ADD CONSTRAINT uq_whiteboards_course_semester_section UNIQUE (course_id, semester_id);
