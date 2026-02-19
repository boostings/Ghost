package com.ghost.model.enums;

import java.util.Locale;

public enum NotificationReferenceType {
    QUESTION,
    COMMENT,
    TOPIC,
    REPORT,
    WHITEBOARD,
    JOIN_REQUEST,
    USER,
    UNKNOWN;

    public static NotificationReferenceType from(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return UNKNOWN;
        }
        String normalized = rawValue.trim()
                .replaceAll("([a-z0-9])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .toUpperCase(Locale.ROOT);
        try {
            return NotificationReferenceType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return UNKNOWN;
        }
    }
}
