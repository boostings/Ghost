package com.ghost.dto.response;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ghost.model.enums.NotificationType;
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
@JsonAutoDetect(isGetterVisibility = Visibility.NONE)
public class NotificationResponse {

    private UUID id;

    private NotificationType type;

    private String title;

    private String body;

    private String referenceType;

    private UUID referenceId;

    @JsonProperty("isRead")
    private boolean isRead;

    private LocalDateTime createdAt;
}
