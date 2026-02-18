package com.ghost.service;

import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.User;
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

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    @Transactional
    public User updateUser(UUID userId, UpdateUserRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (req.getFirstName() != null && !req.getFirstName().isBlank()) {
            user.setFirstName(req.getFirstName());
        }

        if (req.getLastName() != null && !req.getLastName().isBlank()) {
            user.setLastName(req.getLastName());
        }

        if (req.getSettingsJson() != null) {
            user.setSettingsJson(req.getSettingsJson());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void updatePushToken(UUID userId, String token) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.setExpoPushToken(token);
        userRepository.save(user);
        log.debug("Push token updated for user: {}", userId);
    }
}
