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
import com.ghost.model.User;
import com.ghost.model.enums.Role;
import com.ghost.repository.UserRepository;
import com.ghost.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        // Validate email ends with @ilstu.edu
        if (!req.getEmail().toLowerCase().endsWith("@ilstu.edu")) {
            throw new BadRequestException("Email must end with @ilstu.edu");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        // Generate 6-digit verification code
        String verificationCode = generateVerificationCode();

        // Create user with BCrypt hashed password
        User user = User.builder()
                .email(req.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .role(Role.STUDENT)
                .emailVerified(false)
                .verificationCode(verificationCode)
                .verificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15))
                .build();

        user = userRepository.save(user);

        // Log verification code to console
        log.info("VERIFICATION CODE for {}: {}", user.getEmail(), verificationCode);

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(mapToUserResponse(user))
                .build();
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest req) {
        User user = userRepository.findByEmail(req.getEmail().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", req.getEmail()));

        if (user.isEmailVerified()) {
            throw new BadRequestException("Email is already verified");
        }

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(req.getCode())) {
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
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail().toLowerCase())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new BadRequestException("Email is not verified. Please verify your email first.");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(mapToUserResponse(user))
                .build();
    }

    public AuthResponse refreshToken(RefreshTokenRequest req) {
        if (!jwtTokenProvider.validateToken(req.getRefreshToken())) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        UUID userId = jwtTokenProvider.getUserIdFromToken(req.getRefreshToken());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(mapToUserResponse(user))
                .build();
    }

    @Transactional
    public void deleteAccount(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        userRepository.delete(user);
        log.info("Account deleted for user: {}", userId);
    }

    private String generateVerificationCode() {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000); // generates 6-digit code
        return String.valueOf(code);
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
}
