package com.ghost.dto.request;

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
public class ForwardQuestionRequest {

    @NotNull(message = "Target faculty ID is required")
    private UUID targetFacultyId;
}
