package com.ghost.controller;

import com.ghost.dto.request.CreateCommentRequest;
import com.ghost.dto.request.CreateQuestionRequest;
import com.ghost.dto.request.CreateTopicRequest;
import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.request.EditCommentRequest;
import com.ghost.dto.request.EditQuestionRequest;
import com.ghost.dto.request.EmailRequest;
import com.ghost.dto.request.ForwardQuestionRequest;
import com.ghost.dto.request.JoinRequestActionRequest;
import com.ghost.dto.request.JoinWhiteboardRequest;
import com.ghost.dto.request.ReportRequest;
import com.ghost.dto.request.ReviewReportRequest;
import com.ghost.dto.request.TransferOwnershipRequest;
import com.ghost.dto.request.UpdatePushTokenRequest;
import com.ghost.dto.request.UpdateUserRequest;
import com.ghost.dto.request.VoteRequest;
import com.ghost.dto.response.BookmarkResponse;
import com.ghost.dto.response.CommentResponse;
import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.NotificationResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.dto.response.ReportResponse;
import com.ghost.dto.response.TopicResponse;
import com.ghost.dto.response.UnreadCountResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.ReportReason;
import com.ghost.model.enums.ReportStatus;
import com.ghost.model.enums.VoteType;
import com.ghost.service.AuditLogService;
import com.ghost.service.BookmarkService;
import com.ghost.service.KarmaService;
import com.ghost.service.NotificationService;
import com.ghost.service.QuestionService;
import com.ghost.service.ReportService;
import com.ghost.service.SearchService;
import com.ghost.service.TopicService;
import com.ghost.service.UserService;
import com.ghost.service.WhiteboardMembershipService;
import com.ghost.service.WhiteboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ControllerCoverageExpansionTest {

    @Mock
    private WhiteboardService whiteboardService;

    @Mock
    private QuestionService questionService;

    @Mock
    private TopicService topicService;

    @Mock
    private ReportService reportService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private BookmarkService bookmarkService;

    @Mock
    private KarmaService karmaService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SearchService searchService;

    @Mock
    private UserService userService;

    @Mock
    private WhiteboardMembershipService whiteboardMembershipService;

    private WhiteboardController whiteboardController;
    private FacultyController facultyController;
    private StudentController studentController;
    private QuestionController questionController;
    private TopicController topicController;
    private NotificationController notificationController;
    private BookmarkController bookmarkController;
    private KarmaController karmaController;
    private SearchController searchController;
    private UserController userController;
    private ReportController reportController;
    private WhiteboardMembershipController whiteboardMembershipController;

    @BeforeEach
    void setUp() {
        whiteboardController = new WhiteboardController(whiteboardService);
        facultyController = new FacultyController(
                whiteboardService,
                questionService,
                topicService,
                reportService,
                auditLogService
        );
        studentController = new StudentController(
                questionService,
                karmaService,
                bookmarkService,
                reportService,
                whiteboardService
        );
        questionController = new QuestionController(questionService);
        topicController = new TopicController(topicService);
        notificationController = new NotificationController(notificationService);
        bookmarkController = new BookmarkController(bookmarkService);
        karmaController = new KarmaController(karmaService);
        searchController = new SearchController(searchService);
        userController = new UserController(userService, questionService);
        reportController = new ReportController(reportService, whiteboardService);
        whiteboardMembershipController = new WhiteboardMembershipController(whiteboardMembershipService);
    }

    @Test
    void whiteboardControllerShouldCoverCrudAndMembershipEndpoints() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        CreateWhiteboardRequest createRequest = CreateWhiteboardRequest.builder()
                .courseCode("it326")
                .courseName("Software Testing")
                .section("001")
                .semester("Fall 2026")
                .build();
        JoinWhiteboardRequest joinRequest = JoinWhiteboardRequest.builder()
                .inviteCode("JOIN326")
                .build();
        JoinRequestActionRequest joinAction = JoinRequestActionRequest.builder()
                .status(JoinRequestStatus.APPROVED)
                .build();
        EmailRequest emailRequest = EmailRequest.builder()
                .email("faculty2@ilstu.edu")
                .build();
        TransferOwnershipRequest transferRequest = TransferOwnershipRequest.builder()
                .newOwnerEmail("owner2@ilstu.edu")
                .build();
        WhiteboardResponse whiteboardResponse = WhiteboardResponse.builder()
                .id(whiteboardId)
                .courseCode("IT326")
                .courseName("Software Testing")
                .build();
        JoinRequestResponse joinRequestResponse = JoinRequestResponse.builder()
                .id(requestId)
                .build();
        UserResponse memberResponse = UserResponse.builder()
                .id(memberId)
                .email("member@ilstu.edu")
                .build();
        InviteInfoResponse inviteInfoResponse = InviteInfoResponse.builder()
                .inviteCode("JOIN326")
                .qrData("ghost://join/JOIN326")
                .build();

        when(whiteboardService.createWhiteboardResponse(userId, createRequest)).thenReturn(whiteboardResponse);
        when(whiteboardService.getWhiteboardResponsesForUser(eq(userId), any(Pageable.class)))
                .thenReturn(pageOf(whiteboardResponse));
        when(whiteboardService.getDiscoverableWhiteboards(eq(userId), any(Pageable.class)))
                .thenReturn(pageOf(whiteboardResponse));
        when(whiteboardService.getWhiteboardResponse(userId, whiteboardId)).thenReturn(whiteboardResponse);
        when(whiteboardService.requestToJoinResponse(userId, whiteboardId)).thenReturn(joinRequestResponse);
        when(whiteboardService.getJoinRequestResponses(eq(userId), eq(whiteboardId), any(Pageable.class)))
                .thenReturn(pageOf(joinRequestResponse));
        when(whiteboardService.getMemberResponses(eq(userId), eq(whiteboardId), any(Pageable.class)))
                .thenReturn(pageOf(memberResponse));
        when(whiteboardService.getInviteInfo(userId, whiteboardId)).thenReturn(inviteInfoResponse);

        ResponseEntity<WhiteboardResponse> created = whiteboardController.createWhiteboard(userId.toString(), createRequest);
        ResponseEntity<PageResponse<WhiteboardResponse>> listed = whiteboardController.getWhiteboards(userId.toString(), 2, 500);
        ResponseEntity<PageResponse<WhiteboardResponse>> discoverable = whiteboardController.getDiscoverableWhiteboards(userId.toString(), 1, 0);
        ResponseEntity<WhiteboardResponse> oneWhiteboard = whiteboardController.getWhiteboard(userId.toString(), whiteboardId);
        ResponseEntity<Void> deleted = whiteboardController.deleteWhiteboard(userId.toString(), whiteboardId);
        ResponseEntity<Void> joinedDirect = whiteboardController.joinWhiteboard(userId.toString(), whiteboardId, joinRequest);
        ResponseEntity<Void> joinedByInvite = whiteboardController.joinWhiteboardByInvite(userId.toString(), joinRequest);
        ResponseEntity<JoinRequestResponse> requested = whiteboardController.requestJoin(userId.toString(), whiteboardId);
        ResponseEntity<PageResponse<JoinRequestResponse>> requests = whiteboardController.getJoinRequests(userId.toString(), whiteboardId, 0, 20);
        ResponseEntity<Void> reviewed = whiteboardController.handleJoinRequest(userId.toString(), whiteboardId, requestId, joinAction);
        ResponseEntity<PageResponse<UserResponse>> members = whiteboardController.getMembers(userId.toString(), whiteboardId, 0, 20);
        ResponseEntity<Void> removedMember = whiteboardController.removeMember(userId.toString(), whiteboardId, memberId);
        ResponseEntity<Void> enlisted = whiteboardController.enlistUser(userId.toString(), whiteboardId, emailRequest);
        ResponseEntity<Void> transferred = whiteboardController.transferOwnership(userId.toString(), whiteboardId, transferRequest);
        ResponseEntity<Void> invited = whiteboardController.inviteFaculty(userId.toString(), whiteboardId, emailRequest);
        ResponseEntity<Void> left = whiteboardController.leaveWhiteboard(userId.toString(), whiteboardId);
        ResponseEntity<InviteInfoResponse> inviteInfo = whiteboardController.getInviteInfo(userId.toString(), whiteboardId);

        ArgumentCaptor<Pageable> listedPageable = ArgumentCaptor.forClass(Pageable.class);
        ArgumentCaptor<Pageable> discoverablePageable = ArgumentCaptor.forClass(Pageable.class);

        verify(whiteboardService).createWhiteboardResponse(userId, createRequest);
        verify(whiteboardService).getWhiteboardResponsesForUser(eq(userId), listedPageable.capture());
        verify(whiteboardService).getDiscoverableWhiteboards(eq(userId), discoverablePageable.capture());
        verify(whiteboardService).getWhiteboardResponse(userId, whiteboardId);
        verify(whiteboardService).deleteWhiteboard(userId, whiteboardId);
        verify(whiteboardService).joinByInviteCode(userId, whiteboardId, "JOIN326");
        verify(whiteboardService).joinByInviteCode(userId, "JOIN326");
        verify(whiteboardService).requestToJoinResponse(userId, whiteboardId);
        verify(whiteboardService).getJoinRequestResponses(eq(userId), eq(whiteboardId), any(Pageable.class));
        verify(whiteboardService).handleJoinRequest(userId, whiteboardId, requestId, JoinRequestStatus.APPROVED);
        verify(whiteboardService).getMemberResponses(eq(userId), eq(whiteboardId), any(Pageable.class));
        verify(whiteboardService).removeMember(userId, whiteboardId, memberId);
        verify(whiteboardService).enlistUser(userId, whiteboardId, "faculty2@ilstu.edu");
        verify(whiteboardService).transferOwnership(userId, whiteboardId, "owner2@ilstu.edu");
        verify(whiteboardService).inviteFaculty(userId, whiteboardId, "faculty2@ilstu.edu");
        verify(whiteboardService).leaveWhiteboard(userId, whiteboardId);
        verify(whiteboardService).getInviteInfo(userId, whiteboardId);

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).isEqualTo(whiteboardResponse);
        assertThat(listed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listed.getBody()).isNotNull();
        assertThat(listed.getBody().getContent()).containsExactly(whiteboardResponse);
        assertThat(discoverable.getBody()).isNotNull();
        assertThat(discoverable.getBody().getContent()).containsExactly(whiteboardResponse);
        assertThat(listedPageable.getValue().getPageSize()).isEqualTo(100);
        assertThat(discoverablePageable.getValue().getPageSize()).isEqualTo(1);
        assertThat(oneWhiteboard.getBody()).isEqualTo(whiteboardResponse);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(joinedDirect.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(joinedByInvite.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(requested.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(requested.getBody()).isEqualTo(joinRequestResponse);
        assertThat(requests.getBody()).isNotNull();
        assertThat(requests.getBody().getContent()).containsExactly(joinRequestResponse);
        assertThat(reviewed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(members.getBody()).isNotNull();
        assertThat(members.getBody().getContent()).containsExactly(memberResponse);
        assertThat(removedMember.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(enlisted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(transferred.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(invited.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(left.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(inviteInfo.getBody()).isEqualTo(inviteInfoResponse);
    }

    @Test
    void facultyControllerShouldCoverWhiteboardQuestionTopicAndAuditEndpoints() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        CreateWhiteboardRequest createWhiteboardRequest = CreateWhiteboardRequest.builder()
                .courseCode("IT326")
                .courseName("Software Testing")
                .section("001")
                .semester("Fall 2026")
                .build();
        TransferOwnershipRequest transferRequest = TransferOwnershipRequest.builder()
                .newOwnerEmail("new-owner@ilstu.edu")
                .build();
        EmailRequest emailRequest = EmailRequest.builder()
                .email("person@ilstu.edu")
                .build();
        JoinRequestActionRequest joinActionRequest = JoinRequestActionRequest.builder()
                .status(JoinRequestStatus.REJECTED)
                .build();
        ForwardQuestionRequest forwardQuestionRequest = ForwardQuestionRequest.builder()
                .targetFacultyId(UUID.randomUUID())
                .build();
        CreateTopicRequest createTopicRequest = CreateTopicRequest.builder()
                .name("Projects")
                .build();
        ReviewReportRequest reviewReportRequest = ReviewReportRequest.builder()
                .status(ReportStatus.REVIEWED)
                .build();

        WhiteboardResponse whiteboardResponse = WhiteboardResponse.builder().id(whiteboardId).build();
        QuestionResponse questionResponse = QuestionResponse.builder().id(questionId).title("Pinned").build();
        TopicResponse topicResponse = TopicResponse.builder().id(topicId).name("Projects").build();
        ReportResponse reportResponse = ReportResponse.builder().id(reportId).status(ReportStatus.REVIEWED).build();
        JoinRequestResponse joinRequestResponse = JoinRequestResponse.builder().id(requestId).build();
        InviteInfoResponse inviteInfoResponse = InviteInfoResponse.builder().inviteCode("JOIN326").build();
        UserResponse userResponse = UserResponse.builder().id(memberId).email("member@ilstu.edu").build();

        when(whiteboardService.createWhiteboardResponse(userId, createWhiteboardRequest)).thenReturn(whiteboardResponse);
        when(whiteboardService.getJoinRequestResponses(eq(userId), eq(whiteboardId), any(Pageable.class)))
                .thenReturn(pageOf(joinRequestResponse));
        when(whiteboardService.getInviteInfo(userId, whiteboardId)).thenReturn(inviteInfoResponse);
        when(questionService.pinQuestion(userId, whiteboardId, questionId)).thenReturn(questionResponse);
        when(questionService.unpinQuestion(userId, whiteboardId, questionId)).thenReturn(questionResponse);
        when(questionService.forwardQuestion(userId, whiteboardId, questionId, forwardQuestionRequest))
                .thenReturn(questionResponse);
        when(topicService.createTopic(userId, whiteboardId, "Projects")).thenReturn(topicResponse);
        when(reportService.reviewReport(userId, reportId, reviewReportRequest)).thenReturn(reportResponse);
        when(auditLogService.exportToCsv(whiteboardId)).thenReturn("timestamp,action");
        when(whiteboardService.getMemberResponses(eq(userId), eq(whiteboardId), any(Pageable.class)))
                .thenReturn(pageOf(userResponse));

        ResponseEntity<WhiteboardResponse> created = facultyController.createWhiteboard(userId.toString(), createWhiteboardRequest);
        ResponseEntity<Void> deleted = facultyController.deleteWhiteboard(userId.toString(), whiteboardId);
        ResponseEntity<Void> transferred = facultyController.transferOwnership(userId.toString(), whiteboardId, transferRequest);
        ResponseEntity<Void> invited = facultyController.inviteFaculty(userId.toString(), whiteboardId, emailRequest);
        ResponseEntity<Void> enlisted = facultyController.enlistUser(userId.toString(), whiteboardId, emailRequest);
        ResponseEntity<Void> removedMember = facultyController.removeMember(userId.toString(), whiteboardId, memberId);
        ResponseEntity<Void> handledJoinRequest = facultyController.handleJoinRequest(userId.toString(), whiteboardId, requestId, joinActionRequest);
        ResponseEntity<PageResponse<JoinRequestResponse>> joinRequests = facultyController.getJoinRequestResponses(userId.toString(), whiteboardId, 0, 20);
        ResponseEntity<InviteInfoResponse> inviteInfo = facultyController.getInviteInfo(userId.toString(), whiteboardId);
        ResponseEntity<Void> closed = facultyController.closeQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<QuestionResponse> pinned = facultyController.pinQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<QuestionResponse> unpinned = facultyController.unpinQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<QuestionResponse> forwarded = facultyController.forwardQuestion(userId.toString(), whiteboardId, questionId, forwardQuestionRequest);
        ResponseEntity<TopicResponse> createdTopic = facultyController.createTopic(userId.toString(), whiteboardId, createTopicRequest);
        ResponseEntity<Void> deletedTopic = facultyController.deleteTopic(userId.toString(), whiteboardId, topicId);
        ResponseEntity<ReportResponse> reviewedReport = facultyController.reviewReport(userId.toString(), reportId, reviewReportRequest);
        ResponseEntity<String> csvExport = facultyController.exportToCsv(userId.toString(), whiteboardId);
        ResponseEntity<PageResponse<UserResponse>> members = facultyController.getMembers(userId.toString(), whiteboardId, 0, 500);

        verify(whiteboardService).createWhiteboardResponse(userId, createWhiteboardRequest);
        verify(whiteboardService).deleteWhiteboard(userId, whiteboardId);
        verify(whiteboardService).transferOwnership(userId, whiteboardId, "new-owner@ilstu.edu");
        verify(whiteboardService).inviteFaculty(userId, whiteboardId, "person@ilstu.edu");
        verify(whiteboardService).enlistUser(userId, whiteboardId, "person@ilstu.edu");
        verify(whiteboardService).removeMember(userId, whiteboardId, memberId);
        verify(whiteboardService).handleJoinRequest(userId, whiteboardId, requestId, JoinRequestStatus.REJECTED);
        verify(whiteboardService).getJoinRequestResponses(eq(userId), eq(whiteboardId), any(Pageable.class));
        verify(whiteboardService).getInviteInfo(userId, whiteboardId);
        verify(questionService).closeQuestion(userId, whiteboardId, questionId);
        verify(questionService).pinQuestion(userId, whiteboardId, questionId);
        verify(questionService).unpinQuestion(userId, whiteboardId, questionId);
        verify(questionService).forwardQuestion(userId, whiteboardId, questionId, forwardQuestionRequest);
        verify(topicService).createTopic(userId, whiteboardId, "Projects");
        verify(topicService).deleteTopic(userId, whiteboardId, topicId);
        verify(reportService).reviewReport(userId, reportId, reviewReportRequest);
        verify(whiteboardService).verifyFacultyRole(userId, whiteboardId);
        verify(auditLogService).exportToCsv(whiteboardId);
        verify(whiteboardService).getMemberResponses(eq(userId), eq(whiteboardId), any(Pageable.class));

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).isEqualTo(whiteboardResponse);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(transferred.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(invited.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(enlisted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(removedMember.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(handledJoinRequest.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(joinRequests.getBody()).isNotNull();
        assertThat(joinRequests.getBody().getContent()).containsExactly(joinRequestResponse);
        assertThat(inviteInfo.getBody()).isEqualTo(inviteInfoResponse);
        assertThat(closed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(pinned.getBody()).isEqualTo(questionResponse);
        assertThat(unpinned.getBody()).isEqualTo(questionResponse);
        assertThat(forwarded.getBody()).isEqualTo(questionResponse);
        assertThat(createdTopic.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(createdTopic.getBody()).isEqualTo(topicResponse);
        assertThat(deletedTopic.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(reviewedReport.getBody()).isEqualTo(reportResponse);
        assertThat(csvExport.getHeaders().getFirst("Content-Disposition")).contains("audit-logs.csv");
        assertThat(csvExport.getBody()).isEqualTo("timestamp,action");
        assertThat(members.getBody()).isNotNull();
        assertThat(members.getBody().getContent()).containsExactly(userResponse);
    }

    @Test
    void studentAndQuestionControllersShouldCoverMutationEndpoints() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();

        CreateQuestionRequest createQuestionRequest = CreateQuestionRequest.builder()
                .title("Title")
                .body("Question body")
                .build();
        EditQuestionRequest editQuestionRequest = EditQuestionRequest.builder()
                .title("Updated title")
                .body("Updated body")
                .build();
        CreateCommentRequest createCommentRequest = CreateCommentRequest.builder()
                .body("Comment body")
                .build();
        EditCommentRequest editCommentRequest = EditCommentRequest.builder()
                .body("Updated comment")
                .build();
        ForwardQuestionRequest forwardQuestionRequest = ForwardQuestionRequest.builder()
                .targetFacultyId(UUID.randomUUID())
                .build();

        QuestionResponse questionResponse = QuestionResponse.builder()
                .id(questionId)
                .title("Title")
                .build();
        CommentResponse commentResponse = CommentResponse.builder()
                .id(commentId)
                .body("Comment body")
                .build();

        when(questionService.createQuestion(userId, whiteboardId, createQuestionRequest)).thenReturn(questionResponse);
        when(questionService.editQuestion(userId, whiteboardId, questionId, editQuestionRequest)).thenReturn(questionResponse);
        when(questionService.getQuestions(eq(userId), eq(whiteboardId), any(), eq("OPEN"), any(Pageable.class)))
                .thenReturn(pageOf(questionResponse));
        when(questionService.getQuestionByIdAndWhiteboard(userId, questionId, whiteboardId)).thenReturn(questionResponse);
        when(questionService.createComment(userId, whiteboardId, questionId, createCommentRequest))
                .thenReturn(commentResponse);
        when(questionService.getCommentsByQuestion(eq(userId), eq(whiteboardId), eq(questionId), any(Pageable.class)))
                .thenReturn(pageOf(commentResponse));
        when(questionService.editComment(userId, whiteboardId, questionId, commentId, editCommentRequest))
                .thenReturn(commentResponse);
        when(questionService.markAsVerifiedAnswer(userId, whiteboardId, questionId, commentId))
                .thenReturn(commentResponse);

        ResponseEntity<QuestionResponse> createdQuestion = studentController.createQuestion(userId.toString(), whiteboardId, createQuestionRequest);
        ResponseEntity<QuestionResponse> editedQuestion = studentController.editQuestion(userId.toString(), whiteboardId, questionId, editQuestionRequest);
        ResponseEntity<Void> deletedQuestion = studentController.deleteQuestion(userId.toString(), whiteboardId, questionId);

        ResponseEntity<QuestionResponse> createdQuestionViaQuestionController =
                questionController.createQuestion(userId.toString(), whiteboardId, createQuestionRequest);
        ResponseEntity<PageResponse<QuestionResponse>> listedQuestions =
                questionController.getQuestions(userId.toString(), whiteboardId, 0, 250, null, "OPEN");
        ResponseEntity<QuestionResponse> loadedQuestion =
                questionController.getQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<QuestionResponse> updatedQuestion =
                questionController.updateQuestion(userId.toString(), whiteboardId, questionId, editQuestionRequest);
        ResponseEntity<Void> questionDeleted =
                questionController.deleteQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<Void> questionClosed =
                questionController.closeQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<Void> questionPinned =
                questionController.pinQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<Void> questionUnpinned =
                questionController.unpinQuestion(userId.toString(), whiteboardId, questionId);
        ResponseEntity<Void> questionForwarded =
                questionController.forwardQuestion(userId.toString(), whiteboardId, questionId, forwardQuestionRequest);

        ResponseEntity<CommentResponse> createdComment =
                questionController.createComment(userId.toString(), whiteboardId, questionId, createCommentRequest);
        ResponseEntity<PageResponse<CommentResponse>> listedComments =
                questionController.getComments(userId.toString(), whiteboardId, questionId, 0, 0);
        ResponseEntity<CommentResponse> updatedComment =
                questionController.updateComment(userId.toString(), whiteboardId, questionId, commentId, editCommentRequest);
        ResponseEntity<Void> commentDeleted =
                questionController.deleteComment(userId.toString(), whiteboardId, questionId, commentId);
        ResponseEntity<CommentResponse> verifiedComment =
                questionController.verifyComment(userId.toString(), whiteboardId, questionId, commentId);

        verify(questionService, times(2)).createQuestion(userId, whiteboardId, createQuestionRequest);
        verify(questionService, times(2)).editQuestion(userId, whiteboardId, questionId, editQuestionRequest);
        verify(questionService, times(2)).deleteQuestion(userId, whiteboardId, questionId);
        verify(questionService).getQuestions(eq(userId), eq(whiteboardId), any(), eq("OPEN"), any(Pageable.class));
        verify(questionService).getQuestionByIdAndWhiteboard(userId, questionId, whiteboardId);
        verify(questionService).closeQuestion(userId, whiteboardId, questionId);
        verify(questionService).pinQuestion(userId, whiteboardId, questionId);
        verify(questionService).unpinQuestion(userId, whiteboardId, questionId);
        verify(questionService).forwardQuestion(userId, whiteboardId, questionId, forwardQuestionRequest);
        verify(questionService).createComment(userId, whiteboardId, questionId, createCommentRequest);
        verify(questionService).getCommentsByQuestion(eq(userId), eq(whiteboardId), eq(questionId), any(Pageable.class));
        verify(questionService).editComment(userId, whiteboardId, questionId, commentId, editCommentRequest);
        verify(questionService).deleteComment(userId, whiteboardId, questionId, commentId);
        verify(questionService).markAsVerifiedAnswer(userId, whiteboardId, questionId, commentId);

        assertThat(createdQuestion.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(createdQuestion.getBody()).isEqualTo(questionResponse);
        assertThat(editedQuestion.getBody()).isEqualTo(questionResponse);
        assertThat(deletedQuestion.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(createdQuestionViaQuestionController.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(listedQuestions.getBody()).isNotNull();
        assertThat(listedQuestions.getBody().getContent()).containsExactly(questionResponse);
        assertThat(loadedQuestion.getBody()).isEqualTo(questionResponse);
        assertThat(updatedQuestion.getBody()).isEqualTo(questionResponse);
        assertThat(questionDeleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(questionClosed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(questionPinned.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(questionUnpinned.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(questionForwarded.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(createdComment.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(createdComment.getBody()).isEqualTo(commentResponse);
        assertThat(listedComments.getBody()).isNotNull();
        assertThat(listedComments.getBody().getContent()).containsExactly(commentResponse);
        assertThat(updatedComment.getBody()).isEqualTo(commentResponse);
        assertThat(commentDeleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(verifiedComment.getBody()).isEqualTo(commentResponse);
    }

    @Test
    void notificationBookmarkUserSearchReportMembershipAndKarmaControllersShouldCoverEndpoints() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        VoteRequest voteRequest = VoteRequest.builder().voteType(VoteType.UPVOTE).build();
        CreateTopicRequest createTopicRequest = CreateTopicRequest.builder().name("Homework").build();
        UpdateUserRequest updateUserRequest = UpdateUserRequest.builder()
                .firstName("Jamie")
                .lastName("Tester")
                .build();
        UpdatePushTokenRequest pushTokenRequest = UpdatePushTokenRequest.builder()
                .token("ExponentPushToken[abc]")
                .build();
        ReviewReportRequest reviewReportRequest = ReviewReportRequest.builder()
                .status(ReportStatus.DISMISSED)
                .build();
        ReportRequest reportRequest = ReportRequest.builder()
                .questionId(questionId)
                .reason(ReportReason.SPAM)
                .notes("Spam")
                .build();
        JoinWhiteboardRequest joinWhiteboardRequest = JoinWhiteboardRequest.builder()
                .inviteCode("JOIN326")
                .build();
        EmailRequest emailRequest = EmailRequest.builder()
                .email("faculty@ilstu.edu")
                .build();

        TopicResponse topicResponse = TopicResponse.builder().id(topicId).name("Homework").build();
        NotificationResponse notificationResponse = NotificationResponse.builder()
                .id(notificationId)
                .type(NotificationType.COMMENT_ADDED)
                .build();
        BookmarkResponse bookmarkResponse = BookmarkResponse.builder()
                .id(UUID.randomUUID())
                .question(QuestionResponse.builder().id(questionId).title("Bookmarked").build())
                .build();
        QuestionResponse questionResponse = QuestionResponse.builder().id(questionId).title("Question").build();
        UserResponse userResponse = UserResponse.builder().id(memberId).email("member@ilstu.edu").build();
        ReportResponse reportResponse = ReportResponse.builder().id(reportId).status(ReportStatus.DISMISSED).build();
        InviteInfoResponse inviteInfoResponse = InviteInfoResponse.builder().inviteCode("JOIN326").build();

        when(topicService.getTopics(eq(userId), eq(whiteboardId), any(Pageable.class))).thenReturn(pageOf(topicResponse));
        when(topicService.createTopic(userId, whiteboardId, "Homework")).thenReturn(topicResponse);
        when(notificationService.getNotifications(eq(userId), any(Pageable.class))).thenReturn(pageOf(notificationResponse));
        when(notificationService.getUnreadCount(userId)).thenReturn(3L);
        when(bookmarkService.getBookmarks(eq(userId), any(Pageable.class))).thenReturn(pageOf(bookmarkResponse));
        when(bookmarkService.bookmark(userId, questionId)).thenReturn(bookmarkResponse);
        when(searchService.search(eq(userId), eq("ghost"), eq(whiteboardId), eq(topicId), eq("OPEN"), any(), any(), any(Pageable.class)))
                .thenReturn(pageOf(questionResponse));
        when(userService.getUserById(userId)).thenReturn(userResponse);
        when(userService.updateUser(userId, updateUserRequest)).thenReturn(userResponse);
        when(reportService.reportContent(userId, reportRequest)).thenReturn(reportResponse);
        when(reportService.getReportsForWhiteboard(eq(whiteboardId), any(Pageable.class))).thenReturn(pageOf(reportResponse));
        when(reportService.reviewReport(userId, reportId, reviewReportRequest)).thenReturn(reportResponse);
        when(whiteboardService.requestToJoinResponse(userId, whiteboardId))
                .thenReturn(JoinRequestResponse.builder().id(UUID.randomUUID()).build());
        when(whiteboardMembershipService.joinDemoWhiteboardIfAvailable(userId)).thenReturn(true);
        when(whiteboardMembershipService.getMemberResponses(eq(userId), eq(whiteboardId), any(Pageable.class)))
                .thenReturn(pageOf(userResponse));
        when(whiteboardMembershipService.getInviteInfo(userId, whiteboardId)).thenReturn(inviteInfoResponse);

        ResponseEntity<TopicResponse> createdTopic = topicController.createTopic(userId.toString(), whiteboardId, createTopicRequest);
        ResponseEntity<PageResponse<TopicResponse>> topics = topicController.getTopics(userId.toString(), whiteboardId, 0, 25);
        ResponseEntity<Void> deletedTopic = topicController.deleteTopic(userId.toString(), whiteboardId, topicId);

        ResponseEntity<PageResponse<NotificationResponse>> notifications = notificationController.getNotifications(userId.toString(), 1, 300);
        ResponseEntity<UnreadCountResponse> unreadCount = notificationController.getUnreadCount(userId.toString());
        ResponseEntity<Void> markedRead = notificationController.markAsRead(userId.toString(), notificationId);
        ResponseEntity<Void> markedAllRead = notificationController.markAllAsRead(userId.toString());

        ResponseEntity<PageResponse<BookmarkResponse>> bookmarks = bookmarkController.getBookmarks(userId.toString(), 0, 20);
        ResponseEntity<Void> createdBookmark = bookmarkController.bookmarkQuestion(userId.toString(), questionId);
        ResponseEntity<Void> removedBookmark = bookmarkController.removeBookmark(userId.toString(), questionId);

        ResponseEntity<Void> questionVote = karmaController.voteOnQuestion(userId.toString(), questionId, voteRequest);
        ResponseEntity<Void> commentVote = karmaController.voteOnComment(userId.toString(), commentId, voteRequest);
        ResponseEntity<Void> removedQuestionVote = karmaController.removeQuestionVote(userId.toString(), questionId);
        ResponseEntity<Void> removedCommentVote = karmaController.removeCommentVote(userId.toString(), commentId);

        ResponseEntity<Void> studentQuestionVote = studentController.voteOnQuestion(userId.toString(), questionId, voteRequest);
        ResponseEntity<Void> studentCommentVote = studentController.voteOnComment(userId.toString(), commentId, voteRequest);
        ResponseEntity<Void> studentRemovedQuestionVote = studentController.removeQuestionVote(userId.toString(), questionId);
        ResponseEntity<Void> studentRemovedCommentVote = studentController.removeCommentVote(userId.toString(), commentId);
        ResponseEntity<BookmarkResponse> studentBookmark = studentController.bookmark(userId.toString(), questionId);
        ResponseEntity<Void> studentRemovedBookmark = studentController.removeBookmark(userId.toString(), questionId);
        ResponseEntity<ReportResponse> studentReport = studentController.reportContent(userId.toString(), reportRequest);
        ResponseEntity<JoinRequestResponse> studentJoinRequest = studentController.requestToJoin(userId.toString(), whiteboardId);
        ResponseEntity<Void> studentJoinedByInvite = studentController.joinByInviteCode(userId.toString(), joinWhiteboardRequest);
        ResponseEntity<Void> studentLeftWhiteboard = studentController.leaveWhiteboard(userId.toString(), whiteboardId);

        ResponseEntity<PageResponse<QuestionResponse>> searchResults = searchController.searchQuestions(
                userId.toString(),
                "ghost",
                whiteboardId,
                topicId,
                "OPEN",
                null,
                null,
                0,
                1000
        );

        ResponseEntity<UserResponse> me = userController.getMe(userId.toString());
        ResponseEntity<UserResponse> updatedUser = userController.updateMe(userId.toString(), updateUserRequest);
        ResponseEntity<Void> updatedPushToken = userController.updatePushToken(userId.toString(), pushTokenRequest);
        ResponseEntity<Void> clearedPushToken = userController.clearPushToken(userId.toString());

        ResponseEntity<ReportResponse> createdReport = reportController.createReport(userId.toString(), reportRequest);
        ResponseEntity<PageResponse<ReportResponse>> reports = reportController.getReportsByWhiteboard(userId.toString(), whiteboardId, 0, 200);
        ResponseEntity<ReportResponse> reviewedReport = reportController.reviewReport(userId.toString(), reportId, reviewReportRequest);

        ResponseEntity<Void> joinedByInvite = whiteboardMembershipController.joinByInviteCode(userId.toString(), joinWhiteboardRequest);
        ResponseEntity<Boolean> joinedDemo = whiteboardMembershipController.joinDemoWhiteboardIfAvailable(userId.toString());
        ResponseEntity<Void> enlisted = whiteboardMembershipController.enlistUser(userId.toString(), whiteboardId, emailRequest);
        ResponseEntity<Void> removedMember = whiteboardMembershipController.removeMember(userId.toString(), whiteboardId, memberId);
        ResponseEntity<Void> invitedFaculty = whiteboardMembershipController.inviteFaculty(userId.toString(), whiteboardId, emailRequest);
        ResponseEntity<Void> leftWhiteboard = whiteboardMembershipController.leaveWhiteboard(userId.toString(), whiteboardId);
        ResponseEntity<PageResponse<UserResponse>> members = whiteboardMembershipController.getMemberResponses(userId.toString(), whiteboardId, 0, 20);
        ResponseEntity<InviteInfoResponse> inviteInfo = whiteboardMembershipController.getInviteInfo(userId.toString(), whiteboardId);

        verify(topicService).getTopics(eq(userId), eq(whiteboardId), any(Pageable.class));
        verify(topicService).createTopic(userId, whiteboardId, "Homework");
        verify(topicService).deleteTopic(userId, whiteboardId, topicId);
        verify(notificationService).getNotifications(eq(userId), any(Pageable.class));
        verify(notificationService).getUnreadCount(userId);
        verify(notificationService).markAsRead(userId, notificationId);
        verify(notificationService).markAllAsRead(userId);
        verify(bookmarkService).getBookmarks(eq(userId), any(Pageable.class));
        verify(bookmarkService, times(2)).bookmark(userId, questionId);
        verify(bookmarkService, times(2)).removeBookmark(userId, questionId);
        verify(karmaService, times(2)).voteOnQuestion(userId, questionId, VoteType.UPVOTE);
        verify(karmaService, times(2)).voteOnComment(userId, commentId, VoteType.UPVOTE);
        verify(karmaService, times(2)).removeQuestionVote(userId, questionId);
        verify(karmaService, times(2)).removeCommentVote(userId, commentId);
        verify(searchService).search(eq(userId), eq("ghost"), eq(whiteboardId), eq(topicId), eq("OPEN"), any(), any(), any(Pageable.class));
        verify(userService).getUserById(userId);
        verify(userService).updateUser(userId, updateUserRequest);
        verify(userService).updatePushToken(userId, "ExponentPushToken[abc]");
        verify(userService).clearPushToken(userId);
        verify(reportService, times(2)).reportContent(userId, reportRequest);
        verify(whiteboardService).verifyFacultyRole(userId, whiteboardId);
        verify(reportService).getReportsForWhiteboard(eq(whiteboardId), any(Pageable.class));
        verify(reportService).reviewReport(userId, reportId, reviewReportRequest);
        verify(whiteboardService).requestToJoinResponse(userId, whiteboardId);
        verify(whiteboardService).joinByInviteCode(userId, "JOIN326");
        verify(whiteboardService).leaveWhiteboard(userId, whiteboardId);
        verify(whiteboardMembershipService).joinByInviteCode(userId, "JOIN326");
        verify(whiteboardMembershipService).joinDemoWhiteboardIfAvailable(userId);
        verify(whiteboardMembershipService).enlistUser(userId, whiteboardId, "faculty@ilstu.edu");
        verify(whiteboardMembershipService).removeMember(userId, whiteboardId, memberId);
        verify(whiteboardMembershipService).inviteFaculty(userId, whiteboardId, "faculty@ilstu.edu");
        verify(whiteboardMembershipService).leaveWhiteboard(userId, whiteboardId);
        verify(whiteboardMembershipService).getMemberResponses(eq(userId), eq(whiteboardId), any(Pageable.class));
        verify(whiteboardMembershipService).getInviteInfo(userId, whiteboardId);

        assertThat(createdTopic.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(createdTopic.getBody()).isEqualTo(topicResponse);
        assertThat(topics.getBody()).isNotNull();
        assertThat(topics.getBody().getContent()).containsExactly(topicResponse);
        assertThat(deletedTopic.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(notifications.getBody()).isNotNull();
        assertThat(notifications.getBody().getContent()).containsExactly(notificationResponse);
        assertThat(unreadCount.getBody()).isNotNull();
        assertThat(unreadCount.getBody().getCount()).isEqualTo(3L);
        assertThat(markedRead.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(markedAllRead.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(bookmarks.getBody()).isNotNull();
        assertThat(bookmarks.getBody().getContent()).containsExactly(bookmarkResponse);
        assertThat(createdBookmark.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(removedBookmark.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(questionVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(commentVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(removedQuestionVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(removedCommentVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(studentQuestionVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(studentCommentVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(studentRemovedQuestionVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(studentRemovedCommentVote.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(studentBookmark.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(studentBookmark.getBody()).isEqualTo(bookmarkResponse);
        assertThat(studentRemovedBookmark.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(studentReport.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(studentReport.getBody()).isEqualTo(reportResponse);
        assertThat(studentJoinRequest.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(studentJoinedByInvite.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(studentLeftWhiteboard.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(searchResults.getBody()).isNotNull();
        assertThat(searchResults.getBody().getContent()).containsExactly(questionResponse);
        assertThat(me.getBody()).isEqualTo(userResponse);
        assertThat(updatedUser.getBody()).isEqualTo(userResponse);
        assertThat(updatedPushToken.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(clearedPushToken.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(createdReport.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(createdReport.getBody()).isEqualTo(reportResponse);
        assertThat(reports.getBody()).isNotNull();
        assertThat(reports.getBody().getContent()).containsExactly(reportResponse);
        assertThat(reviewedReport.getBody()).isEqualTo(reportResponse);
        assertThat(studentJoinRequest.getBody()).isNotNull();
        assertThat(joinedByInvite.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(joinedDemo.getBody()).isTrue();
        assertThat(enlisted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(removedMember.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(invitedFaculty.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(leftWhiteboard.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(members.getBody()).isNotNull();
        assertThat(members.getBody().getContent()).containsExactly(userResponse);
        assertThat(inviteInfo.getBody()).isEqualTo(inviteInfoResponse);
    }

    private static <T> Page<T> pageOf(T value) {
        return new PageImpl<>(List.of(value), PageRequest.of(0, 1), 1);
    }
}
