package com.ghost.mapper;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.Question;
import com.ghost.model.enums.VoteType;
import org.springframework.stereotype.Component;

import static java.lang.Math.toIntExact;

@Component
public class QuestionMapper {

    public QuestionResponse toResponse(
            Question question,
            VoteType userVote,
            long commentCount,
            boolean isBookmarked,
            boolean includeModerationData
    ) {
        return QuestionResponse.builder()
                .id(question.getId())
                .whiteboardId(question.getWhiteboard().getId())
                .authorId(question.getAuthor().getId())
                .authorName(question.getAuthor().getFirstName() + " " + question.getAuthor().getLastName())
                .topicId(question.getTopic() != null ? question.getTopic().getId() : null)
                .topicName(question.getTopic() != null ? question.getTopic().getName() : null)
                .title(question.getTitle())
                .body(question.getBody())
                .status(question.getStatus())
                .isPinned(question.isPinned())
                .isHidden(includeModerationData && question.isHidden())
                .karmaScore(question.getKarmaScore())
                .userVote(userVote)
                .commentCount(toIntExact(commentCount))
                .verifiedAnswerId(question.getVerifiedAnswerId())
                .isBookmarked(isBookmarked)
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }
}
