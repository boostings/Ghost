package com.ghost.repository;

import com.ghost.model.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID>, JpaSpecificationExecutor<Question> {

    Page<Question> findByWhiteboardIdOrderByIsPinnedDescCreatedAtDesc(UUID whiteboardId, Pageable pageable);

    Page<Question> findByWhiteboardIdAndIsHiddenFalseOrderByIsPinnedDescCreatedAtDesc(UUID whiteboardId, Pageable pageable);

    long countByWhiteboardIdAndIsPinnedTrue(UUID whiteboardId);

    List<Question> findByAuthorId(UUID authorId);

    @Query("SELECT COALESCE(SUM(q.karmaScore), 0) FROM Question q WHERE q.author.id = :authorId")
    int sumKarmaByAuthorId(@Param("authorId") UUID authorId);

    @Query(value = "SELECT * FROM questions q WHERE q.whiteboard_id = :whiteboardId " +
            "AND q.is_hidden = false " +
            "AND q.search_vector @@ plainto_tsquery('english', :query) " +
            "ORDER BY ts_rank(q.search_vector, plainto_tsquery('english', :query)) DESC",
            countQuery = "SELECT COUNT(*) FROM questions q WHERE q.whiteboard_id = :whiteboardId " +
                    "AND q.is_hidden = false " +
                    "AND q.search_vector @@ plainto_tsquery('english', :query)",
            nativeQuery = true)
    Page<Question> searchByWhiteboardId(@Param("whiteboardId") UUID whiteboardId,
                                        @Param("query") String query,
                                        Pageable pageable);

    @Query(value = """
            SELECT *
            FROM questions q
            WHERE q.whiteboard_id IN (:whiteboardIds)
              AND q.is_hidden = false
              AND (:topicId IS NULL OR q.topic_id = :topicId)
              AND (:status IS NULL OR q.status = :status)
              AND (:startAt IS NULL OR q.created_at >= :startAt)
              AND (:endAt IS NULL OR q.created_at <= :endAt)
              AND (
                    :query IS NULL
                    OR :query = ''
                    OR q.search_vector @@ plainto_tsquery('english', :query)
                  )
            ORDER BY
              CASE
                WHEN :query IS NULL OR :query = '' THEN 0
                ELSE ts_rank(q.search_vector, plainto_tsquery('english', :query))
              END DESC,
              q.is_pinned DESC,
              q.created_at DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM questions q
            WHERE q.whiteboard_id IN (:whiteboardIds)
              AND q.is_hidden = false
              AND (:topicId IS NULL OR q.topic_id = :topicId)
              AND (:status IS NULL OR q.status = :status)
              AND (:startAt IS NULL OR q.created_at >= :startAt)
              AND (:endAt IS NULL OR q.created_at <= :endAt)
              AND (
                    :query IS NULL
                    OR :query = ''
                    OR q.search_vector @@ plainto_tsquery('english', :query)
                  )
            """,
            nativeQuery = true)
    Page<Question> searchWithFilters(
            @Param("whiteboardIds") List<UUID> whiteboardIds,
            @Param("query") String query,
            @Param("topicId") UUID topicId,
            @Param("status") String status,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt,
            Pageable pageable
    );
}
