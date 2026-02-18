package com.ghost.controller;

import com.ghost.dto.request.ReportRequest;
import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.ReportResponse;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Report;
import com.ghost.repository.ReportRepository;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final WhiteboardService whiteboardService;
    private final ReportRepository reportRepository;

    @PostMapping
    public ResponseEntity<ReportResponse> createReport(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody ReportRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        Report report = reportService.reportContent(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToReportResponse(report));
    }

    @GetMapping("/whiteboard/{wbId}")
    public ResponseEntity<PageResponse<ReportResponse>> getReportsByWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, wbId);
        Pageable pageable = PageRequest.of(page, size);
        Page<Report> reportPage = reportService.getReportsForWhiteboard(wbId, pageable);
        List<ReportResponse> content = reportPage.getContent().stream()
                .map(this::mapToReportResponse)
                .collect(Collectors.toList());
        PageResponse<ReportResponse> response = PageResponse.<ReportResponse>builder()
                .content(content)
                .page(reportPage.getNumber())
                .size(reportPage.getSize())
                .totalElements(reportPage.getTotalElements())
                .totalPages(reportPage.getTotalPages())
                .build();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReportResponse> reviewReport(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @Valid @RequestBody ReviewReportRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        reportService.reviewReport(userId, id, request);
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));
        return ResponseEntity.ok(mapToReportResponse(report));
    }

    private ReportResponse mapToReportResponse(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .reporterId(report.getReporter().getId())
                .reporterName(report.getReporter().getFirstName() + " " + report.getReporter().getLastName())
                .questionId(report.getQuestion() != null ? report.getQuestion().getId() : null)
                .commentId(report.getComment() != null ? report.getComment().getId() : null)
                .reason(report.getReason())
                .notes(report.getNotes())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
