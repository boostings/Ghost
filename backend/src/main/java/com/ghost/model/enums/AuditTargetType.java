package com.ghost.model.enums;

import java.util.Locale;

public enum AuditTargetType {
    USER,
    WHITEBOARD,
    QUESTION,
    COMMENT,
    TOPIC,
    REPORT,
    JOIN_REQUEST,
    NOTIFICATION,
    BOOKMARK,
    KARMA_VOTE,
    COURSE_CATALOG,
    UNKNOWN;

    public static AuditTargetType from(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return UNKNOWN;
        }
        String normalized = rawValue.trim()
                .replaceAll("([a-z0-9])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .toUpperCase(Locale.ROOT);
        try {
            return AuditTargetType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return UNKNOWN;
        }
    }
}
