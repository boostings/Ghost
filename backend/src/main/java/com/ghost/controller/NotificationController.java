package com.ghost.controller;

import com.ghost.dto.response.NotificationResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.UnreadCountResponse;
import com.ghost.service.NotificationService;
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
}
