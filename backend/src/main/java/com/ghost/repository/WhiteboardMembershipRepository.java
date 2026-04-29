package com.ghost.repository;

import com.ghost.model.WhiteboardMembership;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhiteboardMembershipRepository extends JpaRepository<WhiteboardMembership, UUID> {

    Optional<WhiteboardMembership> findByWhiteboardIdAndUserId(UUID whiteboardId, UUID userId);

    List<WhiteboardMembership> findByUserId(UUID userId);

    Page<WhiteboardMembership> findByUserId(UUID userId, Pageable pageable);

    List<WhiteboardMembership> findByWhiteboardId(UUID whiteboardId);

    Page<WhiteboardMembership> findByWhiteboardId(UUID whiteboardId, Pageable pageable);

    boolean existsByWhiteboardIdAndUserId(UUID whiteboardId, UUID userId);

    @Modifying
    @Query(value = """
            INSERT INTO whiteboard_memberships (id, whiteboard_id, user_id, role, joined_at)
            VALUES (:id, :whiteboardId, :userId, 'STUDENT', CURRENT_TIMESTAMP)
            ON CONFLICT (whiteboard_id, user_id) DO NOTHING
            """, nativeQuery = true)
    int insertStudentMembershipIfAbsent(
            @Param("id") UUID id,
            @Param("whiteboardId") UUID whiteboardId,
            @Param("userId") UUID userId
    );

    long countByWhiteboardId(UUID whiteboardId);

    void deleteByWhiteboardIdAndUserId(UUID whiteboardId, UUID userId);

    @Query("SELECT m.whiteboard.id FROM WhiteboardMembership m WHERE m.user.id = :userId")
    List<UUID> findWhiteboardIdsByUserId(@Param("userId") UUID userId);

    @Query("SELECT m.whiteboard.id FROM WhiteboardMembership m " +
            "WHERE m.user.id = :userId AND m.role = com.ghost.model.enums.Role.FACULTY")
    List<UUID> findFacultyWhiteboardIdsByUserId(@Param("userId") UUID userId);
}
