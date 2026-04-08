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
import java.util.UUID;

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
                : request.getRequestURI() + "?" + queryString;
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
}
