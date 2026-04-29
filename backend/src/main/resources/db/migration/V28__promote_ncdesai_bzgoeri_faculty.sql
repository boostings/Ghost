-- One-off operational promotion for the requested Illinois State faculty accounts.
-- This migration is intentionally narrow and no-ops for any account that does not exist.

WITH target_users AS (
    SELECT id, role AS old_role
    FROM users
    WHERE lower(email) IN (lower('NCDESAI@ilstu.edu'), lower('BZGOERI@ilstu.edu'))
      AND role <> 'FACULTY'
), promoted_users AS (
    UPDATE users user_account
    SET role = 'FACULTY',
        updated_at = NOW()
    FROM target_users
    WHERE user_account.id = target_users.id
    RETURNING user_account.id, target_users.old_role
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
    '{"source":"V28__promote_ncdesai_bzgoeri_faculty"}'::jsonb
FROM promoted_users;
