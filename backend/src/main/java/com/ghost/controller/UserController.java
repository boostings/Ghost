package com.ghost.controller;

import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.request.UpdatePushTokenRequest;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.service.QuestionService;
import com.ghost.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final QuestionService questionService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        UserResponse user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody UpdateUserRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        UserResponse user = userService.updateUser(userId, request);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me/push-token")
    public ResponseEntity<Void> updatePushToken(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody UpdatePushTokenRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        userService.updatePushToken(userId, request.getToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/questions")
    public ResponseEntity<PageResponse<QuestionResponse>> getMyQuestions(
            @AuthenticationPrincipal String userIdStr,
            @RequestParam(defaultValue = "AUTHOR") String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(
                PageResponse.from(questionService.getMyQuestions(userId, role, status, pageable))
        );
    }
}
