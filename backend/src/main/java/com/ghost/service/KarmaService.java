package com.ghost.service;

import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Comment;
import com.ghost.model.KarmaVote;
import com.ghost.model.Question;
import com.ghost.model.User;
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

    @Transactional
    public void voteOnQuestion(UUID userId, UUID questionId, VoteType voteType) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

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
    }

    @Transactional
    public void voteOnComment(UUID userId, UUID commentId, VoteType voteType) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));

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
    }

    @Transactional
    public void removeQuestionVote(UUID userId, UUID questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

        KarmaVote vote = karmaVoteRepository.findByUserIdAndQuestionId(userId, questionId)
                .orElseThrow(() -> new ResourceNotFoundException("KarmaVote", "questionId", questionId));

        karmaVoteRepository.delete(vote);

        // Recalculate
        recalculateQuestionKarma(question);
        updateUserTotalKarma(question.getAuthor());
    }

    @Transactional
    public void removeCommentVote(UUID userId, UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));

        KarmaVote vote = karmaVoteRepository.findByUserIdAndCommentId(userId, commentId)
                .orElseThrow(() -> new ResourceNotFoundException("KarmaVote", "commentId", commentId));

        karmaVoteRepository.delete(vote);

        // Recalculate
        recalculateCommentKarma(comment);
        updateUserTotalKarma(comment.getAuthor());
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
        // Sum karma from all the author's questions
        int totalKarma = questionRepository.findByAuthorId(author.getId())
                .stream()
                .mapToInt(Question::getKarmaScore)
                .sum();

        // Sum karma from all the author's comments
        totalKarma += commentRepository.findByAuthorId(author.getId())
                .stream()
                .mapToInt(Comment::getKarmaScore)
                .sum();

        author.setKarmaScore(totalKarma);
        userRepository.save(author);
    }
}
