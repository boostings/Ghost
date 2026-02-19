package com.ghost.service;

import com.ghost.dto.request.LoginRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.VerifyEmailRequest;
import com.ghost.exception.BadRequestException;
import com.ghost.model.User;
import com.ghost.model.enums.Role;
import com.ghost.repository.UserRepository;
import com.ghost.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerShouldPersistUnverifiedUserAndNotIssueTokens() {
        RegisterRequest request = RegisterRequest.builder()
                .email("  Student@ILSTU.edu ")
                .password("password1")
                .firstName("Test")
                .lastName("User")
                .build();

        when(userRepository.existsByEmail("student@ilstu.edu")).thenReturn(false);
        when(passwordEncoder.encode("password1")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });

        authService.register(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        verify(jwtTokenProvider, never()).generateAccessToken(any(), anyString(), anyString());
        verify(jwtTokenProvider, never()).generateRefreshToken(any());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getEmail()).isEqualTo("student@ilstu.edu");
        assertThat(savedUser.getPasswordHash()).isEqualTo("hashed-password");
        assertThat(savedUser.getFirstName()).isEqualTo("Test");
        assertThat(savedUser.getLastName()).isEqualTo("User");
        assertThat(savedUser.getRole()).isEqualTo(Role.STUDENT);
        assertThat(savedUser.isEmailVerified()).isFalse();
        assertThat(savedUser.getVerificationCode()).matches("^\\d{6}$");
        assertThat(savedUser.getVerificationCodeExpiresAt())
                .isAfter(LocalDateTime.now().minusSeconds(5));
    }

    @Test
    void verifyEmailShouldMarkUserVerifiedAndClearCode() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .role(Role.STUDENT)
                .emailVerified(false)
                .verificationCode("123456")
                .verificationCodeExpiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));

        authService.verifyEmail(VerifyEmailRequest.builder()
                .email("student@ilstu.edu")
                .code("123456")
                .build());

        verify(userRepository).save(user);
        assertThat(user.isEmailVerified()).isTrue();
        assertThat(user.getVerificationCode()).isNull();
        assertThat(user.getVerificationCodeExpiresAt()).isNull();
    }

    @Test
    void resendVerificationCodeShouldGenerateANewCode() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .role(Role.STUDENT)
                .emailVerified(false)
                .verificationCode("111111")
                .verificationCodeExpiresAt(LocalDateTime.now().minusMinutes(1))
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));

        authService.resendVerificationCode("student@ilstu.edu");

        verify(userRepository).save(user);
        assertThat(user.getVerificationCode()).matches("^\\d{6}$");
        assertThat(user.getVerificationCodeExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    void loginShouldRejectUnverifiedUser() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .role(Role.STUDENT)
                .emailVerified(false)
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password1", "hashed-password")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(LoginRequest.builder()
                .email("student@ilstu.edu")
                .password("password1")
                .build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email is not verified");
    }
}
