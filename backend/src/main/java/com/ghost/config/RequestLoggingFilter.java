package com.ghost.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !log.isDebugEnabled();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String queryString = request.getQueryString();
        String path = queryString == null
                ? request.getRequestURI()
                : request.getRequestURI() + "?" + queryString;

        log.debug(
                "HTTP_REQUEST id={} method={} path={} remoteAddr={}",
                requestId,
                request.getMethod(),
                path,
                request.getRemoteAddr());

        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - startedAt;
            log.debug(
                    "HTTP_RESPONSE id={} method={} path={} status={} durationMs={}",
                    requestId,
                    request.getMethod(),
                    path,
                    response.getStatus(),
                    durationMs);
        }
    }
}
