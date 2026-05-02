package com.ghost.repository;

import com.ghost.model.NotificationClassOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NotificationClassOverrideRepository extends JpaRepository<NotificationClassOverride, UUID> {

    Optional<NotificationClassOverride> findByPreferenceIdAndWhiteboardId(
            UUID preferenceId,
            UUID whiteboardId
    );
}
