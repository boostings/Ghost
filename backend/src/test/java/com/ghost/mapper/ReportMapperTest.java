package com.ghost.mapper;

import com.ghost.dto.response.ReportResponse;
import com.ghost.model.Comment;
import com.ghost.model.Course;
import com.ghost.model.Question;
import com.ghost.model.Report;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.ReportReason;
import com.ghost.model.enums.ReportStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReportMapperTest {

    private final ReportMapper reportMapper = new ReportMapper();

    @Test
    void toResponseShouldIncludeReporterIdentity() {
        UUID reportId = UUID.randomUUID();
        UUID reporterId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        LocalDateTime createdAt = LocalDateTime.of(2026, 3, 25, 12, 0);

        Report report = Report.builder()
                .id(reportId)
                .reporter(User.builder()
                        .id(reporterId)
                        .firstName("Taylor")
                        .lastName("Faculty")
                        .build())
                .question(com.ghost.model.Question.builder().id(questionId).build())
                .reason(ReportReason.SPAM)
                .notes("Duplicate post")
                .status(ReportStatus.PENDING)
                .createdAt(createdAt)
                .build();

        ReportResponse response = reportMapper.toResponse(report);

        assertThat(response.getReporterId()).isEqualTo(reporterId);
        assertThat(response.getReporterName()).isEqualTo("Taylor Faculty");
        assertThat(response.getQuestionId()).isEqualTo(questionId);
        assertThat(response.getThreadQuestionId()).isEqualTo(questionId);
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
    }

    @Test
    void toResponseShouldIncludeCommentModerationContext() {
        UUID reportId = UUID.randomUUID();
        UUID reporterId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();

        Whiteboard whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .course(Course.builder().courseCode("IT326").courseName("Software Engineering").build())
                .semester(Semester.builder().name("Fall 2026").build())
                .build();
        Question question = Question.builder()
                .id(questionId)
                .whiteboard(whiteboard)
                .title("Question title")
                .body("Question body")
                .build();
        Comment comment = Comment.builder()
                .id(commentId)
                .question(question)
                .body("Reported comment body")
                .isHidden(true)
                .build();
        Report report = Report.builder()
                .id(reportId)
                .reporter(User.builder()
                        .id(reporterId)
                        .firstName("Taylor")
                        .lastName("Faculty")
                        .build())
                .comment(comment)
                .reason(ReportReason.HARASSMENT)
                .status(ReportStatus.PENDING)
                .build();

        ReportResponse response = reportMapper.toResponse(report);

        assertThat(response.getCommentId()).isEqualTo(commentId);
        assertThat(response.getQuestionId()).isNull();
        assertThat(response.getThreadQuestionId()).isEqualTo(questionId);
        assertThat(response.getContentTitle()).isNull();
        assertThat(response.getContentPreview()).isEqualTo("Reported comment body");
        assertThat(response.isContentHidden()).isTrue();
    }
}
