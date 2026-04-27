package com.ghost.dto.response;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ghost.model.enums.VoteType;
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
public class CommentResponse {

    private UUID id;

    private UUID questionId;

    private UUID authorId;

    private String authorName;

    private String body;

    @JsonProperty("isVerifiedAnswer")
    private boolean isVerifiedAnswer;

    private UUID verifiedById;

    private String verifiedByName;

    private int karmaScore;

    private VoteType userVote;

    private boolean canEdit;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
