package com.ghost.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ghost.dto.request.LoginRequest;
import com.ghost.dto.request.RefreshTokenRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.response.AuthResponse;
import com.ghost.mapper.UserMapper;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private AuthService authService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private UserMapper userMapper;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private UserService userService;

    @Test
    void registerShouldDelegateToAuthService() {
        RegisterRequest request = RegisterRequest.builder()
                .email("student@ilstu.edu")
                .password("password1")
                .firstName("Student")
                .lastName("User")
                .build();

        userService.register(request);

        verify(authService).register(request);
    }

    @Test
    void refreshTokenShouldDelegateToAuthService() {
        RefreshTokenRequest request = new RefreshTokenRequest("refresh-token");
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token-next")
                .build();
        when(authService.refreshToken(request)).thenReturn(authResponse);

        AuthResponse response = userService.refreshToken(request);

        verify(authService).refreshToken(request);
        assertThat(response).isEqualTo(authResponse);
    }

    @Test
    void loginShouldDelegateToAuthService() {
        LoginRequest request = LoginRequest.builder()
                .email("student@ilstu.edu")
                .password("password1")
                .build();
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .build();
        when(authService.login(request)).thenReturn(authResponse);

        AuthResponse response = userService.login(request);

        verify(authService).login(request);
        assertThat(response).isEqualTo(authResponse);
    }
}
