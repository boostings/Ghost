package com.ghost.dto.response;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@JsonAutoDetect(isGetterVisibility = Visibility.NONE)
public class QuestionResponse {

    private UUID id;

    private UUID whiteboardId;

    private String whiteboardCourseCode;

    private String whiteboardCourseName;

    private UUID authorId;

    private String authorName;

    private UUID topicId;

    private String topicName;

    private String title;

    private String body;

    private QuestionStatus status;

    @JsonProperty("isPinned")
    private boolean isPinned;

    @JsonProperty("isHidden")
    private boolean isHidden;

    private int karmaScore;

    private VoteType userVote;

    private long commentCount;

    private UUID verifiedAnswerId;

    private String verifiedAnswerPreview;

    private String verifiedAnswerAuthorName;

    @JsonProperty("isBookmarked")
    private boolean isBookmarked;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
