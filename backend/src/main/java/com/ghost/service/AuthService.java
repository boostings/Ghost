package com.ghost.service;

import com.ghost.dto.request.LoginRequest;
import com.ghost.dto.request.RefreshTokenRequest;
import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.VerifyEmailRequest;
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

        // Validate email ends with @ilstu.edu
        if (!normalizedEmail.endsWith("@ilstu.edu")) {
            throw new BadRequestException("Email must end with @ilstu.edu");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Email is already registered");
        }

        // Generate 6-digit verification code
        String verificationCode = generateVerificationCode();

        // Create user with BCrypt hashed password
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

        // Log verification code to console
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
            throw new BadRequestException("Email is already verified");
        }

        String verificationCode = generateVerificationCode();
        user.setVerificationCode(verificationCode);
        user.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        logUserAction(user.getId(), AuditAction.USER_UPDATED, user.getId(), "verification_code=rotated", "verification_code=rotated");
        log.info("Verification code rotated for userId={} email={}", user.getId(), user.getEmail());

        // Log verification code to console in development.
        log.info("VERIFICATION CODE for {}: {}", user.getEmail(), verificationCode);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest req) {
        String normalizedEmail = normalizeEmail(req.getEmail());
        String submittedCode = req.getCode().trim();
        log.debug("Processing verify-email for normalizedEmail={}", normalizedEmail);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", req.getEmail()));

        if (user.isEmailVerified()) {
            throw new BadRequestException("Email is already verified");
        }

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(submittedCode)) {
            throw new BadRequestException("Invalid verification code");
        }

        if (user.getVerificationCodeExpiresAt() == null
                || user.getVerificationCodeExpiresAt().isBefore(LocalDateTime.now())) {
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
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
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
            throw new BadRequestException("Transfer ownership of your whiteboards before deleting your account");
        }

        logUserDeletion(userId, "account_status=active", "account_status=deleted");
        userRepository.delete(user);
        log.info("Account deleted for user: {}", userId);
    }

    private String generateVerificationCode() {
        int code = 100000 + secureRandom.nextInt(900000); // generates 6-digit code
        return String.valueOf(code);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
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
