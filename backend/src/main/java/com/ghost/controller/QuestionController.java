package com.ghost.controller;

import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.Question;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import com.ghost.service.QuestionService;
import com.ghost.service.WhiteboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/whiteboards/{wbId}/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;
    private final WhiteboardService whiteboardService;
    private final CommentRepository commentRepository;
    private final KarmaVoteRepository karmaVoteRepository;
    private final BookmarkRepository bookmarkRepository;

    @PostMapping
    public ResponseEntity<QuestionResponse> createQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody CreateQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        Question question = questionService.createQuestion(userId, wbId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToQuestionResponse(question, userId));
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
        whiteboardService.verifyMembership(userId, wbId);
        Pageable pageable = PageRequest.of(page, size);
        Page<Question> questionPage = questionService.getQuestions(wbId, pageable);
        List<QuestionResponse> content = questionPage.getContent().stream()
                .map(q -> mapToQuestionResponse(q, userId))
                .collect(Collectors.toList());
        PageResponse<QuestionResponse> response = PageResponse.<QuestionResponse>builder()
                .content(content)
                .page(questionPage.getNumber())
                .size(questionPage.getSize())
                .totalElements(questionPage.getTotalElements())
                .totalPages(questionPage.getTotalPages())
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionResponse> getQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyMembership(userId, wbId);
        Question question = questionService.getQuestionById(id);
        return ResponseEntity.ok(mapToQuestionResponse(question, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuestionResponse> updateQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @Valid @RequestBody EditQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        Question question = questionService.editQuestion(userId, id, request);
        return ResponseEntity.ok(mapToQuestionResponse(question, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.deleteQuestion(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<Void> closeQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.closeQuestion(userId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<Void> pinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.pinQuestion(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/pin")
    public ResponseEntity<Void> unpinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.unpinQuestion(userId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/forward")
    public ResponseEntity<Void> forwardQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id,
            @Valid @RequestBody ForwardQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.forwardQuestion(userId, id, request);
        return ResponseEntity.ok().build();
    }

    private QuestionResponse mapToQuestionResponse(Question q, UUID currentUserId) {
        long commentCount = commentRepository.findByQuestionIdOrderByCreatedAtAsc(q.getId()).size();
        VoteType userVote = karmaVoteRepository.findByUserIdAndQuestionId(currentUserId, q.getId())
                .map(v -> v.getVoteType())
                .orElse(null);
        boolean isBookmarked = bookmarkRepository.existsByUserIdAndQuestionId(currentUserId, q.getId());

        return QuestionResponse.builder()
                .id(q.getId())
                .whiteboardId(q.getWhiteboard().getId())
                .authorId(q.getAuthor().getId())
                .authorName(q.getAuthor().getFirstName() + " " + q.getAuthor().getLastName())
                .topicId(q.getTopic() != null ? q.getTopic().getId() : null)
                .topicName(q.getTopic() != null ? q.getTopic().getName() : null)
                .title(q.getTitle())
                .body(q.getBody())
                .status(q.getStatus())
                .isPinned(q.isPinned())
                .isHidden(q.isHidden())
                .karmaScore(q.getKarmaScore())
                .userVote(userVote)
                .commentCount(commentCount)
                .verifiedAnswerId(q.getVerifiedAnswerId())
                .isBookmarked(isBookmarked)
                .createdAt(q.getCreatedAt())
                .updatedAt(q.getUpdatedAt())
                .build();
    }
}
