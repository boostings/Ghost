package com.ghost.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.response.UserResponse;
import com.ghost.mapper.UserMapper;
import com.ghost.model.User;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private UserMapper userMapper;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private UserService userService;

    @Test
    void getUserByIdShouldMapEntity() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .build();
        UserResponse response = UserResponse.builder()
                .id(userId)
                .email("student@ilstu.edu")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userMapper.toResponse(user)).thenReturn(response);

        assertThat(userService.getUserById(userId)).isEqualTo(response);

        verify(userMapper).toResponse(user);
    }

    @Test
    void updateUserShouldNormalizeSettingsJsonAndLogAudit() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .firstName("Old")
                .lastName("Name")
                .settingsJson("{\"theme\":\"light\"}")
                .build();
        UpdateUserRequest request = UpdateUserRequest.builder()
                .firstName("New")
                .settingsJson("{ \"theme\" : \"dark\" }")
                .build();
        UserResponse response = UserResponse.builder()
                .id(userId)
                .firstName("New")
                .lastName("Name")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(objectMapper.readTree("{ \"theme\" : \"dark\" }"))
                .thenReturn(new ObjectMapper().readTree("{\"theme\":\"dark\"}"));
        when(userRepository.save(user)).thenReturn(user);
        when(userMapper.toResponse(user)).thenReturn(response);

        assertThat(userService.updateUser(userId, request)).isEqualTo(response);
        verify(auditLogService).logAction(
                eq(null),
                eq(userId),
                eq(AuditAction.USER_UPDATED),
                eq("User"),
                eq(userId),
                eq("firstName=Old;lastName=Name;settingsJson={\"theme\":\"light\"}"),
                eq("firstName=New;lastName=Name;settingsJson={\"theme\":\"dark\"}")
        );
    }

    @Test
    void updatePushTokenShouldWriteGlobalAuditLog() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .expoPushToken("ExponentPushToken[old]")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        userService.updatePushToken(userId, "ExponentPushToken[new]");

        verify(auditLogService).logAction(
                eq(null),
                eq(userId),
                eq(AuditAction.USER_PUSH_TOKEN_UPDATED),
                eq("User"),
                eq(userId),
                eq("ExponentPushToken[old]"),
                eq("ExponentPushToken[new]")
        );
    }

    @Test
    void clearPushTokenShouldWriteGlobalAuditLog() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .expoPushToken("ExponentPushToken[old]")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        userService.clearPushToken(userId);

        assertThat(user.getExpoPushToken()).isNull();
        verify(auditLogService).logAction(
                eq(null),
                eq(userId),
                eq(AuditAction.USER_PUSH_TOKEN_UPDATED),
                eq("User"),
                eq(userId),
                eq("ExponentPushToken[old]"),
                eq(null)
        );
    }
}
