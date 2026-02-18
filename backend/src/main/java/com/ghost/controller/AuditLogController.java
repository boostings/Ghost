package com.ghost.controller;

import com.ghost.dto.response.AuditLogResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.model.AuditLog;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.AuditLogRepository;
import com.ghost.service.AuditLogService;
import com.ghost.service.WhiteboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/whiteboards/{wbId}/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final AuditLogRepository auditLogRepository;
    private final WhiteboardService whiteboardService;

    @GetMapping
    public ResponseEntity<PageResponse<AuditLogResponse>> getAuditLogs(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String action) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, wbId);
        Pageable pageable = PageRequest.of(page, size);

        Page<AuditLog> auditLogPage;
        if (action != null && !action.isBlank()) {
            AuditAction auditAction = AuditAction.valueOf(action.toUpperCase());
            auditLogPage = auditLogRepository.findByWhiteboardIdAndAction(wbId, auditAction, pageable);
        } else {
            auditLogPage = auditLogService.getAuditLogs(wbId, pageable);
        }

        List<AuditLogResponse> content = auditLogPage.getContent().stream()
                .map(this::mapToAuditLogResponse)
                .collect(Collectors.toList());
        PageResponse<AuditLogResponse> response = PageResponse.<AuditLogResponse>builder()
                .content(content)
                .page(auditLogPage.getNumber())
                .size(auditLogPage.getSize())
                .totalElements(auditLogPage.getTotalElements())
                .totalPages(auditLogPage.getTotalPages())
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    public ResponseEntity<String> exportAuditLogs(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, wbId);
        String csv = auditLogService.exportToCsv(wbId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header("Content-Disposition", "attachment; filename=\"audit-logs.csv\"")
                .body(csv);
    }

    private AuditLogResponse mapToAuditLogResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .actorId(log.getActor() != null ? log.getActor().getId() : null)
                .actorName(log.getActor() != null
                        ? log.getActor().getFirstName() + " " + log.getActor().getLastName()
                        : null)
                .action(log.getAction())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
