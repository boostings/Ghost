package com.ghost.service;

import com.ghost.model.Notification;
import com.ghost.model.NotificationClassOverride;
import com.ghost.model.NotificationPreference;
import com.ghost.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationDigestJob {

    private final NotificationPreferenceService notificationPreferenceService;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Scheduled(cron = "0 0 7 * * *", zone = "America/Chicago")
    public void assembleDailyDigests() {
        List<NotificationDigest> digests = assembleDailyDigestPayloads();
        digests.forEach(emailService::sendNotificationDigest);
        logDigestAssembly("daily", digests);
    }

    @Scheduled(cron = "0 0 7 * * MON", zone = "America/Chicago")
    public void assembleWeeklyDigests() {
        List<NotificationDigest> digests = assembleWeeklyDigestPayloads();
        digests.forEach(emailService::sendNotificationDigest);
        logDigestAssembly("weekly", digests);
    }

    @Scheduled(cron = "0 0 * * * *", zone = "America/Chicago")
    public void assembleHourlyPushDigests() {
        List<NotificationDigest> digests = assembleHourlyPushDigestPayloads();
        digests.forEach(notificationService::sendPushDigest);
        logDigestAssembly("hourly push", digests);
    }

    List<NotificationDigest> assembleDailyDigestPayloads() {
        return assembleDigestPayloads(
                notificationPreferenceService.findDailyDigestRecipients(),
                "DAILY_7AM",
                LocalDateTime.now().minusDays(1)
        );
    }

    List<NotificationDigest> assembleWeeklyDigestPayloads() {
        return assembleDigestPayloads(
                notificationPreferenceService.findWeeklyDigestRecipients(),
                "WEEKLY_MON_7AM",
                LocalDateTime.now().minusWeeks(1)
        );
    }

    List<NotificationDigest> assembleHourlyPushDigestPayloads() {
        return assembleDigestPayloads(
                notificationPreferenceService.findHourlyPushRecipients(),
                "HOURLY_PUSH",
                LocalDateTime.now().minusHours(1)
        );
    }

    private List<NotificationDigest> assembleDigestPayloads(
            List<NotificationPreference> recipients,
            String digestType,
            LocalDateTime cutoff
    ) {
        return recipients.stream()
                .map(preference -> toDigest(preference, digestType, cutoff))
                .filter(digest -> !digest.notifications().isEmpty())
                .toList();
    }

    private NotificationDigest toDigest(
            NotificationPreference preference,
            String digestType,
            LocalDateTime cutoff
    ) {
        UUID userId = preference.getUser().getId();
        Set<UUID> mutedWhiteboardIds = activeMutedWhiteboardIds(preference);
        List<Notification> notifications = notificationRepository
                .findByRecipientIdAndIsReadFalseAndCreatedAtAfterOrderByCreatedAtDesc(userId, cutoff)
                .stream()
                .filter(notification -> !mutedWhiteboardIds.contains(notificationWhiteboardId(notification)))
                .toList();

        return new NotificationDigest(
                preference.getUser().getId(),
                preference.getUser().getEmail(),
                preference.getUser().getExpoPushToken(),
                digestType,
                notifications
        );
    }

    private Set<UUID> activeMutedWhiteboardIds(NotificationPreference preference) {
        LocalDateTime now = LocalDateTime.now();
        return preference.getClassOverrides().stream()
                .filter(override -> override.getMutedUntil() != null && override.getMutedUntil().isAfter(now))
                .map(NotificationClassOverride::getWhiteboard)
                .filter(whiteboard -> whiteboard != null && whiteboard.getId() != null)
                .map(whiteboard -> whiteboard.getId())
                .collect(Collectors.toSet());
    }

    private UUID notificationWhiteboardId(Notification notification) {
        return notification.getWhiteboardId() != null
                ? notification.getWhiteboardId()
                : notification.getReferenceId();
    }

    private void logDigestAssembly(String label, List<NotificationDigest> digests) {
        int notificationCount = digests.stream()
                .mapToInt(digest -> digest.notifications().size())
                .sum();
        log.info(
                "Assembled {} notification digests for {} recipients with {} notifications",
                label,
                digests.size(),
                notificationCount
        );
    }

    public record NotificationDigest(
            UUID recipientId,
            String recipientEmail,
            String expoPushToken,
            String digestType,
            List<Notification> notifications
    ) {
    }
}
