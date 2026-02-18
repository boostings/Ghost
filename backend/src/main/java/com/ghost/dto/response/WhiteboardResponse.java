package com.ghost.dto.response;

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
public class WhiteboardResponse {

    private UUID id;

    private String courseCode;

    private String courseName;

    private String section;

    private String semester;

    private UUID ownerId;

    private String ownerName;

    private String inviteCode;

    private boolean isDemo;

    private long memberCount;

    private LocalDateTime createdAt;
}
