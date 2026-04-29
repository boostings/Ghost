package com.ghost.mapper;

import com.ghost.dto.response.CommentResponse;
import com.ghost.model.Comment;
import com.ghost.model.enums.VoteType;
import com.ghost.util.CommentEditPolicy;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class CommentMapper {

    public CommentResponse toResponse(Comment comment, UUID currentUserId, VoteType userVote, boolean viewerIsFaculty) {
        var author = comment.getAuthor();
        boolean maskAuthor = author.isAnonymousMode()
                && !viewerIsFaculty
                && !author.getId().equals(currentUserId);

        boolean canEdit = author.getId().equals(currentUserId)
                && CommentEditPolicy.isEditable(comment, LocalDateTime.now());

        return CommentResponse.builder()
                .id(comment.getId())
                .questionId(comment.getQuestion().getId())
                .authorId(maskAuthor ? null : author.getId())
                .authorName(maskAuthor ? "Ghost" : author.getFirstName() + " " + author.getLastName())
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
