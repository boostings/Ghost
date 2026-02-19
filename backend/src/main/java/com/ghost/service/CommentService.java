package com.ghost.service;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.response.CommentResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.mapper.CommentMapper;
import com.ghost.model.Bookmark;
import com.ghost.model.Comment;
import com.ghost.model.Question;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final QuestionService questionService;
    private final BookmarkService bookmarkService;
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final CommentMapper commentMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public CommentResponse createComment(UUID userId, UUID questionId, CreateCommentRequest req) {
        Question question = questionService.getQuestionById(questionId);

        // Check question status
        if (question.getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Cannot add comments to a closed question");
        }
        if (question.isHidden()) {
            throw new BadRequestException("Cannot add comments to hidden content");
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

        CommentResponse response = commentMapper.toResponse(comment, userId);
        publishCommentEvent(question.getId(), "COMMENT_CREATED", response);
        return response;
    }

    @Transactional
    public CommentResponse editComment(UUID userId, UUID questionId, UUID commentId, EditCommentRequest req) {
        Comment comment = getCommentByIdAndQuestion(commentId, questionId);
        whiteboardService.verifyMembership(userId, comment.getQuestion().getWhiteboard().getId());

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

        CommentResponse response = commentMapper.toResponse(comment, userId);
        publishCommentEvent(questionId, "COMMENT_EDITED", response);
        return response;
    }

    @Transactional
    public void deleteComment(UUID userId, UUID questionId, UUID commentId) {
        Comment comment = getCommentByIdAndQuestion(commentId, questionId);
        whiteboardService.verifyMembership(userId, comment.getQuestion().getWhiteboard().getId());

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

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", commentId);
        publishCommentEvent(questionId, "COMMENT_DELETED", payload);
        commentRepository.delete(comment);
    }

    @Transactional
    public void markAsVerifiedAnswer(UUID facultyId, UUID questionId, UUID commentId) {
        Comment comment = getCommentByIdAndQuestion(commentId, questionId);

        Question question = comment.getQuestion();

        // Verify faculty in whiteboard
        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());
        if (question.getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Question is already closed");
        }
        if (question.getVerifiedAnswerId() != null) {
            throw new BadRequestException("Question already has a verified answer");
        }
        if (comment.isVerifiedAnswer()) {
            throw new BadRequestException("Comment is already marked as verified answer");
        }
        if (comment.isHidden()) {
            throw new BadRequestException("Cannot verify a hidden comment");
        }

        // Set comment as verified answer
        comment.setVerifiedAnswer(true);
        commentRepository.save(comment);
        publishCommentEvent(questionId, "COMMENT_UPDATED", commentMapper.toResponse(comment, facultyId));

        // Set question verified answer and close it
        questionService.markVerifiedAnswerAndClose(question.getId(), commentId);

        // Log question status transition caused by verified answer.
        auditLogService.logAction(
                question.getWhiteboard().getId(),
                facultyId,
                AuditAction.QUESTION_CLOSED,
                "Question",
                question.getId(),
                QuestionStatus.OPEN.name(),
                QuestionStatus.CLOSED.name()
        );

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
        List<Bookmark> bookmarks = bookmarkService.getBookmarksByQuestionId(question.getId());
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
    public Page<CommentResponse> getCommentsByQuestion(UUID userId, UUID questionId, Pageable pageable) {
        Question question = questionService.getQuestionById(questionId);
        whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());
        if (question.isHidden()) {
            throw new ResourceNotFoundException("Question", "id", questionId);
        }
        return commentRepository.findByQuestionIdAndIsHiddenFalseOrderByCreatedAtAsc(questionId, pageable)
                .map(comment -> commentMapper.toResponse(comment, userId));
    }

    private void publishCommentEvent(UUID questionId, String type, Object payload) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", type);
        message.put("payload", payload);
        messagingTemplate.convertAndSend("/topic/question/" + questionId + "/comments", message);
    }

    private Comment getCommentByIdAndQuestion(UUID commentId, UUID questionId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));
        if (!comment.getQuestion().getId().equals(questionId)) {
            throw new ResourceNotFoundException("Comment", "id", commentId);
        }
        return comment;
    }
}
