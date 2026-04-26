-- One-off operational promotion for the requested Illinois State faculty account.
-- This migration is intentionally narrow and no-ops if the account does not exist.

WITH target_user AS (
    SELECT id, role AS old_role
    FROM users
    WHERE lower(email) = lower('JESCHAD@ilstu.edu')
      AND role <> 'FACULTY'
), promoted_user AS (
    UPDATE users user_account
    SET role = 'FACULTY',
        updated_at = NOW()
    FROM target_user
    WHERE user_account.id = target_user.id
    RETURNING user_account.id, target_user.old_role
)
INSERT INTO audit_logs (
    id,
    whiteboard_id,
    actor_id,
    action,
    target_type,
    target_id,
    old_value,
    new_value,
    metadata_json
)
SELECT
    gen_random_uuid(),
    NULL,
    id,
    'USER_UPDATED',
    'USER',
    id,
    'role=' || old_role,
    'role=FACULTY',
    '{"source":"V23__promote_jeschad_faculty"}'::jsonb
FROM promoted_user;
