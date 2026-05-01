package com.ghost.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.response.UserResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.mapper.UserMapper;
import com.ghost.model.User;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private static final String TOKEN_PRESENT = "[PUSH_TOKEN_PRESENT]";
    private static final String TOKEN_CLEARED = "[PUSH_TOKEN_CLEARED]";

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        return userMapper.toResponse(getUserEntityById(id));
    }

    @Transactional(readOnly = true)
    public User getUserEntityById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    @Transactional(readOnly = true)
    public User getUserEntityByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    @Transactional
    public UserResponse updateUser(UUID userId, UpdateUserRequest req) {
        User user = getUserEntityById(userId);
        String oldValue = "firstName=" + user.getFirstName()
                + ";lastName=" + user.getLastName()
                + ";settingsJson=" + user.getSettingsJson();

        if (req.getFirstName() != null && !req.getFirstName().isBlank()) {
            user.setFirstName(req.getFirstName());
        }

        if (req.getLastName() != null && !req.getLastName().isBlank()) {
            user.setLastName(req.getLastName());
        }

        if (req.getSettingsJson() != null) {
            user.setSettingsJson(normalizeSettingsJson(req.getSettingsJson()));
        }

        if (req.getAnonymousMode() != null) {
            user.setAnonymousMode(req.getAnonymousMode());
        }

        User savedUser = userRepository.save(user);
        String newValue = "firstName=" + savedUser.getFirstName()
                + ";lastName=" + savedUser.getLastName()
                + ";settingsJson=" + savedUser.getSettingsJson();
        logUserAction(userId, AuditAction.USER_UPDATED, userId, oldValue, newValue);
        return userMapper.toResponse(savedUser);
    }

    @Transactional
    public void updatePushToken(UUID userId, String token) {
        User user = getUserEntityById(userId);
        String oldTokenState = pushTokenAuditState(user.getExpoPushToken());

        user.setExpoPushToken(token);
        userRepository.save(user);
        logUserAction(userId, AuditAction.USER_PUSH_TOKEN_UPDATED, userId, oldTokenState, pushTokenAuditState(token));
        log.debug("Push token updated for user: {}", userId);
    }

    @Transactional
    public void clearPushToken(UUID userId) {
        User user = getUserEntityById(userId);
        String oldTokenState = pushTokenAuditState(user.getExpoPushToken());

        user.setExpoPushToken(null);
        userRepository.save(user);
        logUserAction(userId, AuditAction.USER_PUSH_TOKEN_UPDATED, userId, oldTokenState, TOKEN_CLEARED);
        log.debug("Push token cleared for user: {}", userId);
    }

    private String pushTokenAuditState(String token) {
        return token == null || token.isBlank() ? TOKEN_CLEARED : TOKEN_PRESENT;
    }

    private void logUserAction(UUID actorId, AuditAction action, UUID targetId, String oldValue, String newValue) {
        auditLogService.logAction(
                null,
                actorId,
                action,
                "User",
                targetId,
                oldValue,
                newValue
        );
    }

    private String normalizeSettingsJson(String rawSettingsJson) {
        String trimmed = rawSettingsJson.trim();
        if (trimmed.isBlank()) {
            return "{}";
        }

        try {
            return objectMapper.readTree(trimmed).toString();
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("settingsJson must be valid JSON");
        }
    }
}
