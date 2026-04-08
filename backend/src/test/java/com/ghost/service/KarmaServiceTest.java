package com.ghost.service;

import com.ghost.model.Comment;
import com.ghost.model.KarmaVote;
import com.ghost.model.Question;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.VoteType;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.KarmaVoteRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KarmaServiceTest {

    @Mock
    private KarmaVoteRepository karmaVoteRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private KarmaService karmaService;

    private UUID voterId;
    private UUID authorId;
    private UUID whiteboardId;
    private UUID questionId;
    private UUID commentId;
    private User voter;
    private User author;
    private Question question;
    private Comment comment;

    @BeforeEach
    void setUp() {
        voterId = UUID.randomUUID();
        authorId = UUID.randomUUID();
        whiteboardId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        commentId = UUID.randomUUID();

        voter = User.builder()
                .id(voterId)
                .karmaScore(0)
                .build();
        author = User.builder()
                .id(authorId)
                .karmaScore(0)
                .build();

        Whiteboard whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .build();

        question = Question.builder()
                .id(questionId)
                .whiteboard(whiteboard)
                .author(author)
                .title("How does coverage work?")
                .karmaScore(0)
                .build();

        comment = Comment.builder()
                .id(commentId)
                .question(question)
                .author(author)
                .body("This is a deliberately long comment body that will exceed eighty characters so the preview gets trimmed.")
                .karmaScore(0)
                .build();

        when(questionRepository.sumKarmaByAuthorId(authorId)).thenReturn(7);
        when(commentRepository.sumKarmaByAuthorId(authorId)).thenReturn(3);
    }

    @Test
    void voteOnQuestionShouldCreateVoteRecalculateKarmaAndNotifyWhenTrending() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(userRepository.findById(voterId)).thenReturn(Optional.of(voter));
        when(karmaVoteRepository.findByUserIdAndQuestionId(voterId, questionId)).thenReturn(Optional.empty());
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.UPVOTE))
                .thenReturn(19L, 20L, 20L);
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.DOWNVOTE))
                .thenReturn(0L, 0L, 0L);

        karmaService.voteOnQuestion(voterId, questionId, VoteType.UPVOTE);

        verify(whiteboardService).verifyMembership(voterId, whiteboardId);
        verify(karmaVoteRepository).save(any(KarmaVote.class));
        verify(questionRepository).save(question);
        verify(userRepository).save(author);
        verify(auditLogService).logAction(
                whiteboardId,
                voterId,
                AuditAction.KARMA_VOTE_UPDATED,
                "Question",
                questionId,
                null,
                VoteType.UPVOTE.name()
        );
        verify(notificationService).createAndSend(
                voterId,
                authorId,
                NotificationType.POST_TRENDING,
                "Your Question Is Trending",
                "Your question has reached 20+ interactions: How does coverage work?",
                "Question",
                questionId,
                whiteboardId
        );
        assertThat(question.getKarmaScore()).isEqualTo(20);
        assertThat(author.getKarmaScore()).isEqualTo(10);
    }

    @Test
    void voteOnQuestionShouldRemoveExistingVoteWhenSameTypeIsSubmitted() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(userRepository.findById(voterId)).thenReturn(Optional.of(voter));
        KarmaVote existingVote = KarmaVote.builder()
                .user(voter)
                .question(question)
                .voteType(VoteType.UPVOTE)
                .build();
        when(karmaVoteRepository.findByUserIdAndQuestionId(voterId, questionId))
                .thenReturn(Optional.of(existingVote));
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.UPVOTE))
                .thenReturn(1L, 0L, 0L);
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.DOWNVOTE))
                .thenReturn(0L, 0L, 0L);

        karmaService.voteOnQuestion(voterId, questionId, VoteType.UPVOTE);

        verify(karmaVoteRepository).delete(existingVote);
        verify(karmaVoteRepository, never()).save(existingVote);
        verify(notificationService, never()).createAndSend(
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
        assertThat(question.getKarmaScore()).isZero();
    }

    @Test
    void voteOnQuestionShouldSwitchExistingVoteWhenTypeChanges() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(userRepository.findById(voterId)).thenReturn(Optional.of(voter));
        KarmaVote existingVote = KarmaVote.builder()
                .user(voter)
                .question(question)
                .voteType(VoteType.DOWNVOTE)
                .build();
        when(karmaVoteRepository.findByUserIdAndQuestionId(voterId, questionId))
                .thenReturn(Optional.of(existingVote));
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.UPVOTE))
                .thenReturn(5L, 6L, 6L);
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.DOWNVOTE))
                .thenReturn(4L, 3L, 3L);

        karmaService.voteOnQuestion(voterId, questionId, VoteType.UPVOTE);

        verify(karmaVoteRepository).save(existingVote);
        assertThat(existingVote.getVoteType()).isEqualTo(VoteType.UPVOTE);
        assertThat(question.getKarmaScore()).isEqualTo(3);
    }

    @Test
    void voteOnCommentShouldCreateVoteTrimPreviewAndNotifyWhenTrending() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(userRepository.findById(voterId)).thenReturn(Optional.of(voter));
        when(karmaVoteRepository.findByUserIdAndCommentId(voterId, commentId)).thenReturn(Optional.empty());
        when(karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.UPVOTE))
                .thenReturn(19L, 20L, 20L);
        when(karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.DOWNVOTE))
                .thenReturn(0L, 0L, 0L);

        karmaService.voteOnComment(voterId, commentId, VoteType.UPVOTE);

        verify(whiteboardService).verifyMembership(voterId, whiteboardId);
        verify(karmaVoteRepository).save(any(KarmaVote.class));
        verify(commentRepository).save(comment);
        verify(userRepository).save(author);
        verify(notificationService).createAndSend(
                eq(voterId),
                eq(authorId),
                eq(NotificationType.POST_TRENDING),
                eq("Your Comment Is Trending"),
                contains("Your comment has reached 20+ interactions: This is a deliberately long comment body"),
                eq("Comment"),
                eq(commentId),
                eq(whiteboardId)
        );
        assertThat(comment.getKarmaScore()).isEqualTo(20);
    }

    @Test
    void voteOnCommentShouldRemoveExistingVoteWhenSameTypeIsSubmitted() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(userRepository.findById(voterId)).thenReturn(Optional.of(voter));
        KarmaVote existingVote = KarmaVote.builder()
                .user(voter)
                .comment(comment)
                .voteType(VoteType.DOWNVOTE)
                .build();
        when(karmaVoteRepository.findByUserIdAndCommentId(voterId, commentId))
                .thenReturn(Optional.of(existingVote));
        when(karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.UPVOTE))
                .thenReturn(0L, 0L, 0L);
        when(karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.DOWNVOTE))
                .thenReturn(1L, 0L, 0L);

        karmaService.voteOnComment(voterId, commentId, VoteType.DOWNVOTE);

        verify(karmaVoteRepository).delete(existingVote);
        verify(karmaVoteRepository, never()).save(existingVote);
        assertThat(comment.getKarmaScore()).isZero();
    }

    @Test
    void removeQuestionVoteShouldDeleteExistingVoteAndRecalculateKarma() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        KarmaVote existingVote = KarmaVote.builder()
                .user(voter)
                .question(question)
                .voteType(VoteType.UPVOTE)
                .build();
        when(karmaVoteRepository.findByUserIdAndQuestionId(voterId, questionId))
                .thenReturn(Optional.of(existingVote));
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.UPVOTE))
                .thenReturn(2L);
        when(karmaVoteRepository.countByQuestionIdAndVoteType(questionId, VoteType.DOWNVOTE))
                .thenReturn(1L);

        karmaService.removeQuestionVote(voterId, questionId);

        verify(whiteboardService).verifyMembership(voterId, whiteboardId);
        verify(karmaVoteRepository).delete(existingVote);
        verify(questionRepository).save(question);
        verify(userRepository).save(author);
        verify(auditLogService).logAction(
                whiteboardId,
                voterId,
                AuditAction.KARMA_VOTE_REMOVED,
                "Question",
                questionId,
                "voted",
                null
        );
        assertThat(question.getKarmaScore()).isEqualTo(1);
    }

    @Test
    void removeCommentVoteShouldDeleteExistingVoteAndRecalculateKarma() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        KarmaVote existingVote = KarmaVote.builder()
                .user(voter)
                .comment(comment)
                .voteType(VoteType.DOWNVOTE)
                .build();
        when(karmaVoteRepository.findByUserIdAndCommentId(voterId, commentId))
                .thenReturn(Optional.of(existingVote));
        when(karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.UPVOTE))
                .thenReturn(4L);
        when(karmaVoteRepository.countByCommentIdAndVoteType(commentId, VoteType.DOWNVOTE))
                .thenReturn(1L);

        karmaService.removeCommentVote(voterId, commentId);

        verify(whiteboardService).verifyMembership(voterId, whiteboardId);
        verify(karmaVoteRepository).delete(existingVote);
        verify(commentRepository).save(comment);
        verify(userRepository).save(author);
        verify(auditLogService).logAction(
                whiteboardId,
                voterId,
                AuditAction.KARMA_VOTE_REMOVED,
                "Comment",
                commentId,
                "voted",
                null
        );
        assertThat(comment.getKarmaScore()).isEqualTo(3);
    }
}
