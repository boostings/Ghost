package com.ghost.service;

import com.ghost.dto.response.CommentResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.mapper.CommentMapper;
import com.ghost.model.Comment;
import com.ghost.model.Course;
import com.ghost.model.Question;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.CommentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private QuestionService questionService;

    @Mock
    private BookmarkService bookmarkService;

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private CommentMapper commentMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private CommentService commentService;

    private UUID questionId;
    private UUID commentId;
    private UUID facultyId;
    private User facultyUser;
    private Question question;
    private Comment comment;

    @BeforeEach
    void setUp() {
        questionId = UUID.randomUUID();
        commentId = UUID.randomUUID();
        facultyId = UUID.randomUUID();

        Whiteboard whiteboard = Whiteboard.builder()
                .id(UUID.randomUUID())
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
                .firstName("Question")
                .lastName("Author")
                .build();

        facultyUser = User.builder()
                .id(facultyId)
                .firstName("Faculty")
                .lastName("Verifier")
                .role(Role.FACULTY)
                .build();

        question = Question.builder()
                .id(questionId)
                .whiteboard(whiteboard)
                .author(author)
                .title("Question title")
                .status(QuestionStatus.OPEN)
                .build();

        comment = Comment.builder()
                .id(commentId)
                .question(question)
                .author(author)
                .body("Answer body")
                .isHidden(false)
                .build();
    }

    @Test
    void markAsVerifiedAnswerShouldAttachVerifierAndReturnUpdatedComment() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(commentMapper.toResponse(any(Comment.class), eq(facultyId))).thenReturn(
                CommentResponse.builder()
                        .id(commentId)
                        .questionId(questionId)
                        .authorId(comment.getAuthor().getId())
                        .authorName("Question Author")
                        .body("Answer body")
                        .isVerifiedAnswer(true)
                        .verifiedById(facultyId)
                        .verifiedByName("Faculty Verifier")
                        .build()
        );
        when(whiteboardService.verifyMembership(facultyId, question.getWhiteboard().getId())).thenReturn(
                WhiteboardMembership.builder()
                        .whiteboard(question.getWhiteboard())
                        .user(facultyUser)
                        .role(Role.FACULTY)
                        .build()
        );
        when(bookmarkService.getBookmarksByQuestionId(questionId)).thenReturn(List.of());

        CommentResponse response = commentService.markAsVerifiedAnswer(facultyId, questionId, commentId);

        assertThat(comment.getVerifiedBy()).isEqualTo(facultyUser);
        verify(questionService).markVerifiedAnswerAndClose(questionId, commentId);
        verify(auditLogService).logAction(
                eq(question.getWhiteboard().getId()),
                eq(facultyId),
                eq(com.ghost.model.enums.AuditAction.VERIFIED_ANSWER_PROVIDED),
                eq("Comment"),
                eq(commentId),
                eq(null),
                eq("Verified answer for question: " + question.getId())
        );
        assertThat(response.getVerifiedById()).isEqualTo(facultyId);
        assertThat(response.isVerifiedAnswer()).isTrue();
    }

    @Test
    void markAsVerifiedAnswerShouldRejectAlreadyVerifiedComment() {
        comment.setVerifiedBy(facultyUser);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(whiteboardService.verifyMembership(facultyId, question.getWhiteboard().getId())).thenReturn(
                WhiteboardMembership.builder()
                        .whiteboard(question.getWhiteboard())
                        .user(facultyUser)
                        .role(Role.FACULTY)
                        .build()
        );

        assertThatThrownBy(() -> commentService.markAsVerifiedAnswer(facultyId, questionId, commentId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already marked as verified answer");

        verify(commentRepository, never()).save(any(Comment.class));
    }
}
