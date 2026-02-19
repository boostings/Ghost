package com.ghost.repository;

import com.ghost.model.JoinRequest;
import com.ghost.model.enums.JoinRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, UUID> {

    List<JoinRequest> findByWhiteboardIdAndStatus(UUID whiteboardId, JoinRequestStatus status);

    Page<JoinRequest> findByWhiteboardIdAndStatusOrderByCreatedAtDesc(
            UUID whiteboardId,
            JoinRequestStatus status,
            Pageable pageable
    );

    Optional<JoinRequest> findByUserIdAndWhiteboardId(UUID userId, UUID whiteboardId);

    boolean existsByUserIdAndWhiteboardIdAndStatus(UUID userId, UUID whiteboardId, JoinRequestStatus status);
}
