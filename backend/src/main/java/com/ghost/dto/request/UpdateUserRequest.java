package com.ghost.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(max = 100, message = "First name must not exceed 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\u00C0-\\u024F]*$", message = "First name must contain letters only")
    private String firstName;

    @Size(max = 100, message = "Last name must not exceed 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\u00C0-\\u024F]*$", message = "Last name must contain letters only")
    private String lastName;

    @Size(max = 5000, message = "Settings payload is too large")
    private String settingsJson;

    private Boolean anonymousMode;
}
