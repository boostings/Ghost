package com.ghost.controller;

import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.request.UpdatePushTokenRequest;
import com.ghost.dto.response.UserResponse;
import com.ghost.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        UserResponse user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody UpdateUserRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        UserResponse user = userService.updateUser(userId, request);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me/push-token")
    public ResponseEntity<Void> updatePushToken(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody UpdatePushTokenRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        userService.updatePushToken(userId, request.getToken());
        return ResponseEntity.noContent().build();
    }

}
