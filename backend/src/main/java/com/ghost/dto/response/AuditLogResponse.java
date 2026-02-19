package com.ghost.dto.response;

import com.ghost.model.enums.AuditAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {

    private UUID id;

    private UUID actorId;

    private String actorName;

    private AuditAction action;

    private String targetType;

    private UUID targetId;

    private String oldValue;

    private String newValue;

    private LocalDateTime createdAt;
}
