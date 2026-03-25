package com.ghost.service;

import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.model.Question;
import com.ghost.model.Topic;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.TopicRepository;
import com.ghost.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final QuestionResponseAssembler questionResponseAssembler;
    private final SearchService searchService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public QuestionResponse createQuestion(UUID userId, UUID whiteboardId, CreateQuestionRequest req) {
        // Verify membership
        var membership = whiteboardService.verifyMembership(userId, whiteboardId);
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
            Topic topic = topicRepository.findByIdAndWhiteboardId(req.getTopicId(), whiteboardId)
                    .orElseThrow(() -> new ResourceNotFoundException("Topic", "id", req.getTopicId()));
            question.setTopic(topic);
        }

        question = questionRepository.save(question);

        auditLogService.logAction(
                whiteboardId, userId, AuditAction.QUESTION_CREATED,
                "Question", question.getId(), null, question.getTitle()
        );

        QuestionResponse response = questionResponseAssembler.toResponse(
                question,
                userId,
                membership.getRole() == Role.FACULTY
        );
        publishQuestionEvent(whiteboardId, "QUESTION_CREATED", response);
        return response;
    }

    @Transactional
    public QuestionResponse editQuestion(UUID userId, UUID whiteboardId, UUID questionId, EditQuestionRequest req) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);
        whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());

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
            Topic topic = topicRepository.findByIdAndWhiteboardId(
                            req.getTopicId(), question.getWhiteboard().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Topic", "id", req.getTopicId()));
            question.setTopic(topic);
        }

        question = questionRepository.save(question);

        auditLogService.logAction(
                question.getWhiteboard().getId(), userId, AuditAction.QUESTION_EDITED,
                "Question", questionId,
                "title=" + oldTitle + "; body=" + oldBody,
                "title=" + question.getTitle() + "; body=" + question.getBody()
        );

        QuestionResponse response = questionResponseAssembler.toResponse(
                question,
                userId,
                isFaculty(userId, whiteboardId)
        );
        publishQuestionEvent(question.getWhiteboard().getId(), "QUESTION_EDITED", response);
        return response;
    }

    @Transactional
    public void deleteQuestion(UUID userId, UUID whiteboardId, UUID questionId) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);
        whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());

        // Verify author or faculty in whiteboard
        boolean isAuthor = question.getAuthor().getId().equals(userId);
        if (!isAuthor) {
            try {
                whiteboardService.verifyFacultyRole(userId, question.getWhiteboard().getId());
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

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", questionId);
        publishQuestionEvent(question.getWhiteboard().getId(), "QUESTION_DELETED", payload);
        questionRepository.delete(question);
    }

    @Transactional(readOnly = true)
    public Page<QuestionResponse> getQuestions(
            UUID userId,
            UUID whiteboardId,
            UUID topicId,
            String status,
            Pageable pageable
    ) {
        return searchService.search(userId, null, whiteboardId, topicId, status, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public Question getQuestionById(UUID questionId) {
        return questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
    }

    @Transactional(readOnly = true)
    public QuestionResponse getQuestionById(UUID userId, UUID questionId) {
        Question question = getQuestionById(questionId);
        var membership = whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());
        if (question.isHidden() && membership.getRole() != Role.FACULTY) {
            throw new ResourceNotFoundException("Question", "id", questionId);
        }
        return questionResponseAssembler.toResponse(question, userId, membership.getRole() == Role.FACULTY);
    }

    @Transactional
    public QuestionResponse markVerifiedAnswerAndClose(UUID facultyId, UUID questionId, UUID commentId) {
        Question question = getQuestionById(questionId);
        question.setVerifiedAnswerId(commentId);
        question.setStatus(QuestionStatus.CLOSED);
        questionRepository.save(question);
        QuestionResponse response = questionResponseAssembler.toResponse(question, facultyId, true);
        publishQuestionEvent(question.getWhiteboard().getId(), "QUESTION_UPDATED", response);
        return response;
    }

    @Transactional(readOnly = true)
    public QuestionResponse getQuestionByIdAndWhiteboard(UUID userId, UUID questionId, UUID whiteboardId) {
        var membership = whiteboardService.verifyMembership(userId, whiteboardId);
        Question question = getQuestionById(questionId);
        if (!question.getWhiteboard().getId().equals(whiteboardId)) {
            throw new ResourceNotFoundException("Question", "id", questionId);
        }
        if (question.isHidden() && membership.getRole() != Role.FACULTY) {
            throw new ResourceNotFoundException("Question", "id", questionId);
        }
        return questionResponseAssembler.toResponse(question, userId, membership.getRole() == Role.FACULTY);
    }

    private Question getQuestionEntityByIdAndWhiteboard(UUID questionId, UUID whiteboardId) {
        Question question = getQuestionById(questionId);
        if (!question.getWhiteboard().getId().equals(whiteboardId)) {
            throw new ResourceNotFoundException("Question", "id", questionId);
        }
        if (question.isHidden()) {
            throw new ResourceNotFoundException("Question", "id", questionId);
        }
        return question;
    }

    @Transactional
    public void closeQuestion(UUID facultyId, UUID whiteboardId, UUID questionId) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());
        if (question.getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Question is already closed");
        }

        question.setStatus(QuestionStatus.CLOSED);
        questionRepository.save(question);

        auditLogService.logAction(
                question.getWhiteboard().getId(), facultyId, AuditAction.QUESTION_CLOSED,
                "Question", questionId, QuestionStatus.OPEN.name(), QuestionStatus.CLOSED.name()
        );
        publishQuestionEvent(
                question.getWhiteboard().getId(),
                "QUESTION_UPDATED",
                questionResponseAssembler.toResponse(question, facultyId, true)
        );
    }

    @Transactional
    public QuestionResponse pinQuestion(UUID facultyId, UUID whiteboardId, UUID questionId) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());
        if (question.isPinned()) {
            throw new BadRequestException("Question is already pinned");
        }

        // Check pinned count < 3
        long pinnedCount = questionRepository.countByWhiteboardIdAndIsPinnedTrue(
                question.getWhiteboard().getId());
        if (pinnedCount >= 3) {
            throw new BadRequestException("Maximum of 3 pinned questions allowed per whiteboard");
        }

        question.setPinned(true);
        questionRepository.save(question);

        auditLogService.logAction(
                whiteboardId,
                facultyId,
                AuditAction.QUESTION_PINNED,
                "Question",
                questionId,
                "false",
                "true"
        );
        publishQuestionEvent(
                question.getWhiteboard().getId(),
                "QUESTION_UPDATED",
                questionResponseAssembler.toResponse(question, facultyId, true)
        );
        return questionResponseAssembler.toResponse(question, facultyId, true);
    }

    @Transactional
    public QuestionResponse unpinQuestion(UUID facultyId, UUID whiteboardId, UUID questionId) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());
        if (!question.isPinned()) {
            throw new BadRequestException("Question is not pinned");
        }

        question.setPinned(false);
        questionRepository.save(question);

        auditLogService.logAction(
                whiteboardId,
                facultyId,
                AuditAction.QUESTION_UNPINNED,
                "Question",
                questionId,
                "true",
                "false"
        );
        publishQuestionEvent(
                question.getWhiteboard().getId(),
                "QUESTION_UPDATED",
                questionResponseAssembler.toResponse(question, facultyId, true)
        );
        return questionResponseAssembler.toResponse(question, facultyId, true);
    }

    @Transactional
    public QuestionResponse forwardQuestion(UUID facultyId, UUID whiteboardId, UUID questionId, ForwardQuestionRequest req) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);

        whiteboardService.verifyFacultyRole(facultyId, question.getWhiteboard().getId());
        User targetFaculty = userRepository.findById(req.getTargetFacultyId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", req.getTargetFacultyId()));
        if (targetFaculty.getRole() != Role.FACULTY) {
            throw new BadRequestException("Question can only be forwarded to a faculty member");
        }

        // Create notification for target faculty
        notificationService.createAndSend(
                facultyId,
                targetFaculty.getId(),
                NotificationType.QUESTION_FORWARDED,
                "Question Forwarded",
                "A question has been forwarded to you: " + question.getTitle(),
                "Question",
                questionId,
                question.getWhiteboard().getId()
        );

        auditLogService.logAction(
                question.getWhiteboard().getId(), facultyId, AuditAction.QUESTION_FORWARDED,
                "Question", questionId, null, "Forwarded to: " + targetFaculty.getId()
        );
        return questionResponseAssembler.toResponse(question, facultyId, true);
    }

    private boolean isFaculty(UUID userId, UUID whiteboardId) {
        return whiteboardService.verifyMembership(userId, whiteboardId).getRole() == Role.FACULTY;
    }

    private void publishQuestionEvent(UUID whiteboardId, String type, Object payload) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", type);
        message.put("payload", payload);
        messagingTemplate.convertAndSend("/topic/whiteboard/" + whiteboardId + "/questions", message);
    }
}
