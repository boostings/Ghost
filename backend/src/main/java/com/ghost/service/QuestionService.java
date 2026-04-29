package com.ghost.service;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.dto.response.CommentResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ForbiddenException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.model.Bookmark;
import com.ghost.model.Comment;
import com.ghost.model.Question;
import com.ghost.model.Topic;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.TopicRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.util.CommentEditPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final CommentRepository commentRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;
    private final WhiteboardService whiteboardService;
    private final AuditLogService auditLogService;
    private final NotificationFactory notificationFactory;
    private final QuestionResponseAssembler questionResponseAssembler;
    private final CommentResponseAssembler commentResponseAssembler;
    private final SearchService searchService;
    private final SimpMessagingTemplate messagingTemplate;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final BookmarkService bookmarkService;

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
        notifyFacultyOfNewQuestion(membership.getUser(), question);
        return response;
    }

    private void notifyFacultyOfNewQuestion(User author, Question question) {
        List<WhiteboardMembership> memberships =
                whiteboardMembershipRepository.findByWhiteboardId(question.getWhiteboard().getId());
        for (WhiteboardMembership whiteboardMembership : memberships) {
            if (whiteboardMembership.getRole() == Role.FACULTY) {
                notificationFactory.sendQuestionCreatedNotification(
                        author,
                        whiteboardMembership.getUser(),
                        question
                );
            }
        }
    }

    @Transactional
    public QuestionResponse editQuestion(UUID userId, UUID whiteboardId, UUID questionId, EditQuestionRequest req) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);
        whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());

        // Verify author
        if (!question.getAuthor().getId().equals(userId)) {
            throw new ForbiddenException("Only the author can edit this question");
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
            } catch (UnauthorizedException | ForbiddenException e) {
                throw new ForbiddenException("Only the author or faculty can delete this question");
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
    public Page<QuestionResponse> getQuestionsByAuthor(UUID authorId, Pageable pageable) {
        List<UUID> whiteboardIds = whiteboardMembershipRepository.findWhiteboardIdsByUserId(authorId);
        if (whiteboardIds.isEmpty()) {
            return Page.empty(pageable);
        }
        return questionRepository
                .findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseOrderByCreatedAtDesc(authorId, whiteboardIds, pageable)
                .map(question -> questionResponseAssembler.toResponse(question, authorId, false));
    }

    /**
     * Personal home strips: returns the current user's questions or — for faculty — questions
     * across the whiteboards they teach, optionally filtered by answered/unanswered.
     *
     * @param userId the current user
     * @param role   "AUTHOR" → questions I asked; "TEACHING" → questions in classes I'm faculty in
     * @param status "AWAITING" (no verified answer) | "ANSWERED" (has verified answer) | null/anything → no filter
     */
    @Transactional(readOnly = true)
    public Page<QuestionResponse> getMyQuestions(UUID userId, String role, String status, Pageable pageable) {
        String normalizedRole = role == null ? "AUTHOR" : role.toUpperCase();
        String normalizedStatus = status == null ? null : status.toUpperCase();

        Page<Question> page;
        if ("TEACHING".equals(normalizedRole)) {
            List<UUID> facultyWhiteboardIds = whiteboardMembershipRepository.findFacultyWhiteboardIdsByUserId(userId);
            if (facultyWhiteboardIds.isEmpty()) {
                return Page.empty(pageable);
            }
            if ("AWAITING".equals(normalizedStatus)) {
                page = questionRepository.findByWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNullOrderByCreatedAtDesc(
                        facultyWhiteboardIds, pageable);
            } else if ("ANSWERED".equals(normalizedStatus)) {
                page = questionRepository.findByWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNotNullOrderByUpdatedAtDesc(
                        facultyWhiteboardIds, pageable);
            } else {
                page = questionRepository.findByWhiteboardIdInAndIsHiddenFalseOrderByCreatedAtDesc(
                        facultyWhiteboardIds, pageable);
            }
            return page.map(question -> questionResponseAssembler.toResponse(question, userId, true));
        }

        // Default: AUTHOR
        List<UUID> studentWhiteboardIds = whiteboardMembershipRepository.findWhiteboardIdsByUserId(userId);
        if (studentWhiteboardIds.isEmpty()) {
            return Page.empty(pageable);
        }
        if ("AWAITING".equals(normalizedStatus)) {
            page = questionRepository
                    .findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNullOrderByCreatedAtDesc(
                            userId, studentWhiteboardIds, pageable);
        } else if ("ANSWERED".equals(normalizedStatus)) {
            page = questionRepository
                    .findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNotNullOrderByUpdatedAtDesc(
                            userId, studentWhiteboardIds, pageable);
        } else {
            page = questionRepository.findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseOrderByCreatedAtDesc(
                    userId, studentWhiteboardIds, pageable);
        }
        return page.map(question -> questionResponseAssembler.toResponse(question, userId, false));
    }

    @Transactional(readOnly = true)
    public long countQuestionsByAuthor(UUID authorId) {
        List<UUID> whiteboardIds = whiteboardMembershipRepository.findWhiteboardIdsByUserId(authorId);
        if (whiteboardIds.isEmpty()) {
            return 0;
        }
        return questionRepository.countByAuthorIdAndWhiteboardIdInAndIsHiddenFalse(authorId, whiteboardIds);
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

        // Check pinned count < 3 (visible questions only — exclude soft-hidden)
        long pinnedCount = questionRepository.countByWhiteboardIdAndIsPinnedTrueAndIsHiddenFalse(
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

        WhiteboardMembership facultyMembership = whiteboardService.verifyFacultyRole(
                facultyId,
                question.getWhiteboard().getId()
        );
        User targetFaculty = userRepository.findById(req.getTargetFacultyId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", req.getTargetFacultyId()));
        if (!targetFaculty.isFaculty()) {
            throw new BadRequestException("Question can only be forwarded to a faculty member");
        }

        notificationFactory.sendQuestionForwardedNotification(facultyMembership.getUser(), targetFaculty, question);

        auditLogService.logAction(
                question.getWhiteboard().getId(), facultyId, AuditAction.QUESTION_FORWARDED,
                "Question", questionId, null, "Forwarded to: " + targetFaculty.getId()
        );
        return questionResponseAssembler.toResponse(question, facultyId, true);
    }

    @Transactional
    public CommentResponse createComment(UUID userId, UUID questionId, CreateCommentRequest req) {
        Question question = getQuestionById(questionId);
        return createCommentForQuestion(userId, question, req);
    }

    @Transactional
    public CommentResponse createComment(UUID userId, UUID whiteboardId, UUID questionId, CreateCommentRequest req) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);
        return createCommentForQuestion(userId, question, req);
    }

    private CommentResponse createCommentForQuestion(UUID userId, Question question, CreateCommentRequest req) {
        if (question.getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Cannot add comments to a closed question");
        }
        if (question.isHidden()) {
            throw new BadRequestException("Cannot add comments to hidden content");
        }

        WhiteboardMembership membership = whiteboardService.verifyMembership(
                userId, question.getWhiteboard().getId());

        Comment comment = Comment.builder()
                .question(question)
                .author(membership.getUser())
                .body(req.getBody())
                .editDeadline(LocalDateTime.now().plus(CommentEditPolicy.EDIT_WINDOW))
                .build();

        comment = commentRepository.save(comment);

        auditLogService.logAction(
                question.getWhiteboard().getId(), userId, AuditAction.COMMENT_CREATED,
                "Comment", comment.getId(), null, comment.getBody()
        );

        notificationFactory.sendCommentAddedNotification(membership.getUser(), question);

        CommentResponse response = commentResponseAssembler.toResponse(comment, userId);
        publishCommentEvent(question.getId(), "COMMENT_CREATED", response);
        return response;
    }

    @Transactional
    public CommentResponse editComment(UUID userId, UUID questionId, UUID commentId, EditCommentRequest req) {
        Comment comment = getCommentByIdAndQuestion(commentId, questionId);
        return editCommentForEntity(userId, questionId, commentId, req, comment);
    }

    @Transactional
    public CommentResponse editComment(
            UUID userId,
            UUID whiteboardId,
            UUID questionId,
            UUID commentId,
            EditCommentRequest req
    ) {
        Comment comment = getCommentByIdAndQuestionAndWhiteboard(commentId, questionId, whiteboardId);
        return editCommentForEntity(userId, questionId, commentId, req, comment);
    }

    private CommentResponse editCommentForEntity(
            UUID userId,
            UUID questionId,
            UUID commentId,
            EditCommentRequest req,
            Comment comment
    ) {
        whiteboardService.verifyMembership(userId, comment.getQuestion().getWhiteboard().getId());

        if (!comment.getAuthor().getId().equals(userId)) {
            throw new ForbiddenException("Only the author can edit this comment");
        }

        if (!CommentEditPolicy.isEditable(comment, LocalDateTime.now())) {
            throw new BadRequestException("Edit deadline has passed. Comments can only be edited within 1 hour.");
        }
        if (comment.getQuestion().getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Cannot edit a comment on a closed question");
        }

        String oldBody = comment.getBody();

        comment.setBody(req.getBody());
        comment = commentRepository.save(comment);

        auditLogService.logAction(
                comment.getQuestion().getWhiteboard().getId(), userId, AuditAction.COMMENT_EDITED,
                "Comment", commentId, oldBody, comment.getBody()
        );

        CommentResponse response = commentResponseAssembler.toResponse(comment, userId);
        publishCommentEvent(questionId, "COMMENT_EDITED", response);
        return response;
    }

    @Transactional
    public void deleteComment(UUID userId, UUID questionId, UUID commentId) {
        Comment comment = getCommentByIdAndQuestion(commentId, questionId);
        deleteCommentEntity(userId, questionId, commentId, comment);
    }

    @Transactional
    public void deleteComment(UUID userId, UUID whiteboardId, UUID questionId, UUID commentId) {
        Comment comment = getCommentByIdAndQuestionAndWhiteboard(commentId, questionId, whiteboardId);
        deleteCommentEntity(userId, questionId, commentId, comment);
    }

    private void deleteCommentEntity(UUID userId, UUID questionId, UUID commentId, Comment comment) {
        whiteboardService.verifyMembership(userId, comment.getQuestion().getWhiteboard().getId());

        boolean isAuthor = comment.getAuthor().getId().equals(userId);

        if (!isAuthor) {
            try {
                whiteboardService.verifyFacultyRole(userId, comment.getQuestion().getWhiteboard().getId());
            } catch (UnauthorizedException | ForbiddenException e) {
                throw new ForbiddenException("Only the author or faculty can delete this comment");
            }
        }

        if (comment.getQuestion().getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Cannot delete a comment on a closed question");
        }
        if (commentId.equals(comment.getQuestion().getVerifiedAnswerId())) {
            throw new BadRequestException("Cannot delete a verified answer");
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
    public CommentResponse markAsVerifiedAnswer(UUID facultyId, UUID questionId, UUID commentId) {
        Comment comment = getCommentByIdAndQuestion(commentId, questionId);
        return markCommentAsVerifiedAnswer(facultyId, questionId, commentId, comment);
    }

    @Transactional
    public CommentResponse markAsVerifiedAnswer(UUID facultyId, UUID whiteboardId, UUID questionId, UUID commentId) {
        Comment comment = getCommentByIdAndQuestionAndWhiteboard(commentId, questionId, whiteboardId);
        return markCommentAsVerifiedAnswer(facultyId, questionId, commentId, comment);
    }

    private CommentResponse markCommentAsVerifiedAnswer(
            UUID facultyId,
            UUID questionId,
            UUID commentId,
            Comment comment
    ) {
        Question question = comment.getQuestion();
        WhiteboardMembership facultyMembership = whiteboardService.verifyMembership(
                facultyId, question.getWhiteboard().getId());

        if (facultyMembership.getRole() != Role.FACULTY) {
            throw new ForbiddenException("Only faculty can mark a verified answer");
        }
        if (question.getStatus() == QuestionStatus.CLOSED) {
            throw new BadRequestException("Question is already closed");
        }
        if (question.getVerifiedAnswerId() != null) {
            throw new BadRequestException("Question already has a verified answer");
        }
        if (comment.getVerifiedBy() != null) {
            throw new BadRequestException("Comment is already marked as verified answer");
        }
        if (comment.isHidden()) {
            throw new BadRequestException("Cannot verify a hidden comment");
        }

        comment.setVerifiedBy(facultyMembership.getUser());
        commentRepository.save(comment);
        CommentResponse updatedComment = commentResponseAssembler.toResponse(comment, facultyId);
        publishCommentEvent(questionId, "COMMENT_UPDATED", updatedComment);

        markVerifiedAnswerAndClose(facultyId, question.getId(), commentId);

        auditLogService.logAction(
                question.getWhiteboard().getId(),
                facultyId,
                AuditAction.QUESTION_CLOSED,
                "Question",
                question.getId(),
                QuestionStatus.OPEN.name(),
                QuestionStatus.CLOSED.name()
        );

        auditLogService.logAction(
                question.getWhiteboard().getId(), facultyId, AuditAction.VERIFIED_ANSWER_PROVIDED,
                "Comment", commentId, null, "Verified answer for question: " + question.getId()
        );

        notificationFactory.sendQuestionAnsweredNotification(facultyMembership.getUser(), question);

        List<Bookmark> bookmarks = bookmarkService.getBookmarksByQuestionId(question.getId());
        for (Bookmark bookmark : bookmarks) {
            notificationFactory.sendBookmarkedQuestionAnsweredNotification(
                    facultyMembership.getUser(),
                    question,
                    bookmark.getUser()
            );
        }

        return updatedComment;
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getCommentsByQuestion(UUID userId, UUID questionId, Pageable pageable) {
        Question question = getQuestionById(questionId);
        return getCommentsForQuestion(userId, questionId, pageable, question);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getCommentsByQuestion(
            UUID userId,
            UUID whiteboardId,
            UUID questionId,
            Pageable pageable
    ) {
        Question question = getQuestionEntityByIdAndWhiteboard(questionId, whiteboardId);
        return getCommentsForQuestion(userId, questionId, pageable, question);
    }

    private Page<CommentResponse> getCommentsForQuestion(
            UUID userId,
            UUID questionId,
            Pageable pageable,
            Question question
    ) {
        whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());
        if (question.isHidden()) {
            throw new ResourceNotFoundException("Question", "id", questionId);
        }
        return commentRepository.findByQuestionIdAndIsHiddenFalseOrderByCreatedAtAsc(questionId, pageable)
                .map(comment -> commentResponseAssembler.toResponse(comment, userId));
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

    private Comment getCommentByIdAndQuestionAndWhiteboard(UUID commentId, UUID questionId, UUID whiteboardId) {
        Comment comment = getCommentByIdAndQuestion(commentId, questionId);
        if (!comment.getQuestion().getWhiteboard().getId().equals(whiteboardId)) {
            throw new ResourceNotFoundException("Comment", "id", commentId);
        }
        return comment;
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
