-- V13: Seed demo class data
-- Creates a demo faculty user, demo whiteboard, sample topics, questions, and comments

-- Insert demo faculty user
-- Password: password123 (bcrypt hash)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, email_verified)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'demo-faculty@ilstu.edu',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Demo',
    'Faculty',
    'FACULTY',
    TRUE
);

-- Insert demo whiteboard
INSERT INTO whiteboards (id, course_code, course_name, semester, owner_id, invite_code, is_demo)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'DEMO',
    'Welcome to Ghost',
    'Demo',
    'a0000000-0000-0000-0000-000000000001',
    'DEMO2026',
    TRUE
);

-- Add demo faculty as a member of the demo whiteboard
INSERT INTO whiteboard_memberships (id, whiteboard_id, user_id, role)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'FACULTY'
);

-- Insert default topics for demo whiteboard
INSERT INTO topics (id, whiteboard_id, name, is_default) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Homework', TRUE),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Exam', TRUE),
    ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Lecture', TRUE),
    ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'General', TRUE);

-- Insert sample questions
INSERT INTO questions (id, whiteboard_id, author_id, topic_id, title, body, status) VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'How do I submit Homework 1?',
        'I am having trouble finding the submission link for Homework 1. Can someone point me in the right direction?',
        'CLOSED'
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002',
        'What topics are covered on Exam 1?',
        'Can anyone confirm the topics that will be on the first exam? I want to make sure I am studying the right material.',
        'OPEN'
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000003',
        'Can someone explain the concept from Lecture 3?',
        'I did not fully understand the explanation of polymorphism in Lecture 3. Could someone break it down in simpler terms?',
        'OPEN'
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000004',
        'Welcome to Ghost! Introduce yourself here.',
        'This is a demo whiteboard. Feel free to explore the features! You can ask questions, upvote helpful answers, and bookmark posts for later.',
        'OPEN'
    ),
    (
        'e0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'Is there a grace period for late homework submissions?',
        'I missed the deadline for Homework 2 by a few hours. Does the instructor allow late submissions with a penalty?',
        'OPEN'
    );

-- Insert sample comments
-- Verified answer for the first question (Homework 1 submission)
INSERT INTO comments (id, question_id, author_id, body, is_verified_answer) VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'You can find the submission link on the course LMS under the Assignments tab. Make sure to upload your file as a PDF.',
        TRUE
    );

-- Update the question to reference the verified answer
UPDATE questions
SET verified_answer_id = 'f0000000-0000-0000-0000-000000000001'
WHERE id = 'e0000000-0000-0000-0000-000000000001';

-- Additional comments on other questions
INSERT INTO comments (id, question_id, author_id, body, is_verified_answer) VALUES
    (
        'f0000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'The exam will cover Chapters 1 through 4. Focus on key definitions and practice problems at the end of each chapter.',
        FALSE
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000001',
        'Polymorphism allows objects of different classes to be treated as objects of a common superclass. Think of it like a universal remote that works with different TV brands.',
        FALSE
    ),
    (
        'f0000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000001',
        'Welcome! Ghost is an anonymous Q&A platform designed to help students ask questions without hesitation. Enjoy exploring!',
        FALSE
    );
