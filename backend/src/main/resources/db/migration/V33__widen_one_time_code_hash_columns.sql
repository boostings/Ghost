ALTER TABLE users
    ALTER COLUMN verification_code TYPE VARCHAR(255),
    ALTER COLUMN password_reset_code TYPE VARCHAR(255);
