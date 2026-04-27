package com.ghost.dto.response;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.fasterxml.jackson.annotation.JsonProperty;
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
public class WhiteboardResponse {

    private UUID id;

    private String courseCode;

    private String courseName;

    private String section;

    private String semester;

    private UUID ownerId;

    private String ownerName;

    private String inviteCode;

    @JsonProperty("isDemo")
    private boolean isDemo;

    private long memberCount;

    private LocalDateTime createdAt;
}
