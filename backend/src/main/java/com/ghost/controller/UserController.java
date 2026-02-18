package com.ghost.controller;

import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.response.UserResponse;
import com.ghost.model.User;
import com.ghost.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(mapToUserResponse(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody UpdateUserRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        User user = userService.updateUser(userId, request);
        return ResponseEntity.ok(mapToUserResponse(user));
    }

    @PutMapping("/me/push-token")
    public ResponseEntity<Void> updatePushToken(
            @AuthenticationPrincipal String userIdStr,
            @RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(userIdStr);
        userService.updatePushToken(userId, body.get("token"));
        return ResponseEntity.ok().build();
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .karmaScore(user.getKarmaScore())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
