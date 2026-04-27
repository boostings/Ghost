package com.ghost.service;

import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.model.Course;
import com.ghost.model.FacultyUser;
import com.ghost.model.Question;
import com.ghost.model.Semester;
import com.ghost.model.Topic;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.TopicRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private TopicRepository topicRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private QuestionResponseAssembler questionResponseAssembler;

    @Mock
    private SearchService searchService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @InjectMocks
    private QuestionService questionService;

    private UUID whiteboardId;
    private UUID questionId;
    private UUID facultyId;
    private UUID studentId;
    private Question question;
    private Whiteboard whiteboard;
    private User author;

    @BeforeEach
    void setUp() {
        whiteboardId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        facultyId = UUID.randomUUID();
        studentId = UUID.randomUUID();

        whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .course(Course.builder()
                        .courseCode("IT326")
                        .courseName("Software Engineering")
                        .section("001")
                        .build())
                .semester(Semester.builder()
                        .name("Fall 2026")
                        .build())
                .build();

        author = User.builder()
                .id(studentId)
                .firstName("Taylor")
                .lastName("Student")
                .build();

        question = Question.builder()
                .id(questionId)
                .whiteboard(whiteboard)
                .author(author)
                .title("Question title")
                .body("Question body")
                .status(QuestionStatus.OPEN)
                .isPinned(false)
                .isHidden(false)
                .build();
    }

    @Test
    void createQuestionShouldPersistTopicAuditAndPublishEvent() {
        UUID topicId = UUID.randomUUID();
        User memberUser = User.builder()
                .id(studentId)
                .firstName("Taylor")
                .lastName("Student")
                .build();
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(memberUser)
                .role(Role.STUDENT)
                .build();
        Topic topic = Topic.builder()
                .id(topicId)
                .name("Homework")
                .whiteboard(whiteboard)
                .build();
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .topicId(topicId)
                .topicName("Homework")
                .status(QuestionStatus.OPEN)
                .build();

        when(whiteboardService.verifyMembership(studentId, whiteboardId)).thenReturn(membership);
        when(whiteboardService.getWhiteboardById(whiteboardId)).thenReturn(whiteboard);
        when(topicRepository.findByIdAndWhiteboardId(topicId, whiteboardId)).thenReturn(Optional.of(topic));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> {
            Question saved = invocation.getArgument(0);
            saved.setId(questionId);
            return saved;
        });
        when(questionResponseAssembler.toResponse(any(Question.class), eq(studentId), eq(false))).thenReturn(response);

        QuestionResponse result = questionService.createQuestion(
                studentId,
                whiteboardId,
                CreateQuestionRequest.builder()
                        .title("Need help with assignment 2")
                        .body("What does boundary value analysis mean?")
                        .topicId(topicId)
                        .build()
        );

        assertThat(result).isEqualTo(response);
        verify(auditLogService).logAction(
                whiteboardId,
                studentId,
                AuditAction.QUESTION_CREATED,
                "Question",
                questionId,
                null,
                "Need help with assignment 2"
        );
        verify(messagingTemplate).convertAndSend(
                eq("/topic/whiteboard/" + whiteboardId + "/questions"),
                any(Map.class)
        );
    }

    @Test
    void editQuestionShouldUpdateFieldsAuditAndPublishEvent() {
        UUID topicId = UUID.randomUUID();
        Topic topic = Topic.builder()
                .id(topicId)
                .name("Exam")
                .whiteboard(whiteboard)
                .build();
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(author)
                .role(Role.STUDENT)
                .build();
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .title("Updated title")
                .body("Updated body")
                .topicId(topicId)
                .status(QuestionStatus.OPEN)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(studentId, whiteboardId)).thenReturn(membership);
        when(topicRepository.findByIdAndWhiteboardId(topicId, whiteboardId)).thenReturn(Optional.of(topic));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(questionResponseAssembler.toResponse(question, studentId, false)).thenReturn(response);

        QuestionResponse result = questionService.editQuestion(
                studentId,
                whiteboardId,
                questionId,
                EditQuestionRequest.builder()
                        .title("Updated title")
                        .body("Updated body")
                        .topicId(topicId)
                        .build()
        );

        assertThat(result).isEqualTo(response);
        assertThat(question.getTitle()).isEqualTo("Updated title");
        assertThat(question.getBody()).isEqualTo("Updated body");
        assertThat(question.getTopic()).isEqualTo(topic);
        verify(auditLogService).logAction(
                whiteboardId,
                studentId,
                AuditAction.QUESTION_EDITED,
                "Question",
                questionId,
                "title=Question title; body=Question body",
                "title=Updated title; body=Updated body"
        );
        verify(messagingTemplate).convertAndSend(
                eq("/topic/whiteboard/" + whiteboardId + "/questions"),
                any(Map.class)
        );
    }

    @Test
    void editQuestionShouldRejectNonAuthor() {
        UUID otherUserId = UUID.randomUUID();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(otherUserId, whiteboardId)).thenReturn(
                WhiteboardMembership.builder()
                        .whiteboard(whiteboard)
                        .user(User.builder().id(otherUserId).build())
                        .role(Role.STUDENT)
                        .build()
        );

        assertThatThrownBy(() -> questionService.editQuestion(
                otherUserId,
                whiteboardId,
                questionId,
                EditQuestionRequest.builder().title("Nope").build()
        ))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Only the author");
    }

    @Test
    void deleteQuestionShouldAllowFacultyAndPublishDeleteEvent() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));

        questionService.deleteQuestion(facultyId, whiteboardId, questionId);

        verify(whiteboardService).verifyMembership(facultyId, whiteboardId);
        verify(whiteboardService).verifyFacultyRole(facultyId, whiteboardId);
        verify(auditLogService).logAction(
                whiteboardId,
                facultyId,
                AuditAction.QUESTION_DELETED,
                "Question",
                questionId,
                "title=Question title; body=Question body",
                null
        );
        verify(questionRepository).delete(question);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/whiteboard/" + whiteboardId + "/questions"),
                any(Map.class)
        );
    }

    @Test
    void deleteQuestionShouldRejectNonAuthorNonFaculty() {
        UUID otherUserId = UUID.randomUUID();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyFacultyRole(otherUserId, whiteboardId))
                .thenThrow(new UnauthorizedException("No faculty role"));

        assertThatThrownBy(() -> questionService.deleteQuestion(otherUserId, whiteboardId, questionId))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Only the author or faculty");

        verify(questionRepository, never()).delete(any(Question.class));
    }

    @Test
    void closeQuestionShouldRejectAlreadyClosedQuestion() {
        question.setStatus(QuestionStatus.CLOSED);
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));

        assertThatThrownBy(() -> questionService.closeQuestion(facultyId, whiteboardId, questionId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already closed");

        verify(questionRepository, never()).save(any(Question.class));
    }

    @Test
    void pinQuestionShouldRejectWhenPinnedLimitReached() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(questionRepository.countByWhiteboardIdAndIsPinnedTrueAndIsHiddenFalse(whiteboardId)).thenReturn(3L);

        assertThatThrownBy(() -> questionService.pinQuestion(facultyId, whiteboardId, questionId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Maximum of 3 pinned questions");

        verify(questionRepository, never()).save(any(Question.class));
    }

    @Test
    void unpinQuestionShouldRejectWhenQuestionIsNotPinned() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));

        assertThatThrownBy(() -> questionService.unpinQuestion(facultyId, whiteboardId, questionId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not pinned");

        verify(questionRepository, never()).save(any(Question.class));
    }

    @Test
    void getQuestionByIdShouldVerifyMembershipAndReturnMappedResponse() {
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(question.getWhiteboard())
                .user(author)
                .role(Role.STUDENT)
                .build();
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.OPEN)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(studentId, whiteboardId)).thenReturn(membership);
        when(questionResponseAssembler.toResponse(question, studentId, false)).thenReturn(response);

        QuestionResponse result = questionService.getQuestionById(studentId, questionId);

        assertThat(result).isEqualTo(response);
        verify(whiteboardService).verifyMembership(studentId, whiteboardId);
        verify(questionResponseAssembler).toResponse(question, studentId, false);
    }

    @Test
    void getQuestionByIdShouldHideHiddenQuestionFromStudents() {
        question.setHidden(true);
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(studentId, whiteboardId)).thenReturn(
                WhiteboardMembership.builder()
                        .whiteboard(whiteboard)
                        .user(author)
                        .role(Role.STUDENT)
                        .build()
        );

        assertThatThrownBy(() -> questionService.getQuestionById(studentId, questionId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Question");
    }

    @Test
    void getQuestionByIdAndWhiteboardShouldRejectWrongWhiteboard() {
        UUID differentWhiteboardId = UUID.randomUUID();
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(studentId, differentWhiteboardId)).thenReturn(
                WhiteboardMembership.builder()
                        .whiteboard(Whiteboard.builder().id(differentWhiteboardId).build())
                        .user(author)
                        .role(Role.STUDENT)
                        .build()
        );

        assertThatThrownBy(() -> questionService.getQuestionByIdAndWhiteboard(studentId, questionId, differentWhiteboardId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Question");
    }

    @Test
    void getMyQuestionsShouldScopeAuthorQuestionsToVisibleCurrentMemberships() {
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.OPEN)
                .build();
        PageRequest pageable = PageRequest.of(0, 20);

        when(whiteboardMembershipRepository.findWhiteboardIdsByUserId(studentId))
                .thenReturn(List.of(whiteboardId));
        when(questionRepository.findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseOrderByCreatedAtDesc(
                studentId, List.of(whiteboardId), pageable))
                .thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, studentId, false)).thenReturn(response);

        Page<QuestionResponse> result = questionService.getMyQuestions(
                studentId,
                "AUTHOR",
                null,
                pageable
        );

        assertThat(result.getContent()).containsExactly(response);
        verify(questionRepository).findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseOrderByCreatedAtDesc(
                studentId,
                List.of(whiteboardId),
                pageable
        );
    }

    @Test
    void getQuestionsByAuthorShouldReturnEmptyWhenAuthorHasNoCurrentMemberships() {
        PageRequest pageable = PageRequest.of(0, 20);

        when(whiteboardMembershipRepository.findWhiteboardIdsByUserId(studentId)).thenReturn(List.of());

        Page<QuestionResponse> result = questionService.getQuestionsByAuthor(studentId, pageable);

        assertThat(result).isEmpty();
        verify(questionRepository, never()).findByAuthorIdOrderByCreatedAtDesc(any(), any());
    }

    @Test
    void getMyQuestionsAuthorAwaitingFiltersToUnverifiedOnly() {
        PageRequest pageable = PageRequest.of(0, 20);
        QuestionResponse response = QuestionResponse.builder().id(questionId).build();

        when(whiteboardMembershipRepository.findWhiteboardIdsByUserId(studentId))
                .thenReturn(List.of(whiteboardId));
        when(questionRepository
                .findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNullOrderByCreatedAtDesc(
                        studentId, List.of(whiteboardId), pageable))
                .thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, studentId, false)).thenReturn(response);

        Page<QuestionResponse> result =
                questionService.getMyQuestions(studentId, "AUTHOR", "AWAITING", pageable);

        assertThat(result.getContent()).containsExactly(response);
    }

    @Test
    void getMyQuestionsAuthorAnsweredFiltersToVerifiedOnly() {
        PageRequest pageable = PageRequest.of(0, 20);
        QuestionResponse response = QuestionResponse.builder().id(questionId).build();

        when(whiteboardMembershipRepository.findWhiteboardIdsByUserId(studentId))
                .thenReturn(List.of(whiteboardId));
        when(questionRepository
                .findByAuthorIdAndWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNotNullOrderByUpdatedAtDesc(
                        studentId, List.of(whiteboardId), pageable))
                .thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, studentId, false)).thenReturn(response);

        Page<QuestionResponse> result =
                questionService.getMyQuestions(studentId, "AUTHOR", "ANSWERED", pageable);

        assertThat(result.getContent()).containsExactly(response);
    }

    @Test
    void getMyQuestionsAuthorEmptyMembershipsReturnsEmptyPage() {
        PageRequest pageable = PageRequest.of(0, 20);
        when(whiteboardMembershipRepository.findWhiteboardIdsByUserId(studentId))
                .thenReturn(List.of());

        Page<QuestionResponse> result =
                questionService.getMyQuestions(studentId, null, null, pageable);

        assertThat(result).isEmpty();
    }

    @Test
    void getMyQuestionsTeachingDefaultsReturnsAllVisibleInFacultyWhiteboards() {
        PageRequest pageable = PageRequest.of(0, 20);
        QuestionResponse response = QuestionResponse.builder().id(questionId).build();

        when(whiteboardMembershipRepository.findFacultyWhiteboardIdsByUserId(facultyId))
                .thenReturn(List.of(whiteboardId));
        when(questionRepository
                .findByWhiteboardIdInAndIsHiddenFalseOrderByCreatedAtDesc(
                        List.of(whiteboardId), pageable))
                .thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        Page<QuestionResponse> result =
                questionService.getMyQuestions(facultyId, "teaching", null, pageable);

        assertThat(result.getContent()).containsExactly(response);
    }

    @Test
    void getMyQuestionsTeachingAwaitingFiltersToUnverifiedOnly() {
        PageRequest pageable = PageRequest.of(0, 20);
        QuestionResponse response = QuestionResponse.builder().id(questionId).build();

        when(whiteboardMembershipRepository.findFacultyWhiteboardIdsByUserId(facultyId))
                .thenReturn(List.of(whiteboardId));
        when(questionRepository
                .findByWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNullOrderByCreatedAtDesc(
                        List.of(whiteboardId), pageable))
                .thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        Page<QuestionResponse> result =
                questionService.getMyQuestions(facultyId, "TEACHING", "AWAITING", pageable);

        assertThat(result.getContent()).containsExactly(response);
    }

    @Test
    void getMyQuestionsTeachingAnsweredFiltersToVerifiedOnly() {
        PageRequest pageable = PageRequest.of(0, 20);
        QuestionResponse response = QuestionResponse.builder().id(questionId).build();

        when(whiteboardMembershipRepository.findFacultyWhiteboardIdsByUserId(facultyId))
                .thenReturn(List.of(whiteboardId));
        when(questionRepository
                .findByWhiteboardIdInAndIsHiddenFalseAndVerifiedAnswerIdIsNotNullOrderByUpdatedAtDesc(
                        List.of(whiteboardId), pageable))
                .thenReturn(new PageImpl<>(List.of(question), pageable, 1));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        Page<QuestionResponse> result =
                questionService.getMyQuestions(facultyId, "TEACHING", "ANSWERED", pageable);

        assertThat(result.getContent()).containsExactly(response);
    }

    @Test
    void getMyQuestionsTeachingEmptyMembershipsReturnsEmptyPage() {
        PageRequest pageable = PageRequest.of(0, 20);
        when(whiteboardMembershipRepository.findFacultyWhiteboardIdsByUserId(facultyId))
                .thenReturn(List.of());

        Page<QuestionResponse> result =
                questionService.getMyQuestions(facultyId, "TEACHING", null, pageable);

        assertThat(result).isEmpty();
    }

    @Test
    void closeQuestionShouldCloseOpenQuestionAuditAndPublish() {
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.CLOSED)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        questionService.closeQuestion(facultyId, whiteboardId, questionId);

        assertThat(question.getStatus()).isEqualTo(QuestionStatus.CLOSED);
        verify(auditLogService).logAction(
                whiteboardId,
                facultyId,
                AuditAction.QUESTION_CLOSED,
                "Question",
                questionId,
                QuestionStatus.OPEN.name(),
                QuestionStatus.CLOSED.name()
        );
        verify(messagingTemplate).convertAndSend(
                eq("/topic/whiteboard/" + whiteboardId + "/questions"),
                any(Map.class)
        );
    }

    @Test
    void pinQuestionShouldPinAuditAndReturnResponse() {
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.OPEN)
                .isPinned(true)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(questionRepository.countByWhiteboardIdAndIsPinnedTrueAndIsHiddenFalse(whiteboardId)).thenReturn(2L);
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        QuestionResponse result = questionService.pinQuestion(facultyId, whiteboardId, questionId);

        assertThat(result.isPinned()).isTrue();
        assertThat(question.isPinned()).isTrue();
        verify(auditLogService).logAction(
                whiteboardId,
                facultyId,
                AuditAction.QUESTION_PINNED,
                "Question",
                questionId,
                "false",
                "true"
        );
    }

    @Test
    void unpinQuestionShouldUnpinAuditAndReturnResponse() {
        question.setPinned(true);
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.OPEN)
                .isPinned(false)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        QuestionResponse result = questionService.unpinQuestion(facultyId, whiteboardId, questionId);

        assertThat(result.isPinned()).isFalse();
        assertThat(question.isPinned()).isFalse();
        verify(auditLogService).logAction(
                whiteboardId,
                facultyId,
                AuditAction.QUESTION_UNPINNED,
                "Question",
                questionId,
                "true",
                "false"
        );
    }

    @Test
    void forwardQuestionShouldNotifyFacultyAndReturnResponse() {
        UUID targetFacultyId = UUID.randomUUID();
        User targetFaculty = FacultyUser.builder()
                .id(targetFacultyId)
                .email("faculty@ilstu.edu")
                .build();
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.OPEN)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(userRepository.findById(targetFacultyId)).thenReturn(Optional.of(targetFaculty));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        QuestionResponse result = questionService.forwardQuestion(
                facultyId,
                whiteboardId,
                questionId,
                ForwardQuestionRequest.builder()
                        .targetFacultyId(targetFacultyId)
                        .build()
        );

        assertThat(result).isEqualTo(response);
        verify(notificationService).createAndSend(
                facultyId,
                targetFacultyId,
                NotificationType.QUESTION_FORWARDED,
                "Question Forwarded",
                "A question has been forwarded to you: " + question.getTitle(),
                "Question",
                questionId,
                whiteboardId
        );
        verify(auditLogService).logAction(
                whiteboardId,
                facultyId,
                AuditAction.QUESTION_FORWARDED,
                "Question",
                questionId,
                null,
                "Forwarded to: " + targetFacultyId
        );
    }

    @Test
    void AC3_AC6_markVerifiedAnswerAndCloseShouldPublishQuestionUpdate() {
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.CLOSED)
                .verifiedAnswerId(UUID.randomUUID())
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(questionResponseAssembler.toResponse(question, facultyId, true)).thenReturn(response);

        QuestionResponse result = questionService.markVerifiedAnswerAndClose(
                facultyId,
                questionId,
                response.getVerifiedAnswerId()
        );

        assertThat(question.getStatus()).isEqualTo(QuestionStatus.CLOSED);
        assertThat(question.getVerifiedAnswerId()).isEqualTo(response.getVerifiedAnswerId());
        assertThat(result).isEqualTo(response);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/whiteboard/" + whiteboardId + "/questions"),
                any(Map.class)
        );
    }
}
