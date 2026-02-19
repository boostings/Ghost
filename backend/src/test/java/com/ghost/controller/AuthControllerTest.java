package com.ghost.controller;

import com.ghost.dto.request.RegisterRequest;
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
    void deleteAccountShouldReturnNoContent() {
        UUID userId = UUID.randomUUID();

        ResponseEntity<Void> response = authController.deleteAccount(userId.toString());

        verify(authService).deleteAccount(userId);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
