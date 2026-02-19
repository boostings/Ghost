package com.ghost.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class JoinWhiteboardRequest {

    @NotBlank(message = "Invite code is required")
    @Size(min = 8, max = 32, message = "Invite code must be between 8 and 32 characters")
    private String inviteCode;
}
