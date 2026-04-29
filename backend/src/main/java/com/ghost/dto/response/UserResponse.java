package com.ghost.dto.response;

import com.ghost.model.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;

    private String email;

    private String firstName;

    private String lastName;

    private Role role;

    private int karmaScore;

    private boolean emailVerified;

    private boolean pushNotificationsEnabled;

    private boolean emailNotificationsEnabled;

    private LocalDateTime createdAt;
}
