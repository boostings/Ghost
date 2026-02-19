package com.ghost.repository;

import com.ghost.model.AuditLog;
import com.ghost.model.enums.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByWhiteboardIdOrderByCreatedAtDesc(UUID whiteboardId, Pageable pageable);

    Page<AuditLog> findByWhiteboardIdAndAction(UUID whiteboardId, AuditAction action, Pageable pageable);

    @Query("""
            SELECT log
            FROM AuditLog log
            WHERE log.whiteboard.id = :whiteboardId
              AND (:action IS NULL OR log.action = :action)
              AND (:actorId IS NULL OR log.actor.id = :actorId)
              AND (:startAt IS NULL OR log.createdAt >= :startAt)
              AND (:endAt IS NULL OR log.createdAt <= :endAt)
            ORDER BY log.createdAt DESC
            """)
    Page<AuditLog> findByFilters(
            @Param("whiteboardId") UUID whiteboardId,
            @Param("action") AuditAction action,
            @Param("actorId") UUID actorId,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt,
            Pageable pageable
    );

    List<AuditLog> findByWhiteboardIdOrderByCreatedAtDesc(UUID whiteboardId);
}
