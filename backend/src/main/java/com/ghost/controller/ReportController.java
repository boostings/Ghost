package com.ghost.controller;

import com.ghost.dto.request.ReportRequest;
import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.ReportResponse;
import com.ghost.model.enums.ReportStatus;
import com.ghost.service.ReportService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final WhiteboardService whiteboardService;

    @PostMapping
    public ResponseEntity<ReportResponse> createReport(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody ReportRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        ReportResponse report = reportService.reportContent(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    @GetMapping("/whiteboard/{wbId}")
    public ResponseEntity<PageResponse<ReportResponse>> getReportsByWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, wbId);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<ReportResponse> reportPage = reportService.getReportsForWhiteboard(
                wbId,
                status,
                pageable
        );
        return ResponseEntity.ok(PageResponse.from(reportPage));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReportResponse> reviewReport(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @Valid @RequestBody ReviewReportRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        ReportResponse report = reportService.reviewReport(userId, id, request);
        return ResponseEntity.ok(report);
    }
}
