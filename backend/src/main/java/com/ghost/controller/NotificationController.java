package com.ghost.controller;

import com.ghost.dto.request.UpdateClassNotificationOverrideRequest;
import com.ghost.dto.request.UpdateNotificationPreferencesRequest;
import com.ghost.dto.response.NotificationPreferencesResponse;
import com.ghost.dto.response.NotificationResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.UnreadCountResponse;
import com.ghost.service.NotificationPreferenceService;
import com.ghost.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationPreferenceService notificationPreferenceService;

    @GetMapping
    public ResponseEntity<PageResponse<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal String userIdStr,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<NotificationResponse> notificationPage = notificationService.getNotifications(userId, pageable);
        return ResponseEntity.ok(PageResponse.from(notificationPage));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(UnreadCountResponse.builder().count(count).build());
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        notificationService.markAsRead(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearAll(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        notificationService.clearAll(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreferencesResponse> getPreferences(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(notificationPreferenceService.getPreferences(userId));
    }

    @PutMapping("/preferences")
    public ResponseEntity<NotificationPreferencesResponse> updatePreferences(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody UpdateNotificationPreferencesRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(notificationPreferenceService.updatePreferences(userId, request));
    }

    @PutMapping("/preferences/classes/{whiteboardId}")
    public ResponseEntity<NotificationPreferencesResponse> updateClassOverride(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID whiteboardId,
            @Valid @RequestBody UpdateClassNotificationOverrideRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(notificationPreferenceService.updateClassOverride(
                userId,
                whiteboardId,
                request
        ));
    }
}
