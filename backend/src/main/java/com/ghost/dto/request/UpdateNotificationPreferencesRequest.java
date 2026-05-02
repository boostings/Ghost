package com.ghost.dto.request;

import jakarta.validation.constraints.Pattern;
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
public class UpdateNotificationPreferencesRequest {

    @Pattern(regexp = "REALTIME|HOURLY|OFF", message = "Invalid push frequency")
    private String pushFrequency;

    @Pattern(regexp = "OFF|DAILY_7AM|WEEKLY_MON_7AM", message = "Invalid email digest")
    private String emailDigest;
}
