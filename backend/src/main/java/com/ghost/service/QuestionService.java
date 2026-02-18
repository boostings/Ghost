package com.ghost.service;

import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.model.Question;
import com.ghost.model.Topic;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final CommentRepository commentRepository;
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Transactional
    public Question createQuestion(UUID userId, UUID whiteboardId, CreateQuestionRequest req) {
        // Verify membership
        WhiteboardMembership membership = whiteboardService.verifyMembership(userId, whiteboardId);
        Whiteboard whiteboard = whiteboardService.getWhiteboardById(whiteboardId);

        Question question = Question.builder()
                .whiteboard(whiteboard)
                .author(membership.getUser())
                .title(req.getTitle())
                .body(req.getBody())
                .status(QuestionStatus.OPEN)
                .build();

        // Set topic if provided
        if (req.getTopicId() != null) {
            question.setTopic(Topic.builder().id(req.getTopicId()).build());
        }

        question = questionRepository.save(question);

        auditLogService.logAction(
                whiteboardId, userId, AuditAction.QUESTION_CREATED,
                "Question", question.getId(), null, question.getTitle()
        );

        return question;
    }

    @Transactional
    public Question editQuestion(UUID userId, UUID questionId, EditQuestionRequest req) {
        Question question = getQuestionById(questionId);

        // Verify author
        if (!question.getAuthor().getId().equals(userId)) {
            throw new UnauthorizedException("Only the author can edit this question");
        }

        // Verify status is OPEN
        if (question.getStatus() != QuestionStatus.OPEN) {
            throw new BadRequestException("Cannot edit a closed question");
        }

        // Verify no verified answer
        if (question.getVerifiedAnswerId() != null) {
            throw new BadRequestException("Cannot edit a question that has a verified answer");
        }

        // Save old values for audit
        String oldTitle = question.getTitle();
        String oldBody = question.getBody();

        // Update fields
        if (req.getTitle() != null && !req.getTitle().isBlank()) {
            question.setTitle(req.getTitle());
        }
        if (req.getBody() != null && !req.getBody().isBlank()) {
            question.setBody(req.getBody());
        }
        if (req.getTopicId() != null) {
            question.setTopic(Topic.builder().id(req.getTopicId()).build());
        }

        question = questionRepository.save(question);

        auditLogService.logAction(
                question.getWhiteboard().getId(), userId, AuditAction.QUESTION_EDITED,
                "Question", questionId,
                "title=" + oldTitle + "; body=" + oldBody,
                "title=" + question.getTitle() + "; body=" + question.getBody()
        );

        return question;
    }

    @Transactional
    public void deleteQuestion(UUID userId, UUID questionId) {
        Question question = getQuestionById(questionId);

        // Verify author or faculty in whiteboard
        boolean isAuthor = question.getAuthor().getId().equals(userId);
        boolean isFaculty = false;

        if (!isAuthor) {
            try {
                whiteboardService.verifyFacultyRole(userId, question.getWhiteboard().getId());
                isFaculty = true;
            } catch (UnauthorizedException e) {
                throw new UnauthorizedException("Only the author or faculty can delete this question");
            }
        }

        auditLogService.logAction(
                question.getWhiteboard().getId(), userId, AuditAction.QUESTION_DELETED,
                "Question", questionId,
                "title=" + question.getTitle() + "; body=" + question.getBody(),
                null
        );

        questionRepository.delete(question);
    }

    @Transactional(readOnly = true)
    public Page<Question> getQuestions(UUID whiteboardId, Pageable pageable) {
        return questionRepository.findByWhiteboardIdAndIsHiddenFalseOrderByIsPinnedDescCreatedAtDesc(
                whiteboardId, pageable);
    }

    @Transactional(readOnly = true)
    public Question getQuestionById(UUID questionId) {
        return questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
    }

    @Transactional
    public void closeQuestion(UUID facultyId, UUID questionId) {
        Question question = getQuestionById(questionId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());

        question.setStatus(QuestionStatus.CLOSED);
        questionRepository.save(question);

        auditLogService.logAction(
                question.getWhiteboard().getId(), facultyId, AuditAction.QUESTION_CLOSED,
                "Question", questionId, QuestionStatus.OPEN.name(), QuestionStatus.CLOSED.name()
        );
    }

    @Transactional
    public void pinQuestion(UUID facultyId, UUID questionId) {
        Question question = getQuestionById(questionId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());

        // Check pinned count < 3
        long pinnedCount = questionRepository.countByWhiteboardIdAndIsPinnedTrue(
                question.getWhiteboard().getId());
        if (pinnedCount >= 3) {
            throw new BadRequestException("Maximum of 3 pinned questions allowed per whiteboard");
        }

        question.setPinned(true);
        questionRepository.save(question);
    }

    @Transactional
    public void unpinQuestion(UUID facultyId, UUID questionId) {
        Question question = getQuestionById(questionId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());

        question.setPinned(false);
        questionRepository.save(question);
    }

    @Transactional
    public void forwardQuestion(UUID facultyId, UUID questionId, ForwardQuestionRequest req) {
        Question question = getQuestionById(questionId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());

        // Create notification for target faculty
        notificationService.createAndSend(
                req.getTargetFacultyId(),
                NotificationType.QUESTION_FORWARDED,
                "Question Forwarded",
                "A question has been forwarded to you: " + question.getTitle(),
                "Question",
                questionId
        );

        auditLogService.logAction(
                question.getWhiteboard().getId(), facultyId, AuditAction.QUESTION_FORWARDED,
                "Question", questionId, null, "Forwarded to: " + req.getTargetFacultyId()
        );
    }
}
