package com.ghost.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    @Test
    void generateAccessTokenShouldRoundTripClaimsAndValidateType() {
        JwtTokenProvider provider = createProvider(60_000, 120_000);
        UUID userId = UUID.randomUUID();

        String token = provider.generateAccessToken(userId, "student@ilstu.edu", "STUDENT");

        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.validateTokenType(token, provider.getAccessTokenType())).isTrue();
        assertThat(provider.getUserIdFromToken(token)).isEqualTo(userId);
        assertThat(provider.getEmailFromToken(token)).isEqualTo("student@ilstu.edu");
        assertThat(provider.getRoleFromToken(token)).isEqualTo("STUDENT");
    }

    @Test
    void generateRefreshTokenShouldExposeRefreshTypeAndUserId() {
        JwtTokenProvider provider = createProvider(60_000, 120_000);
        UUID userId = UUID.randomUUID();

        String token = provider.generateRefreshToken(userId);

        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.validateTokenType(token, provider.getRefreshTokenType())).isTrue();
        assertThat(provider.getUserIdFromToken(token)).isEqualTo(userId);
        assertThat(provider.getTokenType(token)).isEqualTo(provider.getRefreshTokenType());
    }

    @Test
    void validateTokenShouldRejectMalformedToken() {
        JwtTokenProvider provider = createProvider(60_000, 120_000);

        assertThat(provider.validateToken("not-a-jwt")).isFalse();
        assertThat(provider.validateTokenType("not-a-jwt", provider.getAccessTokenType())).isFalse();
    }

    @Test
    void validateTokenShouldRejectExpiredTokens() {
        JwtTokenProvider provider = createProvider(-1, 120_000);
        UUID userId = UUID.randomUUID();

        String token = provider.generateAccessToken(userId, "student@ilstu.edu", "STUDENT");

        assertThat(provider.validateToken(token)).isFalse();
        assertThat(provider.validateTokenType(token, provider.getAccessTokenType())).isFalse();
    }

    @Test
    void initShouldRejectSecretsShorterThanThirtyTwoBytes() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", "too-short-secret");
        ReflectionTestUtils.setField(provider, "accessExpirationMs", 60_000L);
        ReflectionTestUtils.setField(provider, "refreshExpirationMs", 120_000L);

        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 256 bits");
    }

    private JwtTokenProvider createProvider(long accessExpirationMs, long refreshExpirationMs) {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(
                provider,
                "jwtSecret",
                "ghost-test-secret-change-this-value-please-32-bytes"
        );
        ReflectionTestUtils.setField(provider, "accessExpirationMs", accessExpirationMs);
        ReflectionTestUtils.setField(provider, "refreshExpirationMs", refreshExpirationMs);
        provider.init();
        return provider;
    }
}
