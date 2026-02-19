package com.ghost.service;

import com.ghost.dto.response.NotificationResponse;
import com.ghost.mapper.NotificationMapper;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.Notification;
import com.ghost.model.User;
import com.ghost.model.enums.NotificationReferenceType;
import com.ghost.model.enums.NotificationType;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.repository.NotificationRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final AuditLogService auditLogService;
    private final NotificationMapper notificationMapper;
    private final SimpMessagingTemplate messagingTemplate;

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    @Transactional
    public void createAndSend(UUID recipientId, NotificationType type, String title,
                              String body, String refType, UUID refId) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", recipientId));

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .body(body)
                .referenceType(NotificationReferenceType.from(refType))
                .referenceId(refId)
                .build();

        notification = notificationRepository.save(notification);

        // Send via WebSocket
        try {
            messagingTemplate.convertAndSendToUser(
                    recipientId.toString(),
                    "/queue/notifications",
                    notification
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to user {}: {}", recipientId, e.getMessage());
        }

        // Send Expo push notification if user has a push token
        if (recipient.getExpoPushToken() != null && !recipient.getExpoPushToken().isBlank()) {
            sendExpoPush(recipient.getExpoPushToken(), title, body);
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .map(notificationMapper::toResponse);
    }

    @Transactional
    public void markAsRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new ResourceNotFoundException("Notification", "id", notificationId);
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
            logNotificationAction(userId, notificationId, AuditAction.NOTIFICATION_READ, "unread", "read");
        }
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        long unreadBefore = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        notificationRepository.markAllAsReadByRecipientId(userId);
        if (unreadBefore > 0) {
            logNotificationAction(
                    userId,
                    null,
                    AuditAction.NOTIFICATIONS_MARKED_READ,
                    String.valueOf(unreadBefore),
                    "0"
            );
        }
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    private void sendExpoPush(String expoPushToken, String title, String body) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            Map<String, Object> payload = new HashMap<>();
            payload.put("to", expoPushToken);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("sound", "default");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);

            log.debug("Expo push notification sent successfully");
        } catch (Exception e) {
            log.error("Failed to send Expo push notification: {}", e.getMessage());
        }
    }

    private void logNotificationAction(UUID actorId, UUID targetId, AuditAction action, String oldValue, String newValue) {
        for (WhiteboardMembership membership : whiteboardMembershipRepository.findByUserId(actorId)) {
            auditLogService.logAction(
                    membership.getWhiteboard().getId(),
                    actorId,
                    action,
                    "Notification",
                    targetId,
                    oldValue,
                    newValue
            );
        }
    }
}
