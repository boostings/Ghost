package com.ghost.service;

import com.ghost.exception.BadRequestException;
import com.ghost.model.Course;
import com.ghost.model.Question;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.TopicRepository;
import com.ghost.mapper.QuestionMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
    private WhiteboardService whiteboardService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private QuestionMapper questionMapper;

    @Mock
    private SearchService searchService;

    @InjectMocks
    private QuestionService questionService;

    private UUID whiteboardId;
    private UUID questionId;
    private UUID facultyId;
    private Question question;

    @BeforeEach
    void setUp() {
        whiteboardId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        facultyId = UUID.randomUUID();

        Whiteboard whiteboard = Whiteboard.builder()
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

        User author = User.builder()
                .id(UUID.randomUUID())
                .role(Role.STUDENT)
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
        when(questionRepository.countByWhiteboardIdAndIsPinnedTrue(whiteboardId)).thenReturn(3L);

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
        UUID userId = UUID.randomUUID();
        User member = User.builder()
                .id(userId)
                .role(Role.STUDENT)
                .build();
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(question.getWhiteboard())
                .user(member)
                .role(Role.STUDENT)
                .build();
        QuestionResponse response = QuestionResponse.builder()
                .id(questionId)
                .whiteboardId(whiteboardId)
                .status(QuestionStatus.OPEN)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(userId, whiteboardId)).thenReturn(membership);
        when(questionMapper.toResponse(question, userId, false)).thenReturn(response);

        QuestionResponse result = questionService.getQuestionById(userId, questionId);

        assertThat(result).isEqualTo(response);
        verify(whiteboardService).verifyMembership(userId, whiteboardId);
        verify(questionMapper).toResponse(question, userId, false);
    }
}
