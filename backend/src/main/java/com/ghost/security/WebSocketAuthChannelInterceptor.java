package com.ghost.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String token = extractBearerToken(accessor);
        if (token == null
                || !jwtTokenProvider.validateToken(token)
                || !jwtTokenProvider.validateTokenType(token, jwtTokenProvider.getAccessTokenType())) {
            throw new IllegalArgumentException("Invalid WebSocket authentication token");
        }

        String userId = jwtTokenProvider.getUserIdFromToken(token).toString();
        String role = jwtTokenProvider.getRoleFromToken(token);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        userId,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
        accessor.setUser(authentication);
        return message;
    }

    private String extractBearerToken(StompHeaderAccessor accessor) {
        String authHeader = null;
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            authHeader = authHeaders.get(0);
        }

        if (authHeader == null) {
            authHeaders = accessor.getNativeHeader("authorization");
            if (authHeaders != null && !authHeaders.isEmpty()) {
                authHeader = authHeaders.get(0);
            }
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        return authHeader.substring(7);
    }
}
