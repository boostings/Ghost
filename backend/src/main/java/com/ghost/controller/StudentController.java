package com.ghost.controller;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.JoinWhiteboardRequest;
import com.ghost.dto.request.ReportRequest;
import com.ghost.dto.request.VoteRequest;
import com.ghost.dto.response.BookmarkResponse;
import com.ghost.dto.response.CommentResponse;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.dto.response.ReportResponse;
import com.ghost.service.BookmarkService;
import com.ghost.service.CommentService;
import com.ghost.service.KarmaService;
import com.ghost.service.QuestionService;
import com.ghost.service.ReportService;
import com.ghost.service.WhiteboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentController {

    private final QuestionService questionService;
    private final CommentService commentService;
    private final KarmaService karmaService;
    private final BookmarkService bookmarkService;
    private final ReportService reportService;
    private final WhiteboardService whiteboardService;

    @PostMapping("/whiteboards/{wbId}/questions")
    public ResponseEntity<QuestionResponse> createQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody CreateQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(questionService.createQuestion(userId, wbId, request));
    }

    @PutMapping("/whiteboards/{wbId}/questions/{qId}")
    public ResponseEntity<QuestionResponse> editQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId,
            @Valid @RequestBody EditQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(questionService.editQuestion(userId, wbId, qId, request));
    }

    @DeleteMapping("/whiteboards/{wbId}/questions/{qId}")
    public ResponseEntity<Void> deleteQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.deleteQuestion(userId, wbId, qId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/questions/{qId}/comments")
    public ResponseEntity<CommentResponse> createComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @Valid @RequestBody CreateCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.createComment(userId, qId, request));
    }

    @PutMapping("/questions/{qId}/comments/{commentId}")
    public ResponseEntity<CommentResponse> editComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID commentId,
            @Valid @RequestBody EditCommentRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(commentService.editComment(userId, qId, commentId, request));
    }

    @DeleteMapping("/questions/{qId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @PathVariable UUID commentId) {
        UUID userId = UUID.fromString(userIdStr);
        commentService.deleteComment(userId, qId, commentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/questions/{qId}/vote")
    public ResponseEntity<Void> voteOnQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId,
            @Valid @RequestBody VoteRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.voteOnQuestion(userId, qId, request.getVoteType());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/comments/{commentId}/vote")
    public ResponseEntity<Void> voteOnComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID commentId,
            @Valid @RequestBody VoteRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.voteOnComment(userId, commentId, request.getVoteType());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/questions/{qId}/vote")
    public ResponseEntity<Void> removeQuestionVote(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.removeQuestionVote(userId, qId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/comments/{commentId}/vote")
    public ResponseEntity<Void> removeCommentVote(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID commentId) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.removeCommentVote(userId, commentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/questions/{qId}/bookmark")
    public ResponseEntity<BookmarkResponse> bookmark(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(bookmarkService.bookmark(userId, qId));
    }

    @DeleteMapping("/questions/{qId}/bookmark")
    public ResponseEntity<Void> removeBookmark(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        bookmarkService.removeBookmark(userId, qId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reports")
    public ResponseEntity<ReportResponse> reportContent(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody ReportRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.reportContent(userId, request));
    }

    @PostMapping("/whiteboards/{wbId}/join-request")
    public ResponseEntity<JoinRequestResponse> requestToJoin(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(whiteboardService.requestToJoinResponse(userId, wbId));
    }

    @PostMapping("/whiteboards/join-by-invite")
    public ResponseEntity<Void> joinByInviteCode(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody JoinWhiteboardRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.joinByInviteCode(userId, request.getInviteCode());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/whiteboards/{wbId}/leave")
    public ResponseEntity<Void> leaveWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.leaveWhiteboard(userId, wbId);
        return ResponseEntity.noContent().build();
    }
}
