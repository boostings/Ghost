package com.ghost.service;

import com.ghost.model.Course;
import com.ghost.model.Question;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationFactoryTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationFactory notificationFactory;

    private UUID actorId;
    private UUID authorId;
    private UUID recipientId;
    private UUID questionId;
    private UUID whiteboardId;
    private User actor;
    private User author;
    private User recipient;
    private Whiteboard whiteboard;
    private Question question;

    @BeforeEach
    void setUp() {
        actorId = UUID.randomUUID();
        authorId = UUID.randomUUID();
        recipientId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        whiteboardId = UUID.randomUUID();

        actor = User.builder().id(actorId).build();
        author = User.builder().id(authorId).build();
        recipient = User.builder().id(recipientId).build();
        whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .course(Course.builder()
                        .courseCode("IT326")
                        .courseName("Software Engineering")
                        .section("001")
                        .build())
                .semester(Semester.builder().name("Fall 2026").build())
                .build();
        question = Question.builder()
                .id(questionId)
                .whiteboard(whiteboard)
                .author(author)
                .title("Question title")
                .build();
    }

    @Test
    void sendCommentAddedNotificationShouldSkipQuestionAuthor() {
        notificationFactory.sendCommentAddedNotification(author, question);

        verify(notificationService, never()).createAndSend(
                authorId,
                authorId,
                NotificationType.COMMENT_ADDED,
                "New Comment",
                "Someone commented on your question: " + question.getTitle(),
                "Question",
                questionId,
                whiteboardId
        );
    }

    @Test
    void sendQuestionNotificationsShouldDelegateWithExpectedPayloads() {
        notificationFactory.sendCommentAddedNotification(actor, question);
        notificationFactory.sendQuestionAnsweredNotification(actor, question);
        notificationFactory.sendBookmarkedQuestionAnsweredNotification(actor, question, recipient);
        notificationFactory.sendQuestionForwardedNotification(actor, recipient, question);

        verify(notificationService).createAndSend(
                actorId,
                authorId,
                NotificationType.COMMENT_ADDED,
                "New Comment",
                "Someone commented on your question: " + question.getTitle(),
                "Question",
                questionId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                actorId,
                authorId,
                NotificationType.QUESTION_ANSWERED,
                "Your Question Was Answered",
                "A verified answer has been provided for: " + question.getTitle(),
                "Question",
                questionId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                actorId,
                recipientId,
                NotificationType.QUESTION_ANSWERED,
                "Bookmarked Question Answered",
                "A verified answer has been provided for: " + question.getTitle(),
                "Question",
                questionId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                actorId,
                recipientId,
                NotificationType.QUESTION_FORWARDED,
                "Question Forwarded",
                "A question has been forwarded to you: " + question.getTitle(),
                "Question",
                questionId,
                whiteboardId
        );
    }

    @Test
    void sendWhiteboardAndModerationNotificationsShouldDelegateWithExpectedPayloads() {
        UUID contentId = UUID.randomUUID();

        notificationFactory.sendJoinRequestApprovedNotification(actor, recipient, whiteboard);
        notificationFactory.sendJoinRequestRejectedNotification(actor, recipient, whiteboard);
        notificationFactory.sendContentHiddenNotification(actor, recipient, "Question", contentId, whiteboard);
        notificationFactory.sendReportSubmittedNotification(actor, "Comment", contentId, whiteboard);
        notificationFactory.sendPostTrendingNotification(actor, question);

        verify(notificationService).createAndSend(
                actorId,
                recipientId,
                NotificationType.JOIN_REQUEST_APPROVED,
                "Join Request Approved",
                "Your request to join IT326 has been approved",
                "Whiteboard",
                whiteboardId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                actorId,
                recipientId,
                NotificationType.JOIN_REQUEST_REJECTED,
                "Join Request Rejected",
                "Your request to join IT326 has been rejected",
                "Whiteboard",
                whiteboardId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                actorId,
                recipientId,
                NotificationType.CONTENT_HIDDEN,
                "Content Hidden",
                "Your question has been hidden by a faculty member",
                "Question",
                contentId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                actorId,
                null,
                NotificationType.REPORT_SUBMITTED,
                "Report Submitted",
                "Your report has been submitted for review",
                "Comment",
                contentId,
                whiteboardId
        );
        verify(notificationService).createAndSend(
                actorId,
                authorId,
                NotificationType.POST_TRENDING,
                "Post Trending",
                "Your question is getting popular!",
                "Question",
                questionId,
                whiteboardId
        );
    }
}
