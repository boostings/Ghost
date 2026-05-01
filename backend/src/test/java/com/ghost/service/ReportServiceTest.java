package com.ghost.service;

import com.ghost.dto.request.ReportRequest;
import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.dto.response.ReportResponse;
import com.ghost.mapper.ReportMapper;
import com.ghost.model.Comment;
import com.ghost.model.Course;
import com.ghost.model.Question;
import com.ghost.model.Report;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.ReportReason;
import com.ghost.model.enums.ReportStatus;
import com.ghost.model.enums.Role;
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
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
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
    private Whiteboard whiteboard;

    @BeforeEach
    void setUp() {
        reportId = UUID.randomUUID();
        whiteboardId = UUID.randomUUID();
        facultyId = UUID.randomUUID();
        faculty = User.builder().id(facultyId).build();
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

        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportMapper.toResponse(any(Report.class))).thenReturn(ReportResponse.builder().build());
        lenient().when(userRepository.findById(facultyId)).thenReturn(Optional.of(faculty));
    }

    @Test
    void reportContentShouldNotifyFacultyAndReporter() {
        UUID reporterId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        User reporter = User.builder().id(reporterId).build();
        Question question = Question.builder()
                .id(questionId)
                .whiteboard(whiteboard)
                .title("Need help")
                .reportCount(0)
                .isHidden(false)
                .build();
        WhiteboardMembership facultyMembership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(faculty)
                .role(Role.FACULTY)
                .build();

        when(userRepository.findById(reporterId)).thenReturn(Optional.of(reporter));
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(reportRepository.existsByReporterIdAndQuestionId(reporterId, questionId)).thenReturn(false);
        when(questionRepository.save(question)).thenReturn(question);
        when(whiteboardService.getMembers(whiteboardId)).thenReturn(List.of(facultyMembership));

        reportService.reportContent(
                reporterId,
                ReportRequest.builder()
                        .questionId(questionId)
                        .reason(ReportReason.SPAM)
                        .build()
        );

        verify(notificationService).createAndSend(
                reporterId,
                facultyId,
                NotificationType.REPORT_SUBMITTED,
                "New Report Submitted",
                "Question was reported for spam: Need help",
                "Whiteboard",
                whiteboardId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                reporterId,
                reporterId,
                NotificationType.REPORT_SUBMITTED,
                "Report Submitted",
                "Your report has been submitted for review",
                "Question",
                questionId,
                whiteboardId
        );
        verify(reportMapper).toResponse(argThat(report -> report.getCreatedAt() != null));
    }

    @Test
    void reviewReportDismissedQuestionShouldRestoreWhenActiveReportsBelowThreshold() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
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
                .whiteboard(whiteboard)
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
    void reviewReportReviewedQuestionShouldHideContent() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .isHidden(false)
                .reportCount(1)
                .build();
        Report report = Report.builder()
                .id(reportId)
                .question(question)
                .status(ReportStatus.PENDING)
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.reviewReport(
                facultyId,
                reportId,
                ReviewReportRequest.builder().status(ReportStatus.REVIEWED).build()
        );

        assertThat(question.isHidden()).isTrue();
        verify(auditLogService).logAction(
                eq(whiteboardId),
                eq(facultyId),
                eq(AuditAction.CONTENT_HIDDEN),
                eq("Question"),
                eq(question.getId()),
                eq("visible"),
                eq("hidden")
        );
    }

    @Test
    void reviewReportDismissedCommentShouldRestoreWhenActiveReportsBelowThreshold() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
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

    @Test
    void reviewReportDismissedQuestionShouldRemainHiddenWhenReviewedReportStillExists() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .whiteboard(whiteboard)
                .isHidden(true)
                .reportCount(1)
                .build();
        Report report = Report.builder()
                .id(reportId)
                .question(question)
                .status(ReportStatus.PENDING)
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.countByQuestionIdAndStatusNot(question.getId(), ReportStatus.DISMISSED)).thenReturn(1L);
        when(reportRepository.countByQuestionIdAndStatus(question.getId(), ReportStatus.REVIEWED)).thenReturn(1L);
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.reviewReport(
                facultyId,
                reportId,
                ReviewReportRequest.builder().status(ReportStatus.DISMISSED).build()
        );

        assertThat(question.isHidden()).isTrue();
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
}
