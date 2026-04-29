package com.ghost.service;

import com.ghost.model.Question;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationFactory {

    private final NotificationService notificationService;

    public void sendQuestionCreatedNotification(User author, User faculty, Question question) {
        if (!faculty.getId().equals(author.getId())) {
            notificationService.createAndSend(
                    author.getId(),
                    faculty.getId(),
                    NotificationType.QUESTION_CREATED,
                    "New Question",
                    displayName(author) + " asked: " + question.getTitle(),
                    "Question",
                    question.getId(),
                    question.getWhiteboard().getId()
            );
        }
    }

    public void sendCommentAddedNotification(User commenter, Question question) {
        if (!question.getAuthor().getId().equals(commenter.getId())) {
            notificationService.createAndSend(
                    commenter.getId(),
                    question.getAuthor().getId(),
                    NotificationType.COMMENT_ADDED,
                    "New Comment",
                    "Someone commented on your question: " + question.getTitle(),
                    "Question",
                    question.getId(),
                    question.getWhiteboard().getId()
            );
        }
    }

    public void sendQuestionAnsweredNotification(User answerer, Question question) {
        if (!question.getAuthor().getId().equals(answerer.getId())) {
            notificationService.createAndSend(
                    answerer.getId(),
                    question.getAuthor().getId(),
                    NotificationType.QUESTION_ANSWERED,
                    "Your Question Was Answered",
                    "A verified answer has been provided for: " + question.getTitle(),
                    "Question",
                    question.getId(),
                    question.getWhiteboard().getId()
            );
        }
    }

    public void sendBookmarkedQuestionAnsweredNotification(User actor, Question question, User bookmarkUser) {
        if (!bookmarkUser.getId().equals(question.getAuthor().getId())
                && !bookmarkUser.getId().equals(actor.getId())) {
            notificationService.createAndSend(
                    actor.getId(),
                    bookmarkUser.getId(),
                    NotificationType.QUESTION_ANSWERED,
                    "Bookmarked Question Answered",
                    "A verified answer has been provided for: " + question.getTitle(),
                    "Question",
                    question.getId(),
                    question.getWhiteboard().getId()
            );
        }
    }

    public void sendQuestionForwardedNotification(User forwarder, User targetFaculty, Question question) {
        notificationService.createAndSend(
                forwarder.getId(),
                targetFaculty.getId(),
                NotificationType.QUESTION_FORWARDED,
                "Question Forwarded",
                "A question has been forwarded to you: " + question.getTitle(),
                "Question",
                question.getId(),
                question.getWhiteboard().getId()
        );
    }

    public void sendJoinRequestSubmittedNotification(User requester, User faculty, Whiteboard whiteboard) {
        if (!faculty.getId().equals(requester.getId())) {
            notificationService.createAndSend(
                    requester.getId(),
                    faculty.getId(),
                    NotificationType.JOIN_REQUEST_SUBMITTED,
                    "New Join Request",
                    displayName(requester) + " requested to join " + whiteboard.getCourse().getCourseCode(),
                    "Whiteboard",
                    whiteboard.getId(),
                    whiteboard.getId()
            );
        }
    }

    public void sendJoinRequestApprovedNotification(User approver, User requester, Whiteboard whiteboard) {
        notificationService.createAndSend(
                approver.getId(),
                requester.getId(),
                NotificationType.JOIN_REQUEST_APPROVED,
                "Join Request Approved",
                "Your request to join " + whiteboard.getCourse().getCourseCode() + " has been approved",
                "Whiteboard",
                whiteboard.getId(),
                whiteboard.getId()
        );
    }

    public void sendJoinRequestRejectedNotification(User rejecter, User requester, Whiteboard whiteboard) {
        notificationService.createAndSend(
                rejecter.getId(),
                requester.getId(),
                NotificationType.JOIN_REQUEST_REJECTED,
                "Join Request Rejected",
                "Your request to join " + whiteboard.getCourse().getCourseCode() + " has been rejected",
                "Whiteboard",
                whiteboard.getId(),
                whiteboard.getId()
        );
    }

    public void sendContentHiddenNotification(User actor, User contentOwner, String contentType, UUID contentId, Whiteboard whiteboard) {
        notificationService.createAndSend(
                actor.getId(),
                contentOwner.getId(),
                NotificationType.CONTENT_HIDDEN,
                "Content Hidden",
                "Your " + contentType.toLowerCase() + " has been hidden by a faculty member",
                contentType,
                contentId,
                whiteboard.getId()
        );
    }

    public void sendReportSubmittedNotification(User reporter, String contentType, UUID contentId, Whiteboard whiteboard) {
        notificationService.createAndSend(
                reporter.getId(),
                reporter.getId(),
                NotificationType.REPORT_SUBMITTED,
                "Report Submitted",
                "Your report has been submitted for review",
                contentType,
                contentId,
                whiteboard.getId()
        );
    }

    public void sendPostTrendingNotification(User actor, Question question) {
        notificationService.createAndSend(
                actor.getId(),
                question.getAuthor().getId(),
                NotificationType.POST_TRENDING,
                "Post Trending",
                "Your question is getting popular!",
                "Question",
                question.getId(),
                question.getWhiteboard().getId()
        );
    }

    private String displayName(User user) {
        String firstName = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String lastName = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? "Someone" : fullName;
    }
}
