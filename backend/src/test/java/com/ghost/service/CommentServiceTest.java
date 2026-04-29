package com.ghost.service;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.response.CommentResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Comment;
import com.ghost.model.Course;
import com.ghost.model.FacultyUser;
import com.ghost.model.Bookmark;
import com.ghost.model.Question;
import com.ghost.model.Semester;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private TopicRepository topicRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BookmarkService bookmarkService;

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationFactory notificationFactory;

    @Mock
    private QuestionResponseAssembler questionResponseAssembler;

    @Mock
    private CommentResponseAssembler commentResponseAssembler;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private SearchService searchService;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @InjectMocks
    private QuestionService commentService;

    private UUID questionId;
    private UUID commentId;
    private UUID facultyId;
    private UUID authorId;
    private User facultyUser;
    private User authorUser;
    private Question question;
    private Comment comment;
    private Whiteboard whiteboard;

    @BeforeEach
    void setUp() {
        questionId = UUID.randomUUID();
        commentId = UUID.randomUUID();
        facultyId = UUID.randomUUID();
        authorId = UUID.randomUUID();

        whiteboard = Whiteboard.builder()
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

        authorUser = User.builder()
                .id(authorId)
                .firstName("Question")
                .lastName("Author")
                .build();

        facultyUser = FacultyUser.builder()
                .id(facultyId)
                .firstName("Faculty")
                .lastName("Verifier")
                .build();

        question = Question.builder()
                .id(questionId)
                .whiteboard(whiteboard)
                .author(authorUser)
                .title("Question title")
                .status(QuestionStatus.OPEN)
                .build();

        comment = Comment.builder()
                .id(commentId)
                .question(question)
                .author(authorUser)
                .body("Answer body")
                .isHidden(false)
                .editDeadline(LocalDateTime.now().plusMinutes(10))
                .build();
    }

    @Test
    void createCommentShouldPersistAuditNotifyAndPublish() {
        LocalDateTime beforeCreate = LocalDateTime.now();
        UUID commenterId = UUID.randomUUID();
        User commenter = User.builder()
                .id(commenterId)
                .firstName("Casey")
                .lastName("Commenter")
                .build();
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(commenter)
                .role(Role.STUDENT)
                .build();
        CommentResponse response = CommentResponse.builder()
                .id(commentId)
                .questionId(questionId)
                .authorId(commenterId)
                .authorName("Casey Commenter")
                .body("New comment")
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(commenterId, whiteboard.getId())).thenReturn(membership);
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> {
            Comment saved = invocation.getArgument(0);
            saved.setId(commentId);
            return saved;
        });
        when(commentResponseAssembler.toResponse(any(Comment.class), eq(commenterId), anyBoolean())).thenReturn(response);

        CommentResponse result = commentService.createComment(
                commenterId,
                questionId,
                CreateCommentRequest.builder().body("New comment").build()
        );

        assertThat(result).isEqualTo(response);
        ArgumentCaptor<Comment> commentCaptor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(commentCaptor.capture());
        assertThat(commentCaptor.getValue().getEditDeadline())
                .isBetween(beforeCreate.plusMinutes(59), LocalDateTime.now().plusMinutes(61));
        verify(auditLogService).logAction(
                whiteboard.getId(),
                commenterId,
                AuditAction.COMMENT_CREATED,
                "Comment",
                commentId,
                null,
                "New comment"
        );
        verify(notificationFactory).sendCommentAddedNotification(commenter, question);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/question/" + questionId + "/comments"),
                any(java.util.Map.class)
        );
    }

    @Test
    void createCommentShouldRejectClosedQuestion() {
        question.setStatus(QuestionStatus.CLOSED);
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));

        assertThatThrownBy(() -> commentService.createComment(
                authorId,
                questionId,
                CreateCommentRequest.builder().body("Late comment").build()
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("closed question");
    }

    @Test
    void editCommentShouldUpdateAuditAndPublish() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(whiteboardService.verifyMembership(authorId, whiteboard.getId())).thenReturn(
                WhiteboardMembership.builder().whiteboard(whiteboard).user(authorUser).role(Role.STUDENT).build()
        );
        when(commentResponseAssembler.toResponse(eq(comment), eq(authorId), anyBoolean())).thenReturn(
                CommentResponse.builder()
                        .id(commentId)
                        .questionId(questionId)
                        .authorId(authorId)
                        .authorName("Question Author")
                        .body("Edited body")
                        .build()
        );

        CommentResponse response = commentService.editComment(
                authorId,
                questionId,
                commentId,
                EditCommentRequest.builder().body("Edited body").build()
        );

        assertThat(response.getBody()).isEqualTo("Edited body");
        assertThat(comment.getBody()).isEqualTo("Edited body");
        verify(auditLogService).logAction(
                whiteboard.getId(),
                authorId,
                AuditAction.COMMENT_EDITED,
                "Comment",
                commentId,
                "Answer body",
                "Edited body"
        );
        verify(messagingTemplate).convertAndSend(
                eq("/topic/question/" + questionId + "/comments"),
                any(java.util.Map.class)
        );
    }

    @Test
    void editCommentShouldAllowAuthorWithinOneHourOfCreationWhenLegacyDeadlineExpired() {
        comment.setCreatedAt(LocalDateTime.now().minusMinutes(59));
        comment.setEditDeadline(LocalDateTime.now().minusMinutes(44));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(commentResponseAssembler.toResponse(comment, authorId)).thenReturn(
                CommentResponse.builder()
                        .id(commentId)
                        .questionId(questionId)
                        .authorId(authorId)
                        .authorName("Question Author")
                        .body("Edited before one hour")
                        .build()
        );

        CommentResponse response = commentService.editComment(
                authorId,
                questionId,
                commentId,
                EditCommentRequest.builder().body("Edited before one hour").build()
        );

        assertThat(response.getBody()).isEqualTo("Edited before one hour");
        assertThat(comment.getBody()).isEqualTo("Edited before one hour");
    }

    @Test
    void editCommentShouldRejectExpiredDeadline() {
        comment.setEditDeadline(LocalDateTime.now().minusMinutes(1));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> commentService.editComment(
                authorId,
                questionId,
                commentId,
                EditCommentRequest.builder().body("Too late").build()
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Edit deadline has passed");
    }

    @Test
    void deleteCommentShouldAllowFacultyAndPublishDeleteEvent() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        commentService.deleteComment(facultyId, questionId, commentId);

        verify(whiteboardService).verifyMembership(facultyId, whiteboard.getId());
        verify(whiteboardService).verifyFacultyRole(facultyId, whiteboard.getId());
        verify(auditLogService).logAction(
                whiteboard.getId(),
                facultyId,
                AuditAction.COMMENT_DELETED,
                "Comment",
                commentId,
                "Answer body",
                null
        );
        verify(commentRepository).delete(comment);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/question/" + questionId + "/comments"),
                any(java.util.Map.class)
        );
    }

    @Test
    void deleteCommentShouldRejectNonAuthorNonFaculty() {
        UUID otherUserId = UUID.randomUUID();
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(whiteboardService.verifyFacultyRole(otherUserId, whiteboard.getId()))
                .thenThrow(new com.ghost.exception.ForbiddenException("No faculty role"));

        assertThatThrownBy(() -> commentService.deleteComment(otherUserId, questionId, commentId))
                .isInstanceOf(com.ghost.exception.ForbiddenException.class)
                .hasMessageContaining("Only the author or faculty");

        verify(commentRepository, never()).delete(any(Comment.class));
    }

    @Test
    void deleteCommentShouldRejectClosedQuestion() {
        question.setStatus(QuestionStatus.CLOSED);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> commentService.deleteComment(authorId, questionId, commentId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("closed question");

        verify(auditLogService, never()).logAction(
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
        verify(commentRepository, never()).delete(any(Comment.class));
    }

    @Test
    void deleteCommentShouldRejectVerifiedAnswer() {
        question.setVerifiedAnswerId(commentId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> commentService.deleteComment(authorId, questionId, commentId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("verified answer");

        verify(auditLogService, never()).logAction(
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
        verify(commentRepository, never()).delete(any(Comment.class));
    }

    @Test
    void AC3_markAsVerifiedAnswerShouldAttachVerifierAndReturnUpdatedComment() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(commentResponseAssembler.toResponse(any(Comment.class), eq(facultyId), eq(true))).thenReturn(
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
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(bookmarkService.getBookmarksByQuestionId(questionId)).thenReturn(List.of(
                Bookmark.builder()
                        .user(User.builder().id(UUID.randomUUID()).build())
                        .build(),
                Bookmark.builder()
                        .user(User.builder().id(facultyId).build())
                        .build(),
                Bookmark.builder()
                        .user(User.builder().id(question.getAuthor().getId()).build())
                        .build()
        ));

        CommentResponse response = commentService.markAsVerifiedAnswer(facultyId, questionId, commentId);

        assertThat(comment.getVerifiedBy()).isEqualTo(facultyUser);
        assertThat(question.getStatus()).isEqualTo(QuestionStatus.CLOSED);
        assertThat(question.getVerifiedAnswerId()).isEqualTo(commentId);
        verify(questionRepository).save(question);
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
        verify(notificationFactory).sendQuestionAnsweredNotification(facultyUser, question);
        verify(notificationFactory, times(3)).sendBookmarkedQuestionAnsweredNotification(
                eq(facultyUser),
                eq(question),
                any(User.class)
        );
    }

    @Test
    void AC3_markAsVerifiedAnswerShouldRejectAlreadyVerifiedComment() {
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

    @Test
    void getCommentsByQuestionShouldRejectHiddenQuestion() {
        question.setHidden(true);
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(authorId, whiteboard.getId())).thenReturn(
                WhiteboardMembership.builder().whiteboard(whiteboard).user(authorUser).role(Role.STUDENT).build()
        );

        assertThatThrownBy(() -> commentService.getCommentsByQuestion(authorId, questionId, PageRequest.of(0, 20)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Question");
    }

    @Test
    void getCommentsByQuestionShouldMapVisibleComments() {
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(whiteboardService.verifyMembership(authorId, whiteboard.getId())).thenReturn(
                WhiteboardMembership.builder().whiteboard(whiteboard).user(authorUser).role(Role.STUDENT).build()
        );
        when(commentRepository.findByQuestionIdAndIsHiddenFalseOrderByCreatedAtAsc(eq(questionId), any()))
                .thenReturn(new PageImpl<>(List.of(comment), PageRequest.of(0, 20), 1));
        when(commentResponseAssembler.toResponse(eq(comment), eq(authorId), eq(false))).thenReturn(
                CommentResponse.builder()
                        .id(commentId)
                        .questionId(questionId)
                        .authorId(authorId)
                        .authorName("Question Author")
                        .body("Answer body")
                        .build()
        );

        var page = commentService.getCommentsByQuestion(authorId, questionId, PageRequest.of(0, 20));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(commentId);
    }
}
