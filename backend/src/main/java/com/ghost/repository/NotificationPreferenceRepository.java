package com.ghost.repository;

import com.ghost.model.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {

    Optional<NotificationPreference> findByUserId(UUID userId);

    List<NotificationPreference> findByEmailDigest(String emailDigest);

    List<NotificationPreference> findByPushFrequency(String pushFrequency);
}
