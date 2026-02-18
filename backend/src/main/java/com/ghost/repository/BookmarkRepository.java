package com.ghost.repository;

import com.ghost.model.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Bookmark> findByUserIdAndQuestionId(UUID userId, UUID questionId);

    boolean existsByUserIdAndQuestionId(UUID userId, UUID questionId);

    void deleteByUserIdAndQuestionId(UUID userId, UUID questionId);

    List<Bookmark> findByQuestionId(UUID questionId);
}
