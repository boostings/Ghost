package com.ghost.dto.request;

import com.ghost.model.enums.ReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    private UUID questionId;

    private UUID commentId;

    @NotNull(message = "Reason is required")
    private ReportReason reason;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
}
