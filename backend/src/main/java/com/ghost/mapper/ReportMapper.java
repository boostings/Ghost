package com.ghost.mapper;

import com.ghost.dto.response.ReportResponse;
import com.ghost.model.Comment;
import com.ghost.model.Question;
import com.ghost.model.Report;
import org.springframework.stereotype.Component;

@Component
public class ReportMapper {

    public ReportResponse toResponse(Report report) {
        Question question = report.getQuestion();
        Comment comment = report.getComment();
        Question threadQuestion = question != null ? question : comment != null ? comment.getQuestion() : null;

        return ReportResponse.builder()
                .id(report.getId())
                .reporterId(report.getReporter() != null ? report.getReporter().getId() : null)
                .reporterName(report.getReporter() != null
                        ? report.getReporter().getFirstName() + " " + report.getReporter().getLastName()
                        : null)
                .questionId(question != null ? question.getId() : null)
                .commentId(comment != null ? comment.getId() : null)
                .threadQuestionId(threadQuestion != null ? threadQuestion.getId() : null)
                .contentTitle(question != null ? question.getTitle() : null)
                .contentPreview(question != null ? question.getBody() : comment != null ? comment.getBody() : null)
                .contentHidden(question != null
                        ? question.isHidden()
                        : comment != null && comment.isHidden())
                .reason(report.getReason())
                .notes(report.getNotes())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
