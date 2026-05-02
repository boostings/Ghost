package com.ghost.service;

import com.ghost.dto.request.UpdateClassNotificationOverrideRequest;
import com.ghost.dto.request.UpdateNotificationPreferencesRequest;
import com.ghost.dto.response.ClassNotificationOverrideResponse;
import com.ghost.dto.response.NotificationPreferencesResponse;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.NotificationClassOverride;
import com.ghost.model.NotificationPreference;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.repository.NotificationClassOverrideRepository;
import com.ghost.repository.NotificationPreferenceRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private static final String DEFAULT_PUSH_FREQUENCY = "REALTIME";
    private static final String DEFAULT_EMAIL_DIGEST = "DAILY_7AM";

    private final NotificationPreferenceRepository notificationPreferenceRepository;
    private final NotificationClassOverrideRepository notificationClassOverrideRepository;
    private final UserRepository userRepository;
    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardService whiteboardService;

    @Transactional
    public NotificationPreferencesResponse getPreferences(UUID userId) {
        return toResponse(getOrCreatePreference(userId));
    }

    @Transactional
    public NotificationPreferencesResponse updatePreferences(
            UUID userId,
            UpdateNotificationPreferencesRequest request
    ) {
        NotificationPreference preference = getOrCreatePreference(userId);
        if (request.getPushFrequency() != null) {
            preference.setPushFrequency(request.getPushFrequency());
        }
        if (request.getEmailDigest() != null) {
            preference.setEmailDigest(request.getEmailDigest());
        }
        return toResponse(notificationPreferenceRepository.save(preference));
    }

    @Transactional
    public NotificationPreferencesResponse updateClassOverride(
            UUID userId,
            UUID whiteboardId,
            UpdateClassNotificationOverrideRequest request
    ) {
        whiteboardService.verifyMembership(userId, whiteboardId);
        NotificationPreference preference = getOrCreatePreference(userId);
        Whiteboard whiteboard = whiteboardRepository.findById(whiteboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "id", whiteboardId));
        NotificationClassOverride override = notificationClassOverrideRepository
                .findByPreferenceIdAndWhiteboardId(preference.getId(), whiteboardId)
                .orElseGet(() -> NotificationClassOverride.builder()
                        .preference(preference)
                        .whiteboard(whiteboard)
                        .build());

        override.setMutedUntil(Boolean.TRUE.equals(request.getMutedFor24h())
                ? LocalDateTime.now().plusHours(24)
                : null);
        notificationClassOverrideRepository.save(override);
        return toResponse(getOrCreatePreference(userId));
    }

    @Transactional(readOnly = true)
    public List<NotificationPreference> findDailyDigestRecipients() {
        return notificationPreferenceRepository.findByEmailDigest("DAILY_7AM");
    }

    @Transactional(readOnly = true)
    public List<NotificationPreference> findWeeklyDigestRecipients() {
        return notificationPreferenceRepository.findByEmailDigest("WEEKLY_MON_7AM");
    }

    @Transactional(readOnly = true)
    public List<NotificationPreference> findHourlyPushRecipients() {
        return notificationPreferenceRepository.findByPushFrequency("HOURLY");
    }

    private NotificationPreference getOrCreatePreference(UUID userId) {
        return notificationPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
                    return notificationPreferenceRepository.save(NotificationPreference.builder()
                            .user(user)
                            .pushFrequency(DEFAULT_PUSH_FREQUENCY)
                            .emailDigest(DEFAULT_EMAIL_DIGEST)
                            .build());
                });
    }

    private NotificationPreferencesResponse toResponse(NotificationPreference preference) {
        return NotificationPreferencesResponse.builder()
                .pushFrequency(preference.getPushFrequency())
                .emailDigest(preference.getEmailDigest())
                .classOverrides(preference.getClassOverrides().stream()
                        .map(override -> ClassNotificationOverrideResponse.builder()
                                .whiteboardId(override.getWhiteboard().getId())
                                .mutedUntil(override.getMutedUntil())
                                .build())
                        .toList())
                .build();
    }
}
