package com.ghost.dto.request;

import com.ghost.model.enums.JoinRequestStatus;
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
public class JoinRequestActionRequest {

    @NotNull(message = "Status is required")
    private JoinRequestStatus status;

    @AssertTrue(message = "Status must be APPROVED or REJECTED")
    public boolean isTerminalStatus() {
        return status == JoinRequestStatus.APPROVED || status == JoinRequestStatus.REJECTED;
    }
}
