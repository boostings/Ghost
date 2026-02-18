package com.ghost.service;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.model.Bookmark;
import com.ghost.model.Comment;
import com.ghost.model.Question;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.repository.BookmarkRepository;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final QuestionRepository questionRepository;
    private final BookmarkRepository bookmarkRepository;
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Transactional
    public Comment createComment(UUID userId, UUID questionId, CreateCommentRequest req) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));

        // Check question status
        if (question.getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Cannot add comments to a closed question");
        }

        // Verify user is member of the whiteboard
        WhiteboardMembership membership = whiteboardService.verifyMembership(
                userId, question.getWhiteboard().getId());

        Comment comment = Comment.builder()
                .question(question)
                .author(membership.getUser())
                .body(req.getBody())
                .editDeadline(LocalDateTime.now().plusMinutes(15))
                .build();

        comment = commentRepository.save(comment);

        // Log audit
        auditLogService.logAction(
                question.getWhiteboard().getId(), userId, AuditAction.COMMENT_CREATED,
                "Comment", comment.getId(), null, comment.getBody()
        );

        // Notify question author (if commenter is not the author)
        if (!question.getAuthor().getId().equals(userId)) {
            notificationService.createAndSend(
                    question.getAuthor().getId(),
                    NotificationType.COMMENT_ADDED,
                    "New Comment",
                    "Someone commented on your question: " + question.getTitle(),
                    "Question",
                    questionId
            );
        }

        return comment;
    }

    @Transactional
    public Comment editComment(UUID userId, UUID commentId, EditCommentRequest req) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));

        // Verify author
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new UnauthorizedException("Only the author can edit this comment");
        }

        // Check edit deadline
        if (comment.getEditDeadline() == null || comment.getEditDeadline().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Edit deadline has passed. Comments can only be edited within 15 minutes.");
        }

        // Save old value for audit
        String oldBody = comment.getBody();

        comment.setBody(req.getBody());
        comment = commentRepository.save(comment);

        auditLogService.logAction(
                comment.getQuestion().getWhiteboard().getId(), userId, AuditAction.COMMENT_EDITED,
                "Comment", commentId, oldBody, comment.getBody()
        );

        return comment;
    }

    @Transactional
    public void deleteComment(UUID userId, UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));

        // Verify author or faculty
        boolean isAuthor = comment.getAuthor().getId().equals(userId);

        if (!isAuthor) {
            try {
                whiteboardService.verifyFacultyRole(userId, comment.getQuestion().getWhiteboard().getId());
            } catch (UnauthorizedException e) {
                throw new UnauthorizedException("Only the author or faculty can delete this comment");
            }
        }

        auditLogService.logAction(
                comment.getQuestion().getWhiteboard().getId(), userId, AuditAction.COMMENT_DELETED,
                "Comment", commentId, comment.getBody(), null
        );

        commentRepository.delete(comment);
    }

    @Transactional
    public void markAsVerifiedAnswer(UUID facultyId, UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));

        Question question = comment.getQuestion();

        // Verify faculty in whiteboard
        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());

        // Set comment as verified answer
        comment.setVerifiedAnswer(true);
        commentRepository.save(comment);

        // Set question verified answer and close it
        question.setVerifiedAnswerId(commentId);
        question.setStatus(QuestionStatus.CLOSED);
        questionRepository.save(question);

        // Log audit
        auditLogService.logAction(
                question.getWhiteboard().getId(), facultyId, AuditAction.VERIFIED_ANSWER_PROVIDED,
                "Comment", commentId, null, "Verified answer for question: " + question.getId()
        );

        // Notify question author
        if (!question.getAuthor().getId().equals(facultyId)) {
            notificationService.createAndSend(
                    question.getAuthor().getId(),
                    NotificationType.QUESTION_ANSWERED,
                    "Your Question Was Answered",
                    "A verified answer has been provided for: " + question.getTitle(),
                    "Question",
                    question.getId()
            );
        }

        // Notify all bookmarkers
        List<Bookmark> bookmarks = bookmarkRepository.findByQuestionId(question.getId());
        for (Bookmark bookmark : bookmarks) {
            UUID bookmarkUserId = bookmark.getUser().getId();
            // Don't notify the question author twice or the faculty who verified
            if (!bookmarkUserId.equals(question.getAuthor().getId())
                    && !bookmarkUserId.equals(facultyId)) {
                notificationService.createAndSend(
                        bookmarkUserId,
                        NotificationType.QUESTION_ANSWERED,
                        "Bookmarked Question Answered",
                        "A verified answer has been provided for: " + question.getTitle(),
                        "Question",
                        question.getId()
                );
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Comment> getCommentsByQuestion(UUID questionId) {
        return commentRepository.findByQuestionIdOrderByCreatedAtAsc(questionId);
    }
}
