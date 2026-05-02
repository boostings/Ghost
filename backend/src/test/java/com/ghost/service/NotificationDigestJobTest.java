package com.ghost.service;

import com.ghost.model.Notification;
import com.ghost.model.NotificationClassOverride;
import com.ghost.model.NotificationPreference;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.NotificationReferenceType;
import com.ghost.model.enums.NotificationType;
import com.ghost.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDigestJobTest {

    @Mock
    private NotificationPreferenceService notificationPreferenceService;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private NotificationDigestJob notificationDigestJob;

    @Test
    void assembleDailyDigestPayloadsShouldIncludeEligibleUnreadNotificationsOnly() {
        UUID userId = UUID.randomUUID();
        UUID activeWhiteboardId = UUID.randomUUID();
        UUID mutedWhiteboardId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .firstName("Student")
                .lastName("User")
                .build();
        Whiteboard mutedWhiteboard = Whiteboard.builder().id(mutedWhiteboardId).build();
        NotificationPreference preference = NotificationPreference.builder()
                .user(user)
                .classOverrides(List.of(NotificationClassOverride.builder()
                        .whiteboard(mutedWhiteboard)
                        .mutedUntil(LocalDateTime.now().plusHours(2))
                        .build()))
                .build();
        Notification activeNotification = notification(
                user,
                "New answer",
                UUID.randomUUID(),
                activeWhiteboardId,
                LocalDateTime.now().minusHours(1)
        );
        Notification mutedNotification = notification(
                user,
                "Muted class",
                UUID.randomUUID(),
                mutedWhiteboardId,
                LocalDateTime.now().minusMinutes(30)
        );

        when(notificationPreferenceService.findDailyDigestRecipients()).thenReturn(List.of(preference));
        when(notificationRepository.findByRecipientIdAndIsReadFalseAndCreatedAtAfterOrderByCreatedAtDesc(
                eq(userId),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(mutedNotification, activeNotification));

        List<NotificationDigestJob.NotificationDigest> digests =
                notificationDigestJob.assembleDailyDigestPayloads();

        assertThat(digests).hasSize(1);
        NotificationDigestJob.NotificationDigest digest = digests.get(0);
        assertThat(digest.recipientEmail()).isEqualTo("student@ilstu.edu");
        assertThat(digest.digestType()).isEqualTo("DAILY_7AM");
        assertThat(digest.notifications()).containsExactly(activeNotification);

        ArgumentCaptor<LocalDateTime> cutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(notificationRepository).findByRecipientIdAndIsReadFalseAndCreatedAtAfterOrderByCreatedAtDesc(
                eq(userId),
                cutoffCaptor.capture()
        );
        assertThat(cutoffCaptor.getValue()).isBefore(LocalDateTime.now().minusHours(23));
        assertThat(cutoffCaptor.getValue()).isAfter(LocalDateTime.now().minusHours(25));
    }

    @Test
    void assembleDailyDigestsShouldSendEmailDigestForEligibleRecipients() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .build();
        NotificationPreference preference = NotificationPreference.builder()
                .user(user)
                .emailDigest("DAILY_7AM")
                .build();
        Notification notification = notification(
                user,
                "New answer",
                UUID.randomUUID(),
                whiteboardId,
                LocalDateTime.now().minusHours(1)
        );

        when(notificationPreferenceService.findDailyDigestRecipients()).thenReturn(List.of(preference));
        when(notificationRepository.findByRecipientIdAndIsReadFalseAndCreatedAtAfterOrderByCreatedAtDesc(
                eq(userId),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(notification));

        notificationDigestJob.assembleDailyDigests();

        ArgumentCaptor<NotificationDigestJob.NotificationDigest> digestCaptor =
                ArgumentCaptor.forClass(NotificationDigestJob.NotificationDigest.class);
        verify(emailService).sendNotificationDigest(digestCaptor.capture());
        assertThat(digestCaptor.getValue().recipientEmail()).isEqualTo("student@ilstu.edu");
        assertThat(digestCaptor.getValue().digestType()).isEqualTo("DAILY_7AM");
        assertThat(digestCaptor.getValue().notifications()).containsExactly(notification);
    }

    @Test
    void assembleHourlyPushDigestsShouldSendOnePushSummaryPerEligibleRecipient() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .expoPushToken("ExponentPushToken[test]")
                .build();
        NotificationPreference preference = NotificationPreference.builder()
                .user(user)
                .pushFrequency("HOURLY")
                .build();
        Notification notification = notification(
                user,
                "New comment",
                UUID.randomUUID(),
                whiteboardId,
                LocalDateTime.now().minusMinutes(15)
        );

        when(notificationPreferenceService.findHourlyPushRecipients()).thenReturn(List.of(preference));
        when(notificationRepository.findByRecipientIdAndIsReadFalseAndCreatedAtAfterOrderByCreatedAtDesc(
                eq(userId),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(List.of(notification));

        notificationDigestJob.assembleHourlyPushDigests();

        ArgumentCaptor<NotificationDigestJob.NotificationDigest> digestCaptor =
                ArgumentCaptor.forClass(NotificationDigestJob.NotificationDigest.class);
        verify(notificationService).sendPushDigest(digestCaptor.capture());
        assertThat(digestCaptor.getValue().recipientId()).isEqualTo(userId);
        assertThat(digestCaptor.getValue().expoPushToken()).isEqualTo("ExponentPushToken[test]");
        assertThat(digestCaptor.getValue().digestType()).isEqualTo("HOURLY_PUSH");
        assertThat(digestCaptor.getValue().notifications()).containsExactly(notification);
    }

    private Notification notification(
            User recipient,
            String title,
            UUID referenceId,
            UUID whiteboardId,
            LocalDateTime createdAt
    ) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.QUESTION_ANSWERED)
                .title(title)
                .referenceType(NotificationReferenceType.QUESTION)
                .referenceId(referenceId)
                .whiteboardId(whiteboardId)
                .build();
        notification.setCreatedAt(createdAt);
        return notification;
    }
}
