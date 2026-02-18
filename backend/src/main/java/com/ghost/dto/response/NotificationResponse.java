package com.ghost.dto.response;

import com.ghost.model.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private UUID id;

    private NotificationType type;

    private String title;

    private String body;

    private String referenceType;

    private UUID referenceId;

    private boolean isRead;

    private LocalDateTime createdAt;
}
