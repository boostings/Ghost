package com.ghost.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferOwnershipRequest {

    @NotBlank(message = "New owner email is required")
    @Email(message = "New owner email must be valid")
    private String newOwnerEmail;
}
