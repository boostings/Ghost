package com.ghost.controller;

import com.ghost.dto.request.LoginRequest;
import com.ghost.dto.request.RefreshTokenRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.ResendVerificationRequest;
import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.request.UpdatePushTokenRequest;
import com.ghost.dto.request.VerifyEmailRequest;
import com.ghost.dto.response.AuthResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request) {
        userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(userService.verifyEmail(request));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        userService.resendVerificationCode(request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(userService.refreshToken(request));
    }

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

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        userService.deleteAccount(userId);
        return ResponseEntity.noContent().build();
    }

}
