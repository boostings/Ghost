package com.ghost.security;

import com.ghost.repository.QuestionRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthChannelInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private MessageChannel messageChannel;

    private WebSocketAuthChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthChannelInterceptor(
                jwtTokenProvider,
                whiteboardMembershipRepository,
                questionRepository
        );
    }

    @Test
    void preSendShouldAuthenticateValidConnectFrame() {
        String token = "valid-token";
        UUID userId = UUID.randomUUID();

        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getAccessTokenType()).thenReturn("access");
        when(jwtTokenProvider.validateTokenType(token, "access")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn(userId);
        when(jwtTokenProvider.getRoleFromToken(token)).thenReturn("FACULTY");

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);

        assertThat(resultAccessor.getUser()).isNotNull();
        assertThat(resultAccessor.getUser()).isInstanceOf(UsernamePasswordAuthenticationToken.class);
    }

    @Test
    void preSendShouldRejectUnauthenticatedSubscribeFrame() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("requires authentication");
    }

    @Test
    void preSendShouldAllowWhiteboardSubscriptionForMembers() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        when(whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(true);

        Message<byte[]> message = subscribeMessage(
                userId,
                "/topic/whiteboard/" + whiteboardId + "/questions"
        );

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertThat(result).isSameAs(message);
        verify(whiteboardMembershipRepository).existsByWhiteboardIdAndUserId(whiteboardId, userId);
    }

    @Test
    void preSendShouldRejectWhiteboardSubscriptionForNonMembers() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        when(whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(false);

        Message<byte[]> message = subscribeMessage(
                userId,
                "/topic/whiteboard/" + whiteboardId + "/questions"
        );

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("subscription is not allowed");
    }

    @Test
    void preSendShouldAllowQuestionCommentSubscriptionForMembers() {
        UUID userId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        when(questionRepository.findVisibleWhiteboardIdByQuestionId(questionId))
                .thenReturn(Optional.of(whiteboardId));
        when(whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(true);

        Message<byte[]> message = subscribeMessage(userId, "/topic/question/" + questionId + "/comments");

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertThat(result).isSameAs(message);
        verify(questionRepository).findVisibleWhiteboardIdByQuestionId(questionId);
        verify(whiteboardMembershipRepository).existsByWhiteboardIdAndUserId(whiteboardId, userId);
    }

    @Test
    void preSendShouldRejectOtherUsersNotificationTopic() {
        UUID userId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        Message<byte[]> message = subscribeMessage(
                userId,
                "/topic/user/" + otherUserId + "/notifications"
        );

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("subscription is not allowed");
    }

    @Test
    void preSendShouldRejectInvalidConnectToken() {
        String token = "invalid-token";

        when(jwtTokenProvider.validateToken(token)).thenReturn(false);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid WebSocket authentication token");
    }

    private Message<byte[]> subscribeMessage(UUID userId, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        accessor.setUser(new UsernamePasswordAuthenticationToken(userId.toString(), null));
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
