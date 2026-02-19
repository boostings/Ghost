package com.ghost.mapper;

import com.ghost.dto.response.ReportResponse;
import com.ghost.model.Report;
import org.springframework.stereotype.Component;

@Component
public class ReportMapper {

    public ReportResponse toResponse(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .questionId(report.getQuestion() != null ? report.getQuestion().getId() : null)
                .commentId(report.getComment() != null ? report.getComment().getId() : null)
                .reason(report.getReason())
                .notes(report.getNotes())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
