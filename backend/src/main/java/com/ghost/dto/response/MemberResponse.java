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
public class MemberResponse {

    private UUID id;

    private UUID userId;

    private String firstName;

    private String lastName;

    private String email;

    private Role role;

    private LocalDateTime joinedAt;
}
