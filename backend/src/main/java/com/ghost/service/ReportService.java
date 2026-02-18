package com.ghost.service;

import com.ghost.dto.request.ReportRequest;
import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
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

    private final ReportRepository reportRepository;
    private final QuestionRepository questionRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final WhiteboardService whiteboardService;

    @Transactional
    public Report reportContent(UUID userId, ReportRequest req) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (req.getQuestionId() == null && req.getCommentId() == null) {
            throw new BadRequestException("Either questionId or commentId must be provided");
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

            reportBuilder.question(question);
            whiteboardId = question.getWhiteboard().getId();
            targetId = question.getId();
            targetType = "Question";

            // Increment report count
            question.setReportCount(question.getReportCount() + 1);

            // If report_count >= 3: set is_hidden=true
            if (question.getReportCount() >= 3 && !question.isHidden()) {
                question.setHidden(true);
                questionRepository.save(question);

                // Notify faculty
                notifyFacultyOfHiddenContent(whiteboardId, targetType, targetId, question.getTitle());

                // Log CONTENT_HIDDEN
                auditLogService.logAction(
                        whiteboardId, userId, AuditAction.CONTENT_HIDDEN,
                        targetType, targetId, null, "Auto-hidden due to 3+ reports"
                );
            } else {
                questionRepository.save(question);
            }
        } else {
            Comment comment = commentRepository.findById(req.getCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", req.getCommentId()));

            reportBuilder.comment(comment);
            whiteboardId = comment.getQuestion().getWhiteboard().getId();
            targetId = comment.getId();
            targetType = "Comment";

            // Increment report count
            comment.setReportCount(comment.getReportCount() + 1);

            // If report_count >= 3: set is_hidden=true
            if (comment.getReportCount() >= 3 && !comment.isHidden()) {
                comment.setHidden(true);
                commentRepository.save(comment);

                // Notify faculty
                notifyFacultyOfHiddenContent(whiteboardId, targetType, targetId, comment.getBody());

                // Log CONTENT_HIDDEN
                auditLogService.logAction(
                        whiteboardId, userId, AuditAction.CONTENT_HIDDEN,
                        targetType, targetId, null, "Auto-hidden due to 3+ reports"
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

        return report;
    }

    @Transactional(readOnly = true)
    public Page<Report> getReportsForWhiteboard(UUID whiteboardId, Pageable pageable) {
        return reportRepository.findByWhiteboardIdPaged(whiteboardId, pageable);
    }

    @Transactional
    public void reviewReport(UUID facultyId, UUID reportId, ReviewReportRequest req) {
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

        User reviewer = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));

        report.setStatus(req.getStatus());
        report.setReviewedByUser(reviewer);
        report.setReviewedAt(LocalDateTime.now());
        reportRepository.save(report);

        // If dismissed, optionally restore hidden content
        if (req.getStatus() == ReportStatus.DISMISSED) {
            if (report.getQuestion() != null && report.getQuestion().isHidden()) {
                Question question = report.getQuestion();
                question.setHidden(false);
                questionRepository.save(question);

                auditLogService.logAction(
                        whiteboardId, facultyId, AuditAction.CONTENT_RESTORED,
                        "Question", question.getId(), "hidden", "visible"
                );
            } else if (report.getComment() != null && report.getComment().isHidden()) {
                Comment comment = report.getComment();
                comment.setHidden(false);
                commentRepository.save(comment);

                auditLogService.logAction(
                        whiteboardId, facultyId, AuditAction.CONTENT_RESTORED,
                        "Comment", comment.getId(), "hidden", "visible"
                );
            }
        }
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
