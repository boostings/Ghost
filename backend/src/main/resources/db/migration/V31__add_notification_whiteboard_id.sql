ALTER TABLE notifications
    ADD COLUMN whiteboard_id UUID REFERENCES whiteboards(id) ON DELETE SET NULL;

CREATE INDEX idx_notifications_recipient_unread_created_at
    ON notifications(recipient_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_whiteboard_id
    ON notifications(whiteboard_id);
