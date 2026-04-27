package com.ghost.controller;

import com.ghost.dto.response.AuditLogResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.model.enums.AuditAction;
import com.ghost.service.AuditLogService;
import com.ghost.service.WhiteboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/whiteboards/{wbId}/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final WhiteboardService whiteboardService;

    @GetMapping
    public ResponseEntity<PageResponse<AuditLogResponse>> getAuditLogs(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, wbId);
        Pageable pageable = PageRequest.of(
                page,
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        AuditAction auditAction = null;
        if (action != null && !action.isBlank()) {
            try {
                auditAction = AuditAction.valueOf(action.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Invalid audit action: " + action);
            }
        }
        Page<AuditLogResponse> auditLogPage = auditLogService.getAuditLogs(
                wbId,
                pageable,
                auditAction,
                actorId,
                from,
                to
        );
        return ResponseEntity.ok(PageResponse.from(auditLogPage));
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
}
