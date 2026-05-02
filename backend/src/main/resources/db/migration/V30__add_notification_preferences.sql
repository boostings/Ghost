CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    push_frequency VARCHAR(20) NOT NULL DEFAULT 'REALTIME',
    email_digest VARCHAR(30) NOT NULL DEFAULT 'DAILY_7AM',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_notification_preferences_push_frequency
        CHECK (push_frequency IN ('REALTIME', 'HOURLY', 'OFF')),
    CONSTRAINT chk_notification_preferences_email_digest
        CHECK (email_digest IN ('OFF', 'DAILY_7AM', 'WEEKLY_MON_7AM'))
);

CREATE TABLE notification_class_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preference_id UUID NOT NULL REFERENCES notification_preferences(id) ON DELETE CASCADE,
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    muted_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_class_override UNIQUE (preference_id, whiteboard_id)
);

CREATE INDEX idx_notification_preferences_email_digest
    ON notification_preferences(email_digest);

CREATE INDEX idx_notification_class_overrides_whiteboard
    ON notification_class_overrides(whiteboard_id);
