package com.ghost.controller;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.response.CommentResponse;
import com.ghost.model.Comment;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.KarmaVoteRepository;
import com.ghost.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/questions/{qId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final KarmaVoteRepository karmaVoteRepository;

    @PostMapping
    public ResponseEntity<CommentResponse> createComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @Valid @RequestBody CreateCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        Comment comment = commentService.createComment(userId, qId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToCommentResponse(comment, userId));
    }

    @GetMapping
    public ResponseEntity<List<CommentResponse>> getComments(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        List<Comment> comments = commentService.getCommentsByQuestion(qId);
        List<CommentResponse> response = comments.stream()
                .map(c -> mapToCommentResponse(c, userId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommentResponse> updateComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID id,
            @Valid @RequestBody EditCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        Comment comment = commentService.editComment(userId, id, request);
        return ResponseEntity.ok(mapToCommentResponse(comment, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        commentService.deleteComment(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<Void> verifyComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        commentService.markAsVerifiedAnswer(userId, id);
        return ResponseEntity.ok().build();
    }

    private CommentResponse mapToCommentResponse(Comment c, UUID currentUserId) {
        VoteType userVote = karmaVoteRepository.findByUserIdAndCommentId(currentUserId, c.getId())
                .map(v -> v.getVoteType())
                .orElse(null);
        boolean canEdit = c.getAuthor().getId().equals(currentUserId)
                && c.getEditDeadline() != null
                && c.getEditDeadline().isAfter(LocalDateTime.now());

        return CommentResponse.builder()
                .id(c.getId())
                .questionId(c.getQuestion().getId())
                .authorId(c.getAuthor().getId())
                .authorName(c.getAuthor().getFirstName() + " " + c.getAuthor().getLastName())
                .body(c.getBody())
                .isVerifiedAnswer(c.isVerifiedAnswer())
                .karmaScore(c.getKarmaScore())
                .userVote(userVote)
                .canEdit(canEdit)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
