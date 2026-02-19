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
public class UpdatePushTokenRequest {

    @NotBlank(message = "Push token is required")
    @Size(max = 255, message = "Push token must not exceed 255 characters")
    private String token;
}
