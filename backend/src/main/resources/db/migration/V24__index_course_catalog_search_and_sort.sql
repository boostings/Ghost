-- Speed up catalog browsing/search without creating whiteboards during import.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_courses_subject_code_catalog_sort
    ON courses(subject, course_code, catalog_number);

CREATE INDEX IF NOT EXISTS idx_courses_lower_course_code_trgm
    ON courses USING gin (lower(course_code) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_lower_course_name_trgm
    ON courses USING gin (lower(course_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_lower_subject_trgm
    ON courses USING gin (lower(subject) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_lower_catalog_number_trgm
    ON courses USING gin (lower(catalog_number) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_course_sections_semester_section_class_sort
    ON course_sections(semester_id, section, class_number);

CREATE INDEX IF NOT EXISTS idx_course_sections_semester_instructor_sort
    ON course_sections(semester_id, instructor);

CREATE INDEX IF NOT EXISTS idx_course_sections_lower_instructor_trgm
    ON course_sections USING gin (lower(instructor) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_course_sections_lower_section_trgm
    ON course_sections USING gin (lower(section) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_course_sections_lower_class_number_trgm
    ON course_sections USING gin (lower(class_number) gin_trgm_ops);
