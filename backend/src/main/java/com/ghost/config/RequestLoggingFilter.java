package com.ghost.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String REQUEST_ID_KEY = "requestId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String queryString = request.getQueryString();
        String path = queryString == null
                ? request.getRequestURI()
                : request.getRequestURI() + "?" + redactSensitiveQueryParams(queryString);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try (MDC.MDCCloseable ignored = MDC.putCloseable(REQUEST_ID_KEY, requestId)) {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            logRequestCompletion(requestId, request, response, path, durationMs);
        }
    }

    private void logRequestCompletion(
            String requestId,
            HttpServletRequest request,
            HttpServletResponse response,
            String path,
            long durationMs) {
        int status = response.getStatus();
        String userId = resolveUserId();

        if (status >= 500) {
            log.error(
                    "HTTP requestId={} method={} path={} status={} durationMs={} userId={} remoteAddr={}",
                    requestId,
                    request.getMethod(),
                    path,
                    status,
                    durationMs,
                    userId,
                    request.getRemoteAddr());
            return;
        }

        if (status >= 400) {
            log.warn(
                    "HTTP requestId={} method={} path={} status={} durationMs={} userId={} remoteAddr={}",
                    requestId,
                    request.getMethod(),
                    path,
                    status,
                    durationMs,
                    userId,
                    request.getRemoteAddr());
            return;
        }

        log.info(
                "HTTP requestId={} method={} path={} status={} durationMs={} userId={} remoteAddr={}",
                requestId,
                request.getMethod(),
                path,
                status,
                durationMs,
                userId,
                request.getRemoteAddr());
    }

    private String resolveUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return "anonymous";
        }
        return authentication.getName();
    }

    private String redactSensitiveQueryParams(String queryString) {
        return Arrays.stream(queryString.split("&", -1))
                .map(this::redactQueryParam)
                .collect(Collectors.joining("&"));
    }

    private String redactQueryParam(String queryParam) {
        int separatorIndex = queryParam.indexOf('=');
        String key = separatorIndex >= 0 ? queryParam.substring(0, separatorIndex) : queryParam;
        if (!isSensitiveQueryKey(key)) {
            return queryParam;
        }
        return separatorIndex >= 0 ? key + "=[REDACTED]" : key;
    }

    private boolean isSensitiveQueryKey(String key) {
        String normalizedKey = key.toLowerCase();
        return normalizedKey.contains("token")
                || normalizedKey.contains("password")
                || normalizedKey.contains("code")
                || normalizedKey.contains("secret")
                || normalizedKey.contains("authorization");
    }
}
