package com.ghost.dto.response;

import com.ghost.model.enums.VoteType;
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
public class CommentResponse {

    private UUID id;

    private UUID questionId;

    private UUID authorId;

    private String authorName;

    private String body;

    private boolean isVerifiedAnswer;

    private int karmaScore;

    private VoteType userVote;

    private boolean canEdit;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
