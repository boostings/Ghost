package com.ghost.mapper;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.Question;
import com.ghost.model.enums.VoteType;
import org.springframework.stereotype.Component;

import java.util.UUID;

import static java.lang.Math.toIntExact;

@Component
public class QuestionMapper {

    public QuestionResponse toResponse(
            Question question,
            UUID viewerId,
            boolean viewerIsFaculty,
            VoteType userVote,
            long commentCount,
            boolean isBookmarked,
            boolean includeModerationData,
            String verifiedAnswerPreview,
            String verifiedAnswerAuthorName
    ) {
        var author = question.getAuthor();
        boolean maskAuthor = author.isAnonymousMode()
                && !viewerIsFaculty
                && !author.getId().equals(viewerId);

        var whiteboard = question.getWhiteboard();
        var course = whiteboard != null ? whiteboard.getCourse() : null;
        return QuestionResponse.builder()
                .id(question.getId())
                .whiteboardId(whiteboard != null ? whiteboard.getId() : null)
                .whiteboardCourseCode(course != null ? course.getCourseCode() : null)
                .whiteboardCourseName(course != null ? course.getCourseName() : null)
                .authorId(maskAuthor ? null : author.getId())
                .authorName(maskAuthor ? "Ghost" : author.getFirstName() + " " + author.getLastName())
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
                .verifiedAnswerPreview(verifiedAnswerPreview)
                .verifiedAnswerAuthorName(verifiedAnswerAuthorName)
                .isBookmarked(isBookmarked)
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .editedAt(question.getEditedAt())
                .build();
    }
}
