package com.ghost.dto.response;

import com.ghost.model.enums.JoinRequestStatus;
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
public class JoinRequestResponse {

    private UUID id;

    private UUID userId;

    private String userName;

    private String userEmail;

    private UUID whiteboardId;

    private JoinRequestStatus status;

    private LocalDateTime createdAt;
}
