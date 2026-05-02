package com.ghost.dto.request;

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
public class UpdateClassNotificationOverrideRequest {

    @NotNull(message = "mutedFor24h is required")
    private Boolean mutedFor24h;
}
