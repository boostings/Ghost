package com.ghost.service;

import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Comment;
import com.ghost.model.KarmaVote;
import com.ghost.model.Question;
import com.ghost.model.User;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class KarmaService {

    private final KarmaVoteRepository karmaVoteRepository;
    private final QuestionRepository questionRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Transactional
    public void voteOnQuestion(UUID userId, UUID questionId, VoteType voteType) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
        whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());
        long interactionsBefore = getQuestionInteractionCount(questionId);

        User voter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Optional<KarmaVote> existingVote = karmaVoteRepository.findByUserIdAndQuestionId(userId, questionId);

        if (existingVote.isPresent()) {
            KarmaVote vote = existingVote.get();
            if (vote.getVoteType() == voteType) {
                // Same type: remove the vote
                karmaVoteRepository.delete(vote);
            } else {
                // Different type: change it
                vote.setVoteType(voteType);
                karmaVoteRepository.save(vote);
            }
        } else {
            // No existing vote: create new
            KarmaVote vote = KarmaVote.builder()
                    .user(voter)
                    .question(question)
                    .voteType(voteType)
                    .build();
            karmaVoteRepository.save(vote);
        }

        // Recalculate question karma score
        recalculateQuestionKarma(question);

        // Update author's total karma
        updateUserTotalKarma(question.getAuthor());

        auditLogService.logAction(
                question.getWhiteboard().getId(),
                userId,
                AuditAction.KARMA_VOTE_UPDATED,
                "Question",
                questionId,
                null,
                voteType.name()
        );

        maybeNotifyTrendingQuestion(userId, question, interactionsBefore);
    }

    @Transactional
    public void voteOnComment(UUID userId, UUID commentId, VoteType voteType) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));
        whiteboardService.verifyMembership(userId, comment.getQuestion().getWhiteboard().getId());
        long interactionsBefore = getCommentInteractionCount(commentId);

        User voter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Optional<KarmaVote> existingVote = karmaVoteRepository.findByUserIdAndCommentId(userId, commentId);

        if (existingVote.isPresent()) {
            KarmaVote vote = existingVote.get();
            if (vote.getVoteType() == voteType) {
                // Same type: remove the vote
                karmaVoteRepository.delete(vote);
            } else {
                // Different type: change it
                vote.setVoteType(voteType);
                karmaVoteRepository.save(vote);
            }
        } else {
            // No existing vote: create new
            KarmaVote vote = KarmaVote.builder()
                    .user(voter)
                    .comment(comment)
                    .voteType(voteType)
                    .build();
            karmaVoteRepository.save(vote);
        }

        // Recalculate comment karma score
        recalculateCommentKarma(comment);

        // Update author's total karma
        updateUserTotalKarma(comment.getAuthor());

        auditLogService.logAction(
                comment.getQuestion().getWhiteboard().getId(),
                userId,
                AuditAction.KARMA_VOTE_UPDATED,
                "Comment",
                commentId,
                null,
                voteType.name()
        );

        maybeNotifyTrendingComment(userId, comment, interactionsBefore);
    }

    @Transactional
    public void removeQuestionVote(UUID userId, UUID questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
        whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());

        KarmaVote vote = karmaVoteRepository.findByUserIdAndQuestionId(userId, questionId)
                .orElseThrow(() -> new ResourceNotFoundException("KarmaVote", "questionId", questionId));

        karmaVoteRepository.delete(vote);

        // Recalculate
        recalculateQuestionKarma(question);
        updateUserTotalKarma(question.getAuthor());

        auditLogService.logAction(
                question.getWhiteboard().getId(),
                userId,
                AuditAction.KARMA_VOTE_REMOVED,
                "Question",
                questionId,
                "voted",
                null
        );
    }

    @Transactional
    public void removeCommentVote(UUID userId, UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));
        whiteboardService.verifyMembership(userId, comment.getQuestion().getWhiteboard().getId());

        KarmaVote vote = karmaVoteRepository.findByUserIdAndCommentId(userId, commentId)
                .orElseThrow(() -> new ResourceNotFoundException("KarmaVote", "commentId", commentId));

        karmaVoteRepository.delete(vote);

        // Recalculate
        recalculateCommentKarma(comment);
        updateUserTotalKarma(comment.getAuthor());

        auditLogService.logAction(
                comment.getQuestion().getWhiteboard().getId(),
                userId,
                AuditAction.KARMA_VOTE_REMOVED,
                "Comment",
                commentId,
                "voted",
                null
        );
    }

    private void recalculateQuestionKarma(Question question) {
        long upvotes = karmaVoteRepository.countByQuestionIdAndVoteType(question.getId(), VoteType.UPVOTE);
        long downvotes = karmaVoteRepository.countByQuestionIdAndVoteType(question.getId(), VoteType.DOWNVOTE);
        question.setKarmaScore((int) (upvotes - downvotes));
        questionRepository.save(question);
    }

    private void recalculateCommentKarma(Comment comment) {
        long upvotes = karmaVoteRepository.countByCommentIdAndVoteType(comment.getId(), VoteType.UPVOTE);
        long downvotes = karmaVoteRepository.countByCommentIdAndVoteType(comment.getId(), VoteType.DOWNVOTE);
        comment.setKarmaScore((int) (upvotes - downvotes));
        commentRepository.save(comment);
    }

    private void updateUserTotalKarma(User author) {
        int totalKarma = questionRepository.sumKarmaByAuthorId(author.getId())
                + commentRepository.sumKarmaByAuthorId(author.getId());

        author.setKarmaScore(totalKarma);
        userRepository.save(author);
    }

    private long getQuestionInteractionCount(UUID questionId) {
        return karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.UPVOTE)
                + karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.DOWNVOTE);
    }

    private long getCommentInteractionCount(UUID commentId) {
        return karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.UPVOTE)
                + karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.DOWNVOTE);
    }

    private void maybeNotifyTrendingQuestion(UUID actorId, Question question, long interactionsBefore) {
        long interactionsAfter = getQuestionInteractionCount(question.getId());
        if (interactionsBefore < 20
                && interactionsAfter >= 20
                && !question.getAuthor().getId().equals(actorId)) {
            notificationService.createAndSend(
                    question.getAuthor().getId(),
                    NotificationType.POST_TRENDING,
                    "Your Question Is Trending",
                    "Your question has reached 20+ interactions: " + question.getTitle(),
                    "Question",
                    question.getId()
            );
        }
    }

    private void maybeNotifyTrendingComment(UUID actorId, Comment comment, long interactionsBefore) {
        long interactionsAfter = getCommentInteractionCount(comment.getId());
        if (interactionsBefore < 20
                && interactionsAfter >= 20
                && !comment.getAuthor().getId().equals(actorId)) {
            String preview = comment.getBody();
            if (preview != null && preview.length() > 80) {
                preview = preview.substring(0, 80) + "...";
            }
            notificationService.createAndSend(
                    comment.getAuthor().getId(),
                    NotificationType.POST_TRENDING,
                    "Your Comment Is Trending",
                    "Your comment has reached 20+ interactions: " + (preview != null ? preview : "Comment"),
                    "Comment",
                    comment.getId()
            );
        }
    }
}
