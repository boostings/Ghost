package com.ghost.repository;

import com.ghost.model.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Page<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
            select b
            from Bookmark b
            where b.user.id = :userId
              and exists (
                select 1
                from WhiteboardMembership m
                where m.whiteboard.id = b.question.whiteboard.id
                  and m.user.id = :userId
              )
            order by b.createdAt desc
            """)
    Page<Bookmark> findVisibleByUserId(@Param("userId") UUID userId, Pageable pageable);

    Optional<Bookmark> findByUserIdAndQuestionId(UUID userId, UUID questionId);

    boolean existsByUserIdAndQuestionId(UUID userId, UUID questionId);

    void deleteByUserIdAndQuestionId(UUID userId, UUID questionId);

    List<Bookmark> findByQuestionId(UUID questionId);
}
