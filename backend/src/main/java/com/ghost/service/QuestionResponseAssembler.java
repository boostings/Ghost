package com.ghost.service;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.mapper.QuestionMapper;
import com.ghost.model.Question;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuestionResponseAssembler {

    private final CommentRepository commentRepository;
    private final KarmaVoteRepository karmaVoteRepository;
    private final BookmarkRepository bookmarkRepository;
    private final QuestionMapper questionMapper;

    @Transactional(readOnly = true)
    public QuestionResponse toResponse(Question question, UUID currentUserId, boolean includeModerationData) {
        VoteType userVote = karmaVoteRepository.findByUserIdAndQuestionId(currentUserId, question.getId())
                .map(vote -> vote.getVoteType())
                .orElse(null);
        long commentCount = commentRepository.countByQuestionId(question.getId());
        boolean isBookmarked = bookmarkRepository.existsByUserIdAndQuestionId(currentUserId, question.getId());

        return questionMapper.toResponse(
                question,
                userVote,
                commentCount,
                isBookmarked,
                includeModerationData
        );
    }
}
