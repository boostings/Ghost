package com.ghost.dto.response;

import com.ghost.model.enums.ReportReason;
import com.ghost.model.enums.ReportStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {

    private UUID id;

    private UUID reporterId;

    private String reporterName;

    private UUID questionId;

    private UUID commentId;

    private ReportReason reason;

    private String notes;

    private ReportStatus status;

    private LocalDateTime createdAt;
}
