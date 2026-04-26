package com.ghost.service;

import com.ghost.dto.request.LoginRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.ResetPasswordRequest;
import com.ghost.dto.request.VerifyEmailRequest;
import com.ghost.dto.request.VerifyPasswordResetCodeRequest;
import com.ghost.dto.response.AuthResponse;
import com.ghost.dto.response.PasswordResetStartResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.model.StudentUser;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.Role;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import com.ghost.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
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

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private WhiteboardRepository whiteboardRepository;

    @Mock
    private WhiteboardMembershipService whiteboardMembershipService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient().when(whiteboardMembershipRepository.findByUserId(any(UUID.class))).thenReturn(List.of());
        lenient().when(whiteboardMembershipRepository.findWhiteboardIdsByUserId(any(UUID.class))).thenReturn(List.of());
        lenient().when(whiteboardRepository.findByOwnerId(any(UUID.class))).thenReturn(List.of());
    }

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
        assertThat(savedUser).isInstanceOf(StudentUser.class);
        assertThat(savedUser.getEmail()).isEqualTo("student@ilstu.edu");
        assertThat(savedUser.getPasswordHash()).isEqualTo("hashed-password");
        assertThat(savedUser.getFirstName()).isEqualTo("Test");
        assertThat(savedUser.getLastName()).isEqualTo("User");
        assertThat(savedUser.getRole()).isEqualTo(Role.STUDENT);
        assertThat(savedUser.isEmailVerified()).isFalse();
        assertThat(savedUser.getVerificationCode()).matches("^\\d{6}$");
        assertThat(savedUser.getVerificationCodeExpiresAt())
                .isAfter(LocalDateTime.now().minusSeconds(5));
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.isNull(),
                any(UUID.class),
                org.mockito.ArgumentMatchers.eq(AuditAction.USER_ENLISTED),
                org.mockito.ArgumentMatchers.eq("User"),
                any(UUID.class),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("registered")
        );
    }

    @Test
    void verifyEmailShouldMarkUserVerifiedClearCodeAndIssueTokens() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .emailVerified(false)
                .verificationCode("123456")
                .verificationCodeExpiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name()))
                .thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(user.getId())).thenReturn("refresh-token");

        AuthResponse response = authService.verifyEmail(VerifyEmailRequest.builder()
                .email("student@ilstu.edu")
                .code("123456")
                .build());

        verify(userRepository).save(user);
        verify(whiteboardMembershipService).joinDemoWhiteboardIfAvailable(user.getId());
        assertThat(user.isEmailVerified()).isTrue();
        assertThat(user.getVerificationCode()).isNull();
        assertThat(user.getVerificationCodeExpiresAt()).isNull();
        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getUser()).isNotNull();
        assertThat(response.getUser().getId()).isEqualTo(user.getId());
        assertThat(response.getUser().isEmailVerified()).isTrue();
    }

    @Test
    void resendVerificationCodeShouldGenerateANewCode() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
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
    void startPasswordResetShouldGenerateANewCode() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .emailVerified(true)
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));

        PasswordResetStartResponse response = authService.startPasswordReset("student@ilstu.edu");

        verify(userRepository).save(user);
        assertThat(response.getNextStep()).isEqualTo(PasswordResetStartResponse.NextStep.RESET_PASSWORD);
        assertThat(user.getPasswordResetCode()).matches("^\\d{6}$");
        assertThat(user.getPasswordResetCodeExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    void startPasswordResetShouldSendVerificationCodeForUnverifiedUser() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .emailVerified(false)
                .verificationCode("111111")
                .verificationCodeExpiresAt(LocalDateTime.now().minusMinutes(1))
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));

        PasswordResetStartResponse response = authService.startPasswordReset("student@ilstu.edu");

        verify(userRepository).save(user);
        verify(emailService).sendVerificationCode(eq("student@ilstu.edu"), anyString());
        assertThat(response.getNextStep()).isEqualTo(PasswordResetStartResponse.NextStep.VERIFY_EMAIL);
        assertThat(user.getVerificationCode()).matches("^\\d{6}$");
        assertThat(user.getVerificationCodeExpiresAt()).isAfter(LocalDateTime.now());
        assertThat(user.getPasswordResetCode()).isNull();
    }

    @Test
    void verifyPasswordResetCodeShouldRejectExpiredCode() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .emailVerified(true)
                .passwordResetCode("123456")
                .passwordResetCodeExpiresAt(LocalDateTime.now().minusMinutes(1))
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.verifyPasswordResetCode(VerifyPasswordResetCodeRequest.builder()
                .email("student@ilstu.edu")
                .code("123456")
                .build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void resetPasswordShouldUpdateHashClearResetCodeAndIssueTokens() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .passwordHash("old-hash")
                .firstName("Test")
                .lastName("User")
                .emailVerified(true)
                .passwordResetCode("123456")
                .passwordResetCodeExpiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("password1")).thenReturn("new-hash");
        when(jwtTokenProvider.generateAccessToken(userId, "student@ilstu.edu", Role.STUDENT.name()))
                .thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(userId)).thenReturn("refresh-token");

        AuthResponse response = authService.resetPassword(ResetPasswordRequest.builder()
                .email("student@ilstu.edu")
                .code("123456")
                .newPassword("password1")
                .confirmPassword("password1")
                .build());

        verify(userRepository).save(user);
        verify(whiteboardMembershipService).joinDemoWhiteboardIfAvailable(userId);
        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        assertThat(user.getPasswordResetCode()).isNull();
        assertThat(user.getPasswordResetCodeExpiresAt()).isNull();
        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void AC1_loginShouldRotateVerificationCodeForUnverifiedUser() {
        String originalCode = "111111";
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .emailVerified(false)
                .verificationCode(originalCode)
                .verificationCodeExpiresAt(LocalDateTime.now().minusMinutes(1))
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password1", "hashed-password")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(LoginRequest.builder()
                .email("student@ilstu.edu")
                .password("password1")
                .build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("new verification code");

        verify(userRepository).save(user);
        assertThat(user.getVerificationCode()).matches("^\\d{6}$");
        assertThat(user.getVerificationCode()).isNotEqualTo(originalCode);
        assertThat(user.getVerificationCodeExpiresAt()).isAfter(LocalDateTime.now().minusSeconds(5));
    }

    @Test
    void AC1_loginShouldAutoJoinDemoWhiteboardForVerifiedUser() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .passwordHash("hashed-password")
                .firstName("Test")
                .lastName("User")
                .emailVerified(true)
                .build();

        when(userRepository.findByEmail("student@ilstu.edu")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password1", "hashed-password")).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(userId, "student@ilstu.edu", Role.STUDENT.name()))
                .thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(userId)).thenReturn("refresh-token");

        AuthResponse response = authService.login(LoginRequest.builder()
                .email("student@ilstu.edu")
                .password("password1")
                .build());

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        verify(whiteboardMembershipService).joinDemoWhiteboardIfAvailable(userId);
    }

    @Test
    void regressionC8d8d8fDeleteAccountShouldWriteAuditLogForMembershipIds() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();

        User user = User.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(whiteboardMembershipRepository.findWhiteboardIdsByUserId(userId)).thenReturn(List.of(whiteboardId));

        authService.deleteAccount(userId);

        verify(auditLogService).logAction(
                whiteboardId,
                null,
                AuditAction.USER_REMOVED,
                "User",
                userId,
                "account_status=active",
                "account_status=deleted"
        );
        verify(userRepository).delete(user);
    }

    @Test
    void deleteAccountShouldRejectIfUserOwnsWhiteboards() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("faculty@ilstu.edu")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(whiteboardRepository.findByOwnerId(userId))
                .thenReturn(List.of(Whiteboard.builder().id(UUID.randomUUID()).build()));

        assertThatThrownBy(() -> authService.deleteAccount(userId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Transfer ownership");

        verify(userRepository, never()).delete(any(User.class));
    }
}
