package com.ghost.dto.request;

import com.ghost.model.enums.JoinRequestStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestActionRequest {

    @NotNull(message = "Status is required")
    private JoinRequestStatus status;
}
