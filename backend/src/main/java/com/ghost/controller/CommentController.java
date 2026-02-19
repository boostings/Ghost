package com.ghost.controller;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.response.CommentResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/questions/{qId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentResponse> createComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @Valid @RequestBody CreateCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        CommentResponse comment = commentService.createComment(userId, qId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @GetMapping
    public ResponseEntity<PageResponse<CommentResponse>> getComments(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<CommentResponse> comments = commentService.getCommentsByQuestion(userId, qId, pageable);
        return ResponseEntity.ok(PageResponse.from(comments));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommentResponse> updateComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID id,
            @Valid @RequestBody EditCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        CommentResponse comment = commentService.editComment(userId, qId, id, request);
        return ResponseEntity.ok(comment);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        commentService.deleteComment(userId, qId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<Void> verifyComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        commentService.markAsVerifiedAnswer(userId, qId, id);
        return ResponseEntity.noContent().build();
    }
}
