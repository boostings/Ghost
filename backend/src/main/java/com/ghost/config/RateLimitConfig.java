package com.ghost.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Configuration
public class RateLimitConfig {

    private static final Duration BUCKET_TTL = Duration.ofMinutes(15);
    private static final Duration CLEANUP_INTERVAL = Duration.ofMinutes(5);

    private final Map<String, BucketHolder> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketHolder> generalBuckets = new ConcurrentHashMap<>();
    private final AtomicLong lastCleanupMs = new AtomicLong(System.currentTimeMillis());

    @Value("${rate-limit.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;
    @Value("${rate-limit.trusted-proxies:}")
    private String trustedProxiesConfig;
    private Set<String> trustedProxies = Set.of();

    private Bucket createAuthBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(100)
                        .refillGreedy(100, Duration.ofMinutes(1))
                        .build())
                .build();
    }

    private Bucket createGeneralBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(300)
                        .refillGreedy(300, Duration.ofMinutes(1))
                        .build())
                .build();
    }

    @PostConstruct
    public void initTrustedProxies() {
        trustedProxies = Arrays.stream(trustedProxiesConfig.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    private boolean shouldTrustForwardedHeaders(HttpServletRequest request) {
        return trustProxyHeaders && trustedProxies.contains(request.getRemoteAddr());
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (shouldTrustForwardedHeaders(request)) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.isEmpty()) {
                return xRealIp;
            }
        }
        return request.getRemoteAddr();
    }

    private Bucket resolveBucket(Map<String, BucketHolder> bucketMap, String clientIp, BucketType bucketType) {
        cleanupExpiredBucketsIfNeeded();
        long now = System.currentTimeMillis();
        BucketHolder bucketHolder = bucketMap.compute(clientIp, (key, existing) -> {
            if (existing == null || existing.isExpired(now)) {
                Bucket bucket = bucketType == BucketType.AUTH ? createAuthBucket() : createGeneralBucket();
                return new BucketHolder(bucket, now);
            }
            existing.touch(now);
            return existing;
        });
        return bucketHolder.bucket();
    }

    private void cleanupExpiredBucketsIfNeeded() {
        long now = System.currentTimeMillis();
        long lastCleanup = lastCleanupMs.get();
        if ((now - lastCleanup) < CLEANUP_INTERVAL.toMillis()) {
            return;
        }
        if (!lastCleanupMs.compareAndSet(lastCleanup, now)) {
            return;
        }
        authBuckets.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
        generalBuckets.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
    }

    @Bean
    public OncePerRequestFilter rateLimitFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain filterChain)
                    throws ServletException, IOException {

                String clientIp = resolveClientIp(request);
                String requestUri = request.getRequestURI();

                Bucket bucket;
                if (requestUri.startsWith("/api/auth/")) {
                    bucket = resolveBucket(authBuckets, clientIp, BucketType.AUTH);
                } else {
                    bucket = resolveBucket(generalBuckets, clientIp, BucketType.GENERAL);
                }

                if (bucket.tryConsume(1)) {
                    filterChain.doFilter(request, response);
                } else {
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType("application/json");
                    response.getWriter().write(
                        "{\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Please try again later.\"}"
                    );
                }
            }
        };
    }

    private enum BucketType {
        AUTH,
        GENERAL
    }

    private static final class BucketHolder {
        private final Bucket bucket;
        private volatile long lastSeenAtMs;

        private BucketHolder(Bucket bucket, long nowMs) {
            this.bucket = bucket;
            this.lastSeenAtMs = nowMs;
        }

        private Bucket bucket() {
            return bucket;
        }

        private void touch(long nowMs) {
            this.lastSeenAtMs = nowMs;
        }

        private boolean isExpired(long nowMs) {
            return (nowMs - lastSeenAtMs) > BUCKET_TTL.toMillis();
        }
    }
}
