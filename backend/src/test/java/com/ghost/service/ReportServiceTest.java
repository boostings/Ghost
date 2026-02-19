package com.ghost.service;

import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.dto.response.ReportResponse;
import com.ghost.mapper.ReportMapper;
import com.ghost.model.Comment;
import com.ghost.model.Question;
import com.ghost.model.Report;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.ReportStatus;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.ReportRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private ReportMapper reportMapper;

    @InjectMocks
    private ReportService reportService;

    private UUID reportId;
    private UUID whiteboardId;
    private UUID facultyId;
    private User faculty;

    @BeforeEach
    void setUp() {
        reportId = UUID.randomUUID();
        whiteboardId = UUID.randomUUID();
        facultyId = UUID.randomUUID();
        faculty = User.builder().id(facultyId).build();

        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportMapper.toResponse(any(Report.class))).thenReturn(ReportResponse.builder().build());
        when(userRepository.findById(facultyId)).thenReturn(Optional.of(faculty));
    }

    @Test
    void reviewReportDismissedQuestionShouldRestoreWhenActiveReportsBelowThreshold() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(Whiteboard.builder().id(whiteboardId).build())
                .isHidden(true)
                .reportCount(3)
                .build();
        Report report = Report.builder()
                .id(reportId)
                .question(question)
                .status(ReportStatus.PENDING)
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.countByQuestionIdAndStatusNot(question.getId(), ReportStatus.DISMISSED)).thenReturn(2L);
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.reviewReport(
                facultyId,
                reportId,
                ReviewReportRequest.builder().status(ReportStatus.DISMISSED).build()
        );

        assertThat(question.isHidden()).isFalse();
        assertThat(question.getReportCount()).isEqualTo(2);
        verify(auditLogService).logAction(
                eq(whiteboardId),
                eq(facultyId),
                eq(AuditAction.CONTENT_RESTORED),
                eq("Question"),
                eq(question.getId()),
                eq("hidden"),
                eq("visible")
        );
    }

    @Test
    void reviewReportDismissedQuestionShouldStayHiddenWhenThresholdStillMet() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(Whiteboard.builder().id(whiteboardId).build())
                .isHidden(true)
                .reportCount(4)
                .build();
        Report report = Report.builder()
                .id(reportId)
                .question(question)
                .status(ReportStatus.PENDING)
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.countByQuestionIdAndStatusNot(question.getId(), ReportStatus.DISMISSED)).thenReturn(3L);
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.reviewReport(
                facultyId,
                reportId,
                ReviewReportRequest.builder().status(ReportStatus.DISMISSED).build()
        );

        assertThat(question.isHidden()).isTrue();
        assertThat(question.getReportCount()).isEqualTo(3);
        verify(auditLogService, never()).logAction(
                eq(whiteboardId),
                eq(facultyId),
                eq(AuditAction.CONTENT_RESTORED),
                eq("Question"),
                eq(question.getId()),
                eq("hidden"),
                eq("visible")
        );
    }

    @Test
    void reviewReportDismissedCommentShouldRestoreWhenActiveReportsBelowThreshold() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(Whiteboard.builder().id(whiteboardId).build())
                .build();
        Comment comment = Comment.builder()
                .id(UUID.randomUUID())
                .question(question)
                .isHidden(true)
                .reportCount(3)
                .build();
        Report report = Report.builder()
                .id(reportId)
                .comment(comment)
                .status(ReportStatus.PENDING)
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.countByCommentIdAndStatusNot(comment.getId(), ReportStatus.DISMISSED)).thenReturn(1L);
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.reviewReport(
                facultyId,
                reportId,
                ReviewReportRequest.builder().status(ReportStatus.DISMISSED).build()
        );

        assertThat(comment.isHidden()).isFalse();
        assertThat(comment.getReportCount()).isEqualTo(1);
        verify(auditLogService).logAction(
                eq(whiteboardId),
                eq(facultyId),
                eq(AuditAction.CONTENT_RESTORED),
                eq("Comment"),
                eq(comment.getId()),
                eq("hidden"),
                eq("visible")
        );
    }
}
