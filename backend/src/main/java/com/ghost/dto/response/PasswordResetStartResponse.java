package com.ghost.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetStartResponse {

    private NextStep nextStep;

    public enum NextStep {
        RESET_PASSWORD,
        VERIFY_EMAIL
    }
}
