package com.ghost.controller;

import com.ghost.dto.request.ResetPasswordRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.ResendVerificationRequest;
import com.ghost.dto.request.VerifyEmailRequest;
import com.ghost.dto.request.VerifyPasswordResetCodeRequest;
import com.ghost.dto.response.AuthResponse;
import com.ghost.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    void registerShouldReturnCreated() {
        RegisterRequest request = RegisterRequest.builder()
                .email("student@ilstu.edu")
                .password("password1")
                .firstName("Student")
                .lastName("User")
                .build();

        ResponseEntity<Void> response = authController.register(request);

        verify(authService).register(request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void verifyEmailShouldReturnAuthResponse() {
        VerifyEmailRequest request = VerifyEmailRequest.builder()
                .email("student@ilstu.edu")
                .code("123456")
                .build();
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .build();

        when(authService.verifyEmail(request)).thenReturn(authResponse);

        ResponseEntity<AuthResponse> response = authController.verifyEmail(request);

        verify(authService).verifyEmail(request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(authResponse);
    }

    @Test
    void forgotPasswordShouldReturnNoContent() {
        ResendVerificationRequest request = ResendVerificationRequest.builder()
                .email("student@ilstu.edu")
                .build();

        ResponseEntity<Void> response = authController.forgotPassword(request);

        verify(authService).startPasswordReset("student@ilstu.edu");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void verifyPasswordResetCodeShouldReturnNoContent() {
        VerifyPasswordResetCodeRequest request = VerifyPasswordResetCodeRequest.builder()
                .email("student@ilstu.edu")
                .code("123456")
                .build();

        ResponseEntity<Void> response = authController.verifyPasswordResetCode(request);

        verify(authService).verifyPasswordResetCode(request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void resetPasswordShouldReturnAuthResponse() {
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .email("student@ilstu.edu")
                .code("123456")
                .newPassword("password1")
                .confirmPassword("password1")
                .build();
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .build();

        when(authService.resetPassword(request)).thenReturn(authResponse);

        ResponseEntity<AuthResponse> response = authController.resetPassword(request);

        verify(authService).resetPassword(request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(authResponse);
    }

    @Test
    void deleteAccountShouldReturnNoContent() {
        UUID userId = UUID.randomUUID();

        ResponseEntity<Void> response = authController.deleteAccount(userId.toString());

        verify(authService).deleteAccount(userId);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
