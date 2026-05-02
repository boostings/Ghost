package com.ghost.service;

import com.ghost.mapper.NotificationMapper;
import com.ghost.model.NotificationPreference;
import com.ghost.model.User;
import com.ghost.repository.NotificationPreferenceRepository;
import com.ghost.repository.NotificationRepository;
import com.ghost.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationMapper notificationMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private NotificationPreferenceRepository notificationPreferenceRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void shouldSendImmediatePushOnlyForRealtimePreference() {
        UUID userId = UUID.randomUUID();
        User recipient = User.builder()
                .id(userId)
                .expoPushToken("ExponentPushToken[test]")
                .build();

        when(notificationPreferenceRepository.findByUserId(userId))
                .thenReturn(Optional.of(NotificationPreference.builder()
                        .user(recipient)
                        .pushFrequency("REALTIME")
                        .build()))
                .thenReturn(Optional.of(NotificationPreference.builder()
                        .user(recipient)
                        .pushFrequency("HOURLY")
                        .build()))
                .thenReturn(Optional.of(NotificationPreference.builder()
                        .user(recipient)
                        .pushFrequency("OFF")
                        .build()));

        assertThat(notificationService.shouldSendImmediatePush(recipient)).isTrue();
        assertThat(notificationService.shouldSendImmediatePush(recipient)).isFalse();
        assertThat(notificationService.shouldSendImmediatePush(recipient)).isFalse();
    }
}
