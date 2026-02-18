package com.ghost.dto.request;

import com.ghost.model.enums.ReportReason;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    private UUID questionId;

    private UUID commentId;

    @NotNull(message = "Reason is required")
    private ReportReason reason;

    private String notes;
}
