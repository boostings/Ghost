package com.ghost.dto.request;

import com.ghost.model.enums.ReportStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReportRequest {

    @NotNull(message = "Status is required")
    private ReportStatus status;
}
