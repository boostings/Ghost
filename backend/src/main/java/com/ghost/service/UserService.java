package com.ghost.service;

import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.response.UserResponse;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.mapper.UserMapper;
import com.ghost.model.User;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final AuditLogService auditLogService;
    private final UserMapper userMapper;

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
            user.setSettingsJson(req.getSettingsJson());
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
        String oldToken = user.getExpoPushToken();

        user.setExpoPushToken(token);
        userRepository.save(user);
        logUserAction(userId, AuditAction.USER_PUSH_TOKEN_UPDATED, userId, oldToken, token);
        log.debug("Push token updated for user: {}", userId);
    }

    private void logUserAction(UUID actorId, AuditAction action, UUID targetId, String oldValue, String newValue) {
        List<WhiteboardMembership> memberships = whiteboardMembershipRepository.findByUserId(actorId);
        for (WhiteboardMembership membership : memberships) {
            auditLogService.logAction(
                    membership.getWhiteboard().getId(),
                    actorId,
                    action,
                    "User",
                    targetId,
                    oldValue,
                    newValue
            );
        }
    }
}
