package com.ghost.dto.request;

import com.ghost.model.enums.ReportStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReportRequest {

    @NotNull(message = "Status is required")
    private ReportStatus status;

    @AssertTrue(message = "Status must be REVIEWED or DISMISSED")
    public boolean isTerminalStatus() {
        return status == ReportStatus.REVIEWED || status == ReportStatus.DISMISSED;
    }
}
