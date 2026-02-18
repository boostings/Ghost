package com.ghost.controller;

import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
        QuestionResponse response = questionService.createQuestion(userId, wbId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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
        PageResponse<QuestionResponse> response = questionService.getQuestions(userId, wbId, page, size, topic, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionResponse> getQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        QuestionResponse response = questionService.getQuestion(userId, wbId, id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuestionResponse> updateQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @Valid @RequestBody EditQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        QuestionResponse response = questionService.updateQuestion(userId, wbId, id, request);
        return ResponseEntity.ok(response);
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
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<Void> pinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.pinQuestion(userId, wbId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/pin")
    public ResponseEntity<Void> unpinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.unpinQuestion(userId, wbId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/forward")
    public ResponseEntity<Void> forwardQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @Valid @RequestBody ForwardQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.forwardQuestion(userId, wbId, id, request);
        return ResponseEntity.ok().build();
    }
}
