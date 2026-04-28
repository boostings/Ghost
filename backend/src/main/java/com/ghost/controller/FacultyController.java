package com.ghost.controller;

import com.ghost.dto.request.CreateTopicRequest;
import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.request.EmailRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.dto.request.JoinRequestActionRequest;
import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.dto.request.TransferOwnershipRequest;
import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.MemberResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.dto.response.ReportResponse;
import com.ghost.dto.response.TopicResponse;
import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.service.AuditLogService;
import com.ghost.service.QuestionService;
import com.ghost.service.ReportService;
import com.ghost.service.TopicService;
import com.ghost.service.WhiteboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/faculty")
@RequiredArgsConstructor
public class FacultyController {

    private final WhiteboardService whiteboardService;
    private final QuestionService questionService;
    private final TopicService topicService;
    private final ReportService reportService;
    private final AuditLogService auditLogService;

    @PostMapping("/whiteboards")
    public ResponseEntity<WhiteboardResponse> createWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody CreateWhiteboardRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(whiteboardService.createWhiteboardResponse(userId, request));
    }

    @DeleteMapping("/whiteboards/{wbId}")
    public ResponseEntity<Void> deleteWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.deleteWhiteboard(userId, wbId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/whiteboards/{wbId}/transfer-ownership")
    public ResponseEntity<Void> transferOwnership(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody TransferOwnershipRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.transferOwnership(userId, wbId, request.getNewOwnerEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/whiteboards/{wbId}/invite-faculty")
    public ResponseEntity<Void> inviteFaculty(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody EmailRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.inviteFaculty(userId, wbId, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/whiteboards/{wbId}/enlist")
    public ResponseEntity<Void> enlistUser(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody EmailRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.enlistUser(userId, wbId, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/whiteboards/{wbId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID memberId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.removeMember(userId, wbId, memberId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/whiteboards/{wbId}/join-requests/{requestId}")
    public ResponseEntity<Void> handleJoinRequest(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID requestId,
            @Valid @RequestBody JoinRequestActionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.handleJoinRequest(userId, wbId, requestId, request.getStatus());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/whiteboards/{wbId}/join-requests")
    public ResponseEntity<PageResponse<JoinRequestResponse>> getJoinRequestResponses(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<JoinRequestResponse> responses = whiteboardService.getJoinRequestResponses(userId, wbId, pageable);
        return ResponseEntity.ok(PageResponse.from(responses));
    }

    @GetMapping("/whiteboards/{wbId}/invite-info")
    public ResponseEntity<InviteInfoResponse> getInviteInfo(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(whiteboardService.getInviteInfo(userId, wbId));
    }

    @PostMapping("/whiteboards/{wbId}/questions/{qId}/close")
    public ResponseEntity<Void> closeQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        questionService.closeQuestion(userId, wbId, qId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/whiteboards/{wbId}/questions/{qId}/pin")
    public ResponseEntity<QuestionResponse> pinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(questionService.pinQuestion(userId, wbId, qId));
    }

    @DeleteMapping("/whiteboards/{wbId}/questions/{qId}/pin")
    public ResponseEntity<QuestionResponse> unpinQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(questionService.unpinQuestion(userId, wbId, qId));
    }

    @PostMapping("/whiteboards/{wbId}/questions/{qId}/forward")
    public ResponseEntity<QuestionResponse> forwardQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID qId,
            @Valid @RequestBody ForwardQuestionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(questionService.forwardQuestion(userId, wbId, qId, request));
    }

    @PostMapping("/whiteboards/{wbId}/topics")
    public ResponseEntity<TopicResponse> createTopic(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody CreateTopicRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.status(HttpStatus.CREATED).body(topicService.createTopic(userId, wbId, request.getName()));
    }

    @DeleteMapping("/whiteboards/{wbId}/topics/{topicId}")
    public ResponseEntity<Void> deleteTopic(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID topicId) {
        UUID userId = UUID.fromString(userIdStr);
        topicService.deleteTopic(userId, wbId, topicId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reports/{reportId}")
    public ResponseEntity<ReportResponse> reviewReport(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID reportId,
            @Valid @RequestBody ReviewReportRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(reportService.reviewReport(userId, reportId, request));
    }

    @GetMapping(value = "/whiteboards/{wbId}/audit-logs/export", produces = "text/csv")
    public ResponseEntity<String> exportToCsv(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, wbId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header("Content-Disposition", "attachment; filename=\"audit-logs.csv\"")
                .body(auditLogService.exportToCsv(wbId));
    }

    @GetMapping("/whiteboards/{wbId}/members")
    public ResponseEntity<PageResponse<MemberResponse>> getMembers(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(PageResponse.from(whiteboardService.getMemberResponses(userId, wbId, pageable)));
    }
}
