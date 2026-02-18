-- V12: Add full-text search support for questions
-- Uses PostgreSQL tsvector with weighted ranking (title > body)

-- Function to build the search_vector from title and body with weights
CREATE OR REPLACE FUNCTION questions_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search_vector on INSERT or UPDATE of title/body
CREATE TRIGGER trg_questions_search_vector
    BEFORE INSERT OR UPDATE OF title, body
    ON questions
    FOR EACH ROW
    EXECUTE FUNCTION questions_search_vector_update();

-- Backfill search_vector for any existing rows
UPDATE questions
SET search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(body, '')), 'B');
