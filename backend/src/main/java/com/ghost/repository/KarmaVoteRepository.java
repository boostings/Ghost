package com.ghost.repository;

import com.ghost.model.KarmaVote;
import com.ghost.model.enums.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KarmaVoteRepository extends JpaRepository<KarmaVote, UUID> {

    Optional<KarmaVote> findByUserIdAndQuestionId(UUID userId, UUID questionId);

    Optional<KarmaVote> findByUserIdAndCommentId(UUID userId, UUID commentId);

    long countByQuestionIdAndVoteType(UUID questionId, VoteType voteType);

    long countByCommentIdAndVoteType(UUID commentId, VoteType voteType);
}
