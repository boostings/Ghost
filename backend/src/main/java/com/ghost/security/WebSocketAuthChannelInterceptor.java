package com.ghost.security;

import com.ghost.repository.QuestionRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
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

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern WHITEBOARD_QUESTIONS_TOPIC = Pattern.compile(
            "^/topic/whiteboard/([0-9a-fA-F-]{36})/questions$"
    );
    private static final Pattern QUESTION_COMMENTS_TOPIC = Pattern.compile(
            "^/topic/question/([0-9a-fA-F-]{36})/comments$"
    );
    private static final Pattern USER_NOTIFICATIONS_TOPIC = Pattern.compile(
            "^/topic/user/([0-9a-fA-F-]{36})/notifications$"
    );

    private static final EnumSet<StompCommand> AUTH_REQUIRED_COMMANDS = EnumSet.of(
            StompCommand.SEND,
            StompCommand.SUBSCRIBE,
            StompCommand.UNSUBSCRIBE,
            StompCommand.ACK,
            StompCommand.NACK,
            StompCommand.BEGIN,
            StompCommand.COMMIT,
            StompCommand.ABORT
    );

    private final JwtTokenProvider jwtTokenProvider;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final QuestionRepository questionRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command) || StompCommand.STOMP.equals(command)) {
            String token = extractBearerToken(accessor);
            if (token == null
                    || !jwtTokenProvider.validateToken(token)
                    || !jwtTokenProvider.validateTokenType(token, jwtTokenProvider.getAccessTokenType())) {
                throw new IllegalArgumentException("Invalid WebSocket authentication token");
            }

            String userId = jwtTokenProvider.getUserIdFromToken(token).toString();
            String role = jwtTokenProvider.getRoleFromToken(token);
            if (role == null || role.isBlank()) {
                throw new IllegalArgumentException("Invalid WebSocket authentication token");
            }
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userId,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );
            accessor.setUser(authentication);
            return message;
        }

        if (AUTH_REQUIRED_COMMANDS.contains(command) && accessor.getUser() == null) {
            throw new IllegalArgumentException("WebSocket command requires authentication");
        }
        if (StompCommand.SUBSCRIBE.equals(command)) {
            validateSubscription(accessor);
        }

        return message;
    }

    private void validateSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            throw new IllegalArgumentException("WebSocket subscription requires a destination");
        }

        UUID userId = currentUserId(accessor);
        if (destination.equals("/user/queue/notifications")) {
            return;
        }

        Matcher whiteboardMatcher = WHITEBOARD_QUESTIONS_TOPIC.matcher(destination);
        if (whiteboardMatcher.matches()) {
            UUID whiteboardId = UUID.fromString(whiteboardMatcher.group(1));
            requireWhiteboardMembership(userId, whiteboardId);
            return;
        }

        Matcher questionMatcher = QUESTION_COMMENTS_TOPIC.matcher(destination);
        if (questionMatcher.matches()) {
            UUID questionId = UUID.fromString(questionMatcher.group(1));
            Optional<UUID> whiteboardId = questionRepository.findVisibleWhiteboardIdByQuestionId(questionId);
            if (whiteboardId.isEmpty()) {
                throw new IllegalArgumentException("WebSocket subscription is not allowed");
            }
            requireWhiteboardMembership(userId, whiteboardId.get());
            return;
        }

        Matcher userMatcher = USER_NOTIFICATIONS_TOPIC.matcher(destination);
        if (userMatcher.matches() && userId.equals(UUID.fromString(userMatcher.group(1)))) {
            return;
        }

        throw new IllegalArgumentException("WebSocket subscription is not allowed");
    }

    private UUID currentUserId(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            throw new IllegalArgumentException("WebSocket command requires authentication");
        }
        return UUID.fromString(accessor.getUser().getName());
    }

    private void requireWhiteboardMembership(UUID userId, UUID whiteboardId) {
        if (!whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId)) {
            throw new IllegalArgumentException("WebSocket subscription is not allowed");
        }
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
