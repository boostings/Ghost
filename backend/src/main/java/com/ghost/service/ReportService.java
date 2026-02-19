package com.ghost.service;

import com.ghost.dto.request.ReportRequest;
import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.dto.response.ReportResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.mapper.ReportMapper;
import com.ghost.model.Comment;
import com.ghost.model.Question;
import com.ghost.model.Report;
import com.ghost.model.User;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.ReportStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.ReportRepository;
import com.ghost.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final int AUTO_HIDE_REPORT_THRESHOLD = 3;

    private final ReportRepository reportRepository;
    private final QuestionRepository questionRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final WhiteboardService whiteboardService;
    private final ReportMapper reportMapper;

    @Transactional
    public ReportResponse reportContent(UUID userId, ReportRequest req) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        boolean hasQuestion = req.getQuestionId() != null;
        boolean hasComment = req.getCommentId() != null;
        if (hasQuestion == hasComment) {
            throw new BadRequestException("Provide exactly one of questionId or commentId");
        }

        Report.ReportBuilder reportBuilder = Report.builder()
                .reporter(reporter)
                .reason(req.getReason())
                .notes(req.getNotes())
                .status(ReportStatus.PENDING);

        UUID whiteboardId;
        UUID targetId;
        String targetType;

        if (req.getQuestionId() != null) {
            Question question = questionRepository.findById(req.getQuestionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Question", "id", req.getQuestionId()));

            whiteboardService.verifyMembership(userId, question.getWhiteboard().getId());
            if (reportRepository.existsByReporterIdAndQuestionId(userId, question.getId())) {
                throw new BadRequestException("You have already reported this question");
            }

            reportBuilder.question(question);
            whiteboardId = question.getWhiteboard().getId();
            targetId = question.getId();
            targetType = "Question";

            // Increment report count
            question.setReportCount(question.getReportCount() + 1);

            // If report_count >= threshold: set is_hidden=true
            if (question.getReportCount() >= AUTO_HIDE_REPORT_THRESHOLD && !question.isHidden()) {
                question.setHidden(true);
                questionRepository.save(question);

                // Notify faculty
                notifyFacultyOfHiddenContent(whiteboardId, targetType, targetId, question.getTitle());

                // Log CONTENT_HIDDEN
                auditLogService.logAction(
                        whiteboardId, userId, AuditAction.CONTENT_HIDDEN,
                        targetType, targetId, null, "Auto-hidden due to " + AUTO_HIDE_REPORT_THRESHOLD + "+ reports"
                );
            } else {
                questionRepository.save(question);
            }
        } else {
            Comment comment = commentRepository.findById(req.getCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", req.getCommentId()));

            whiteboardService.verifyMembership(userId, comment.getQuestion().getWhiteboard().getId());
            if (reportRepository.existsByReporterIdAndCommentId(userId, comment.getId())) {
                throw new BadRequestException("You have already reported this comment");
            }

            reportBuilder.comment(comment);
            whiteboardId = comment.getQuestion().getWhiteboard().getId();
            targetId = comment.getId();
            targetType = "Comment";

            // Increment report count
            comment.setReportCount(comment.getReportCount() + 1);

            // If report_count >= threshold: set is_hidden=true
            if (comment.getReportCount() >= AUTO_HIDE_REPORT_THRESHOLD && !comment.isHidden()) {
                comment.setHidden(true);
                commentRepository.save(comment);

                // Notify faculty
                notifyFacultyOfHiddenContent(whiteboardId, targetType, targetId, comment.getBody());

                // Log CONTENT_HIDDEN
                auditLogService.logAction(
                        whiteboardId, userId, AuditAction.CONTENT_HIDDEN,
                        targetType, targetId, null, "Auto-hidden due to " + AUTO_HIDE_REPORT_THRESHOLD + "+ reports"
                );
            } else {
                commentRepository.save(comment);
            }
        }

        Report report = reportBuilder.build();
        report = reportRepository.save(report);

        auditLogService.logAction(
                whiteboardId, userId, AuditAction.REPORT_SUBMITTED,
                targetType, targetId, null, req.getReason().name()
        );

        return reportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> getReportsForWhiteboard(UUID whiteboardId, Pageable pageable) {
        return reportRepository.findByWhiteboardIdPaged(whiteboardId, pageable)
                .map(reportMapper::toResponse);
    }

    @Transactional
    public ReportResponse reviewReport(UUID facultyId, UUID reportId, ReviewReportRequest req) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        // Determine which whiteboard the report belongs to
        UUID whiteboardId;
        if (report.getQuestion() != null) {
            whiteboardId = report.getQuestion().getWhiteboard().getId();
        } else if (report.getComment() != null) {
            whiteboardId = report.getComment().getQuestion().getWhiteboard().getId();
        } else {
            throw new BadRequestException("Report has no associated content");
        }

        // Verify faculty role
        whiteboardService.verifyFacultyRole(facultyId, whiteboardId);
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new BadRequestException("Only pending reports can be reviewed");
        }

        User reviewer = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));

        ReportStatus oldStatus = report.getStatus();
        report.setStatus(req.getStatus());
        report.setReviewedByUser(reviewer);
        report.setReviewedAt(LocalDateTime.now());
        report = reportRepository.save(report);

        auditLogService.logAction(
                whiteboardId,
                facultyId,
                AuditAction.REPORT_REVIEWED,
                "Report",
                report.getId(),
                oldStatus.name(),
                req.getStatus().name()
        );

        // Dismissed reports no longer contribute to active moderation thresholds.
        // Restore only if active (non-dismissed) reports drop below threshold.
        if (req.getStatus() == ReportStatus.DISMISSED) {
            if (report.getQuestion() != null) {
                reconcileQuestionModerationState(whiteboardId, facultyId, report.getQuestion());
            } else if (report.getComment() != null) {
                reconcileCommentModerationState(whiteboardId, facultyId, report.getComment());
            }
        }
        return reportMapper.toResponse(report);
    }

    private void reconcileQuestionModerationState(UUID whiteboardId, UUID facultyId, Question question) {
        long activeReportCount = reportRepository.countByQuestionIdAndStatusNot(
                question.getId(),
                ReportStatus.DISMISSED
        );
        question.setReportCount((int) activeReportCount);

        if (question.isHidden() && activeReportCount < AUTO_HIDE_REPORT_THRESHOLD) {
            question.setHidden(false);
            questionRepository.save(question);
            auditLogService.logAction(
                    whiteboardId,
                    facultyId,
                    AuditAction.CONTENT_RESTORED,
                    "Question",
                    question.getId(),
                    "hidden",
                    "visible"
            );
            return;
        }

        questionRepository.save(question);
    }

    private void reconcileCommentModerationState(UUID whiteboardId, UUID facultyId, Comment comment) {
        long activeReportCount = reportRepository.countByCommentIdAndStatusNot(
                comment.getId(),
                ReportStatus.DISMISSED
        );
        comment.setReportCount((int) activeReportCount);

        if (comment.isHidden() && activeReportCount < AUTO_HIDE_REPORT_THRESHOLD) {
            comment.setHidden(false);
            commentRepository.save(comment);
            auditLogService.logAction(
                    whiteboardId,
                    facultyId,
                    AuditAction.CONTENT_RESTORED,
                    "Comment",
                    comment.getId(),
                    "hidden",
                    "visible"
            );
            return;
        }

        commentRepository.save(comment);
    }

    private void notifyFacultyOfHiddenContent(UUID whiteboardId, String contentType, UUID contentId, String contentPreview) {
        List<WhiteboardMembership> members = whiteboardService.getMembers(whiteboardId);
        for (WhiteboardMembership member : members) {
            if (member.getRole() == Role.FACULTY) {
                notificationService.createAndSend(
                        member.getUser().getId(),
                        NotificationType.CONTENT_HIDDEN,
                        "Content Auto-Hidden",
                        contentType + " has been auto-hidden due to multiple reports: " + contentPreview,
                        contentType,
                        contentId
                );
            }
        }
    }
}
