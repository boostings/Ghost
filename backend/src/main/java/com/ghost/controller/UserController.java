package com.ghost.controller;

import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.response.UserResponse;
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
        UserResponse response = userService.getCurrentUser(userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody UpdateUserRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        UserResponse response = userService.updateUser(userId, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/push-token")
    public ResponseEntity<Void> updatePushToken(
            @AuthenticationPrincipal String userIdStr,
            @RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(userIdStr);
        userService.updatePushToken(userId, body.get("token"));
        return ResponseEntity.ok().build();
    }
}
