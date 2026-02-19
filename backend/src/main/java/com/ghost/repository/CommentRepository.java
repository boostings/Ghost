package com.ghost.repository;

import com.ghost.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByQuestionIdOrderByCreatedAtAsc(UUID questionId);

    List<Comment> findByQuestionIdAndIsHiddenFalseOrderByCreatedAtAsc(UUID questionId);

    Page<Comment> findByQuestionIdOrderByCreatedAtAsc(UUID questionId, Pageable pageable);

    Page<Comment> findByQuestionIdAndIsHiddenFalseOrderByCreatedAtAsc(UUID questionId, Pageable pageable);

    List<Comment> findByAuthorId(UUID authorId);

    long countByQuestionId(UUID questionId);

    long countByQuestionIdAndIsHiddenFalse(UUID questionId);

    @Query("SELECT COALESCE(SUM(c.karmaScore), 0) FROM Comment c WHERE c.author.id = :authorId")
    int sumKarmaByAuthorId(@Param("authorId") UUID authorId);
}
