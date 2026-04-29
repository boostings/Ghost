package com.ghost.repository;

import com.ghost.model.Report;
import com.ghost.model.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    boolean existsByReporterIdAndQuestionId(UUID reporterId, UUID questionId);

    boolean existsByReporterIdAndCommentId(UUID reporterId, UUID commentId);

    List<Report> findByQuestionId(UUID questionId);

    List<Report> findByCommentId(UUID commentId);

    long countByQuestionIdAndStatusNot(UUID questionId, ReportStatus status);

    long countByCommentIdAndStatusNot(UUID commentId, ReportStatus status);

    long countByQuestionIdAndStatus(UUID questionId, ReportStatus status);

    long countByCommentIdAndStatus(UUID commentId, ReportStatus status);

    Page<Report> findByStatus(ReportStatus status, Pageable pageable);

    @Query("SELECT r FROM Report r " +
            "LEFT JOIN r.question q " +
            "LEFT JOIN r.comment c " +
            "LEFT JOIN c.question cq " +
            "WHERE q.whiteboard.id = :whiteboardId " +
            "OR cq.whiteboard.id = :whiteboardId")
    List<Report> findByWhiteboardId(@Param("whiteboardId") UUID whiteboardId);

    @Query("SELECT r FROM Report r " +
            "LEFT JOIN r.question q " +
            "LEFT JOIN r.comment c " +
            "LEFT JOIN c.question cq " +
            "WHERE (q.whiteboard.id = :whiteboardId " +
            "OR cq.whiteboard.id = :whiteboardId) " +
            "ORDER BY r.createdAt DESC")
    Page<Report> findByWhiteboardIdPaged(@Param("whiteboardId") UUID whiteboardId, Pageable pageable);

    @Query("SELECT r FROM Report r " +
            "LEFT JOIN r.question q " +
            "LEFT JOIN r.comment c " +
            "LEFT JOIN c.question cq " +
            "WHERE (q.whiteboard.id = :whiteboardId " +
            "OR cq.whiteboard.id = :whiteboardId) " +
            "AND r.status = :status " +
            "ORDER BY r.createdAt DESC")
    Page<Report> findByWhiteboardIdAndStatusPaged(
            @Param("whiteboardId") UUID whiteboardId,
            @Param("status") ReportStatus status,
            Pageable pageable);
}
