package com.ghost.repository;

import com.ghost.model.WhiteboardMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhiteboardMembershipRepository extends JpaRepository<WhiteboardMembership, UUID> {

    Optional<WhiteboardMembership> findByWhiteboardIdAndUserId(UUID whiteboardId, UUID userId);

    List<WhiteboardMembership> findByUserId(UUID userId);

    List<WhiteboardMembership> findByWhiteboardId(UUID whiteboardId);

    boolean existsByWhiteboardIdAndUserId(UUID whiteboardId, UUID userId);

    long countByWhiteboardId(UUID whiteboardId);

    void deleteByWhiteboardIdAndUserId(UUID whiteboardId, UUID userId);
}
