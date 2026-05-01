package com.ghost.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ghost.dto.response.UserResponse;
import com.ghost.model.User;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    private static final TypeReference<Map<String, Object>> SETTINGS_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper = new ObjectMapper();

    public UserResponse toResponse(User user) {
        Map<String, Object> settings = parseSettings(user.getSettingsJson());

        boolean pushEnabled = settings.containsKey("pushNotificationsEnabled")
            ? Boolean.TRUE.equals(settings.get("pushNotificationsEnabled"))
            : true;
        boolean emailEnabled = settings.containsKey("emailNotificationsEnabled")
            ? Boolean.TRUE.equals(settings.get("emailNotificationsEnabled"))
            : true;

        return UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .karmaScore(user.getKarmaScore())
            .emailVerified(user.isEmailVerified())
            .pushNotificationsEnabled(pushEnabled)
            .emailNotificationsEnabled(emailEnabled)
            .anonymousMode(user.isAnonymousMode())
            .createdAt(user.getCreatedAt())
            .build();
    }

    private Map<String, Object> parseSettings(String settingsJson) {
        if (settingsJson == null || settingsJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(settingsJson, SETTINGS_TYPE);
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
