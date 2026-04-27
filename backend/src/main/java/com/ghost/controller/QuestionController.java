package com.ghost.controller;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.dto.response.CommentResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.service.QuestionService;
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
@RequestMapping("/api/whiteboards/{wbId}/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    @PostMapping
    public ResponseEntity<QuestionResponse> createQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody CreateQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        QuestionResponse question = questionService.createQuestion(userId, wbId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(question);
    }

    @GetMapping
    public ResponseEntity<PageResponse<QuestionResponse>> getQuestions(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) UUID topic,
            @RequestParam(required = false) String status) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<QuestionResponse> questionPage = questionService.getQuestions(userId, wbId, topic, status, pageable);
        return ResponseEntity.ok(PageResponse.from(questionPage));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionResponse> getQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        QuestionResponse question = questionService.getQuestionByIdAndWhiteboard(userId, id, wbId);
        return ResponseEntity.ok(question);
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuestionResponse> updateQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @Valid @RequestBody EditQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        QuestionResponse question = questionService.editQuestion(userId, wbId, id, request);
        return ResponseEntity.ok(question);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.deleteQuestion(userId, wbId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<Void> closeQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.closeQuestion(userId, wbId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<Void> pinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.pinQuestion(userId, wbId, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/pin")
    public ResponseEntity<Void> unpinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.unpinQuestion(userId, wbId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/forward")
    public ResponseEntity<Void> forwardQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @Valid @RequestBody ForwardQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.forwardQuestion(userId, wbId, id, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> createComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        CommentResponse comment = questionService.createComment(userId, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<PageResponse<CommentResponse>> getComments(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<CommentResponse> comments = questionService.getCommentsByQuestion(userId, id, pageable);
        return ResponseEntity.ok(PageResponse.from(comments));
    }

    @PutMapping("/{qId}/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId,
            @PathVariable UUID commentId,
            @Valid @RequestBody EditCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        CommentResponse comment = questionService.editComment(userId, qId, commentId, request);
        return ResponseEntity.ok(comment);
    }

    @DeleteMapping("/{qId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId,
            @PathVariable UUID commentId) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.deleteComment(userId, qId, commentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{qId}/comments/{commentId}/verify")
    public ResponseEntity<CommentResponse> verifyComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId,
            @PathVariable UUID commentId) {
        UUID userId = UUID.fromString(userIdStr);
        CommentResponse comment = questionService.markAsVerifiedAnswer(userId, qId, commentId);
        return ResponseEntity.ok(comment);
    }
}
