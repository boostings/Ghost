package com.ghost.service;

import com.ghost.dto.response.CommentResponse;
import com.ghost.mapper.CommentMapper;
import com.ghost.model.Comment;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.KarmaVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentResponseAssembler {

    private final KarmaVoteRepository karmaVoteRepository;
    private final CommentMapper commentMapper;

    @Transactional(readOnly = true)
    public CommentResponse toResponse(Comment comment, UUID currentUserId) {
        VoteType userVote = karmaVoteRepository.findByUserIdAndCommentId(currentUserId, comment.getId())
                .map(vote -> vote.getVoteType())
                .orElse(null);

        return commentMapper.toResponse(comment, currentUserId, userVote);
    }
}
