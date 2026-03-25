package com.ghost.mapper;

import com.ghost.dto.response.CommentResponse;
import com.ghost.model.Comment;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.KarmaVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CommentMapper {

    private final KarmaVoteRepository karmaVoteRepository;

    public CommentResponse toResponse(Comment comment, UUID currentUserId) {
        VoteType userVote = karmaVoteRepository.findByUserIdAndCommentId(currentUserId, comment.getId())
                .map(v -> v.getVoteType())
                .orElse(null);
        boolean canEdit = comment.getAuthor().getId().equals(currentUserId)
                && comment.getEditDeadline() != null
                && comment.getEditDeadline().isAfter(LocalDateTime.now());

        return CommentResponse.builder()
                .id(comment.getId())
                .questionId(comment.getQuestion().getId())
                .authorId(comment.getAuthor().getId())
                .authorName(comment.getAuthor().getFirstName() + " " + comment.getAuthor().getLastName())
                .body(comment.getBody())
                .isVerifiedAnswer(comment.getVerifiedBy() != null)
                .verifiedById(comment.getVerifiedBy() != null ? comment.getVerifiedBy().getId() : null)
                .verifiedByName(comment.getVerifiedBy() != null
                        ? comment.getVerifiedBy().getFirstName() + " " + comment.getVerifiedBy().getLastName()
                        : null)
                .karmaScore(comment.getKarmaScore())
                .userVote(userVote)
                .canEdit(canEdit)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
