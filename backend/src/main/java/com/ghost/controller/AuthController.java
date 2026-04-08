package com.ghost.controller;

import com.ghost.dto.request.LoginRequest;
import com.ghost.dto.request.RefreshTokenRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.ResetPasswordRequest;
import com.ghost.dto.request.ResendVerificationRequest;
import com.ghost.dto.request.VerifyEmailRequest;
import com.ghost.dto.request.VerifyPasswordResetCodeRequest;
import com.ghost.dto.response.AuthResponse;
import com.ghost.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request) {
        log.debug("Register request received for email={}", request.getEmail());
        authService.register(request);
        log.debug("Register request completed for email={}", request.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        log.debug("Verify-email request received for email={}", request.getEmail());
        AuthResponse response = authService.verifyEmail(request);
        log.debug("Verify-email request completed for email={}", request.getEmail());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        log.debug("Resend-verification request received for email={}", request.getEmail());
        authService.resendVerificationCode(request.getEmail());
        log.debug("Resend-verification request completed for email={}", request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ResendVerificationRequest request) {
        log.info("Forgot-password request received for email={}", request.getEmail());
        authService.startPasswordReset(request.getEmail());
        log.info("Forgot-password request completed for email={}", request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify-password-reset")
    public ResponseEntity<Void> verifyPasswordResetCode(
            @Valid @RequestBody VerifyPasswordResetCodeRequest request) {
        log.info("Verify-password-reset request received for email={}", request.getEmail());
        authService.verifyPasswordResetCode(request);
        log.info("Verify-password-reset request completed for email={}", request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        log.info("Reset-password request received for email={}", request.getEmail());
        AuthResponse response = authService.resetPassword(request);
        log.info("Reset-password request completed for email={}", request.getEmail());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.debug("Login request received for email={}", request.getEmail());
        AuthResponse response = authService.login(request);
        log.debug("Login request completed for email={}", request.getEmail());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        log.debug("Refresh token request received");
        AuthResponse response = authService.refreshToken(request);
        log.debug("Refresh token request completed");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        log.debug("Delete-account request received for userId={}", userId);
        authService.deleteAccount(userId);
        log.debug("Delete-account request completed for userId={}", userId);
        return ResponseEntity.noContent().build();
    }
}
