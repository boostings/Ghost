package com.ghost.mapper;

import com.ghost.dto.response.AuditLogResponse;
import com.ghost.model.AuditLog;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    public AuditLogResponse toResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .actorId(log.getActor() != null ? log.getActor().getId() : null)
                .actorName(log.getActor() != null
                        ? log.getActor().getFirstName() + " " + log.getActor().getLastName()
                        : null)
                .action(log.getAction())
                .targetType(log.getTargetType() != null ? log.getTargetType().name() : null)
                .targetId(log.getTargetId())
                .oldValue(redactSensitive(log.getOldValue()))
                .newValue(redactSensitive(log.getNewValue()))
                .createdAt(log.getCreatedAt())
                .build();
    }

    public String redactSensitive(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        String lower = value.toLowerCase();
        if (lower.contains("password")
                || lower.contains("token")
                || lower.contains("verificationcode")
                || lower.contains("verification_code")
                || lower.contains("passwordhash")
                || lower.contains("password_hash")) {
            return "[REDACTED]";
        }
        return value;
    }
}
