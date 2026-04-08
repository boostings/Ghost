package com.ghost.service;

import com.ghost.dto.request.LoginRequest;
import com.ghost.dto.request.RefreshTokenRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.ResetPasswordRequest;
import com.ghost.dto.request.VerifyEmailRequest;
import com.ghost.dto.request.VerifyPasswordResetCodeRequest;
import com.ghost.dto.response.AuthResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.model.StudentUser;
import com.ghost.model.User;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import com.ghost.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardMembershipService whiteboardMembershipService;
    private final AuditLogService auditLogService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public void register(RegisterRequest req) {
        String normalizedEmail = normalizeEmail(req.getEmail());
        log.debug("Processing registration for normalizedEmail={}", normalizedEmail);

        if (!normalizedEmail.endsWith("@ilstu.edu")) {
            log.warn("Registration rejected email={} reason=INVALID_EMAIL_DOMAIN", normalizedEmail);
            throw new BadRequestException("Email must end with @ilstu.edu");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            log.warn("Registration rejected email={} reason=EMAIL_ALREADY_REGISTERED", normalizedEmail);
            throw new BadRequestException("Email is already registered");
        }

        String verificationCode = generateVerificationCode();

        User user = StudentUser.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName().trim())
                .lastName(req.getLastName().trim())
                .emailVerified(false)
                .verificationCode(verificationCode)
                .verificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15))
                .build();

        user = userRepository.save(user);
        log.info("User account created userId={} email={}", user.getId(), user.getEmail());

        log.info("VERIFICATION CODE for {}: {}", user.getEmail(), verificationCode);
        logUserAction(user.getId(), AuditAction.USER_ENLISTED, user.getId(), null, "registered");
    }

    @Transactional
    public void resendVerificationCode(String email) {
        String normalizedEmail = normalizeEmail(email);
        log.debug("Processing resend verification for normalizedEmail={}", normalizedEmail);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if (user.isEmailVerified()) {
            log.warn("Resend verification rejected userId={} email={} reason=EMAIL_ALREADY_VERIFIED",
                    user.getId(), user.getEmail());
            throw new BadRequestException("Email is already verified");
        }

        String verificationCode = generateVerificationCode();
        user.setVerificationCode(verificationCode);
        user.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        logUserAction(user.getId(), AuditAction.USER_UPDATED, user.getId(), "verification_code=rotated", "verification_code=rotated");
        log.info("Verification code rotated for userId={} email={}", user.getId(), user.getEmail());

        log.info("VERIFICATION CODE for {}: {}", user.getEmail(), verificationCode);
    }

    @Transactional
    public void startPasswordReset(String email) {
        String normalizedEmail = normalizeEmail(email);
        log.debug("Processing forgot-password for normalizedEmail={}", normalizedEmail);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if (!user.isEmailVerified()) {
            throw new BadRequestException("Email is not verified. Please verify your email first.");
        }

        String passwordResetCode = generateVerificationCode();
        user.setPasswordResetCode(passwordResetCode);
        user.setPasswordResetCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        log.info("PASSWORD RESET CODE for {}: {}", user.getEmail(), passwordResetCode);
    }

    @Transactional(readOnly = true)
    public void verifyPasswordResetCode(VerifyPasswordResetCodeRequest req) {
        User user = getUserForPasswordReset(req.getEmail(), req.getCode());
        log.debug("Password reset code verified for userId={} email={}", user.getId(), user.getEmail());
    }

    @Transactional
    public AuthResponse resetPassword(ResetPasswordRequest req) {
        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new BadRequestException("New password and confirm password must match");
        }

        User user = getUserForPasswordReset(req.getEmail(), req.getCode());
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setPasswordResetCode(null);
        user.setPasswordResetCodeExpiresAt(null);
        userRepository.save(user);
        logUserAction(
                user.getId(),
                AuditAction.USER_UPDATED,
                user.getId(),
                "password_reset=pending",
                "password_reset=completed"
        );

        if (whiteboardMembershipService.joinDemoWhiteboardIfAvailable(user.getId())) {
            log.info("User auto-enrolled into demo class after password reset userId={}", user.getId());
        }

        log.info("Password reset completed for userId={} email={}", user.getId(), user.getEmail());
        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest req) {
        String normalizedEmail = normalizeEmail(req.getEmail());
        String submittedCode = req.getCode().trim();
        log.debug("Processing verify-email for normalizedEmail={}", normalizedEmail);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", req.getEmail()));

        if (user.isEmailVerified()) {
            log.warn("Verify email rejected userId={} email={} reason=EMAIL_ALREADY_VERIFIED",
                    user.getId(), user.getEmail());
            throw new BadRequestException("Email is already verified");
        }

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(submittedCode)) {
            log.warn("Verify email rejected userId={} email={} reason=INVALID_CODE",
                    user.getId(), user.getEmail());
            throw new BadRequestException("Invalid verification code");
        }

        if (user.getVerificationCodeExpiresAt() == null
                || user.getVerificationCodeExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("Verify email rejected userId={} email={} reason=EXPIRED_CODE",
                    user.getId(), user.getEmail());
            throw new BadRequestException("Verification code has expired");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiresAt(null);
        userRepository.save(user);
        logUserAction(user.getId(), AuditAction.USER_UPDATED, user.getId(), "email_verified=false", "email_verified=true");
        if (whiteboardMembershipService.joinDemoWhiteboardIfAvailable(user.getId())) {
            log.info("User auto-enrolled into demo class userId={}", user.getId());
        }
        log.info("Email verification and authentication completed for userId={} email={}", user.getId(), user.getEmail());
        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String normalizedEmail = normalizeEmail(req.getEmail());
        log.debug("Processing login for normalizedEmail={}", normalizedEmail);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> {
                    log.warn("Login rejected email={} reason=INVALID_CREDENTIALS", normalizedEmail);
                    return new UnauthorizedException("Invalid email or password");
                });

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            log.warn("Login rejected email={} reason=INVALID_CREDENTIALS", normalizedEmail);
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            log.warn("Login rejected userId={} email={} reason=EMAIL_NOT_VERIFIED",
                    user.getId(), user.getEmail());
            throw new BadRequestException("Email is not verified. Please verify your email first.");
        }

        if (whiteboardMembershipService.joinDemoWhiteboardIfAvailable(user.getId())) {
            log.info("User auto-enrolled into demo class at login userId={}", user.getId());
        }
        log.info("Login successful for userId={} email={}", user.getId(), user.getEmail());
        return createAuthResponse(user);
    }

    public AuthResponse refreshToken(RefreshTokenRequest req) {
        log.debug("Processing refresh token request");
        if (!jwtTokenProvider.validateToken(req.getRefreshToken())
                || !jwtTokenProvider.validateTokenType(
                        req.getRefreshToken(), jwtTokenProvider.getRefreshTokenType())) {
            log.warn("Refresh token rejected reason=INVALID_OR_EXPIRED_TOKEN");
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        UUID userId = jwtTokenProvider.getUserIdFromToken(req.getRefreshToken());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        log.info("Refresh token successful for userId={}", userId);
        return createAuthResponse(user);
    }

    @Transactional
    public void deleteAccount(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!whiteboardRepository.findByOwnerId(userId).isEmpty()) {
            log.warn("Delete account rejected userId={} reason=OWNS_WHITEBOARDS", userId);
            throw new BadRequestException("Transfer ownership of your whiteboards before deleting your account");
        }

        logUserDeletion(userId, "account_status=active", "account_status=deleted");
        userRepository.delete(user);
        log.info("Account deleted userId={}", userId);
    }

    private String generateVerificationCode() {
        int code = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(code);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private User getUserForPasswordReset(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        String submittedCode = code.trim();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if (!user.isEmailVerified()) {
            throw new BadRequestException("Email is not verified. Please verify your email first.");
        }

        if (user.getPasswordResetCode() == null || !user.getPasswordResetCode().equals(submittedCode)) {
            throw new BadRequestException("Invalid password reset code");
        }

        if (user.getPasswordResetCodeExpiresAt() == null
                || user.getPasswordResetCodeExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Password reset code has expired");
        }

        return user;
    }

    private AuthResponse createAuthResponse(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(mapToUserResponse(user))
                .build();
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
                .build();
    }

    private void logUserAction(UUID actorId, AuditAction action, UUID targetId, String oldValue, String newValue) {
        auditLogService.logAction(
                null,
                actorId,
                action,
                "User",
                targetId,
                oldValue,
                newValue
        );
    }

    private void logUserDeletion(UUID targetId, String oldValue, String newValue) {
        List<UUID> whiteboardIds = whiteboardMembershipRepository.findWhiteboardIdsByUserId(targetId);
        if (!whiteboardIds.isEmpty()) {
            for (UUID whiteboardId : whiteboardIds) {
                auditLogService.logAction(
                        whiteboardId,
                        null,
                        AuditAction.USER_REMOVED,
                        "User",
                        targetId,
                        oldValue,
                        newValue
                );
            }
            return;
        }

        auditLogService.logAction(
                null,
                null,
                AuditAction.USER_REMOVED,
                "User",
                targetId,
                oldValue,
                newValue
        );
    }
}
