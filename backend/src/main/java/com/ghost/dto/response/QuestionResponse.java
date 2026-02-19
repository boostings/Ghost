package com.ghost.dto.response;

import com.ghost.model.enums.QuestionStatus;
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
public class QuestionResponse {

    private UUID id;

    private UUID whiteboardId;

    private UUID authorId;

    private String authorName;

    private UUID topicId;

    private String topicName;

    private String title;

    private String body;

    private QuestionStatus status;

    private boolean isPinned;

    private boolean isHidden;

    private int karmaScore;

    private VoteType userVote;

    private long commentCount;

    private UUID verifiedAnswerId;

    private boolean isBookmarked;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
