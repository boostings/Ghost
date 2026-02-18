-- V1: Create users table
-- Core user accounts for Ghost application

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_code_expires_at TIMESTAMP,
    karma_score INTEGER NOT NULL DEFAULT 0,
    expo_push_token VARCHAR(255),
    settings_json JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
