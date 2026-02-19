package com.ghost.mapper;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.Question;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class QuestionMapper {

    private final CommentRepository commentRepository;
    private final KarmaVoteRepository karmaVoteRepository;
    private final BookmarkRepository bookmarkRepository;

    public QuestionResponse toResponse(Question question, UUID currentUserId, boolean includeModerationData) {
        VoteType userVote = karmaVoteRepository.findByUserIdAndQuestionId(currentUserId, question.getId())
                .map(vote -> vote.getVoteType())
                .orElse(null);

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
                .commentCount(commentRepository.countByQuestionId(question.getId()))
                .verifiedAnswerId(question.getVerifiedAnswerId())
                .isBookmarked(bookmarkRepository.existsByUserIdAndQuestionId(currentUserId, question.getId()))
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }
}
