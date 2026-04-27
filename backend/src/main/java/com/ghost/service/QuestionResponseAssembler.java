package com.ghost.service;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.mapper.QuestionMapper;
import com.ghost.model.Comment;
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

    private static final int VERIFIED_ANSWER_PREVIEW_LENGTH = 160;

    @Transactional(readOnly = true)
    public QuestionResponse toResponse(Question question, UUID currentUserId, boolean includeModerationData) {
        VoteType userVote = karmaVoteRepository.findByUserIdAndQuestionId(currentUserId, question.getId())
                .map(vote -> vote.getVoteType())
                .orElse(null);
        long commentCount = commentRepository.countByQuestionId(question.getId());
        boolean isBookmarked = bookmarkRepository.existsByUserIdAndQuestionId(currentUserId, question.getId());

        String verifiedAnswerPreview = null;
        String verifiedAnswerAuthorName = null;
        UUID verifiedAnswerId = question.getVerifiedAnswerId();
        if (verifiedAnswerId != null) {
            Comment verified = commentRepository.findById(verifiedAnswerId).orElse(null);
            if (verified != null && !verified.isHidden()) {
                verifiedAnswerPreview = truncatePreview(verified.getBody());
                if (verified.getAuthor() != null) {
                    verifiedAnswerAuthorName =
                            verified.getAuthor().getFirstName() + " " + verified.getAuthor().getLastName();
                }
            }
        }

        return questionMapper.toResponse(
                question,
                userVote,
                commentCount,
                isBookmarked,
                includeModerationData,
                verifiedAnswerPreview,
                verifiedAnswerAuthorName
        );
    }

    private static String truncatePreview(String body) {
        if (body == null) return null;
        String trimmed = body.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.length() <= VERIFIED_ANSWER_PREVIEW_LENGTH) return trimmed;
        return trimmed.substring(0, VERIFIED_ANSWER_PREVIEW_LENGTH).trim() + "…";
    }
}
