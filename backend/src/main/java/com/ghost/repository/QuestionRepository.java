package com.ghost.repository;

import com.ghost.model.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {

    Page<Question> findByWhiteboardIdOrderByIsPinnedDescCreatedAtDesc(UUID whiteboardId, Pageable pageable);

    Page<Question> findByWhiteboardIdAndIsHiddenFalseOrderByIsPinnedDescCreatedAtDesc(UUID whiteboardId, Pageable pageable);

    long countByWhiteboardIdAndIsPinnedTrue(UUID whiteboardId);

    List<Question> findByAuthorId(UUID authorId);

    @Query(value = "SELECT * FROM questions q WHERE q.whiteboard_id = :whiteboardId " +
            "AND q.search_vector @@ plainto_tsquery('english', :query) " +
            "ORDER BY ts_rank(q.search_vector, plainto_tsquery('english', :query)) DESC",
            countQuery = "SELECT COUNT(*) FROM questions q WHERE q.whiteboard_id = :whiteboardId " +
                    "AND q.search_vector @@ plainto_tsquery('english', :query)",
            nativeQuery = true)
    Page<Question> searchByWhiteboardId(@Param("whiteboardId") UUID whiteboardId,
                                        @Param("query") String query,
                                        Pageable pageable);
}
