package com.ghost.service;

import com.ghost.exception.BadRequestException;
import com.ghost.mapper.JoinRequestMapper;
import com.ghost.model.Course;
import com.ghost.model.JoinRequest;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.model.enums.NotificationType;
import com.ghost.model.enums.Role;
import com.ghost.repository.JoinRequestRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhiteboardServiceTest {

    @Mock
    private WhiteboardRepository whiteboardRepository;

    @Mock
    private JoinRequestRepository joinRequestRepository;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private JoinRequestMapper joinRequestMapper;

    @Mock
    private WhiteboardMembershipService whiteboardMembershipService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private WhiteboardJoinRequestService whiteboardJoinRequestService;

    private UUID whiteboardId;
    private UUID requestId;
    private UUID facultyId;
    private User reviewer;
    private JoinRequest joinRequest;

    @BeforeEach
    void setUp() {
        whiteboardId = UUID.randomUUID();
        requestId = UUID.randomUUID();
        facultyId = UUID.randomUUID();

        reviewer = User.builder()
                .id(facultyId)
                .role(Role.FACULTY)
                .build();

        Whiteboard whiteboard = Whiteboard.builder()
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

        User student = User.builder()
                .id(UUID.randomUUID())
                .role(Role.STUDENT)
                .build();

        joinRequest = JoinRequest.builder()
                .id(requestId)
                .user(student)
                .whiteboard(whiteboard)
                .status(JoinRequestStatus.PENDING)
                .build();

        when(joinRequestRepository.findById(requestId)).thenReturn(Optional.of(joinRequest));
        when(userRepository.findById(facultyId)).thenReturn(Optional.of(reviewer));
    }

    @Test
    void handleJoinRequestShouldRejectAlreadyReviewedRequest() {
        joinRequest.setStatus(JoinRequestStatus.APPROVED);

        assertThatThrownBy(() -> whiteboardJoinRequestService.handleJoinRequest(
                facultyId,
                whiteboardId,
                requestId,
                JoinRequestStatus.REJECTED
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only pending join requests");

        verify(joinRequestRepository, never()).save(any(JoinRequest.class));
    }

    @Test
    void handleJoinRequestShouldRejectPendingAsReviewDecision() {
        assertThatThrownBy(() -> whiteboardJoinRequestService.handleJoinRequest(
                facultyId,
                whiteboardId,
                requestId,
                JoinRequestStatus.PENDING
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must be APPROVED or REJECTED");

        verify(joinRequestRepository, never()).save(any(JoinRequest.class));
    }

    @Test
    void handleJoinRequestShouldApproveAndEnrollStudent() {
        UUID studentId = joinRequest.getUser().getId();
        when(whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, studentId))
                .thenReturn(false);

        whiteboardJoinRequestService.handleJoinRequest(
                facultyId,
                whiteboardId,
                requestId,
                JoinRequestStatus.APPROVED
        );

        assertThat(joinRequest.getStatus()).isEqualTo(JoinRequestStatus.APPROVED);
        assertThat(joinRequest.getReviewedByUser()).isEqualTo(reviewer);

        verify(whiteboardMembershipService).verifyFacultyRole(facultyId, whiteboardId);
        verify(whiteboardMembershipRepository).save(any(WhiteboardMembership.class));
        verify(joinRequestRepository).save(joinRequest);
        verify(auditLogService).logAction(
                whiteboardId,
                facultyId,
                AuditAction.JOIN_REQUEST_REVIEWED,
                "JoinRequest",
                requestId,
                JoinRequestStatus.PENDING.name(),
                JoinRequestStatus.APPROVED.name()
        );
        verify(notificationService).createAndSend(
                facultyId,
                studentId,
                NotificationType.JOIN_REQUEST_APPROVED,
                "Join Request Approved",
                "Your request to join " + joinRequest.getWhiteboard().getCourse().getCourseCode() + " was approved.",
                "Whiteboard",
                whiteboardId,
                whiteboardId
        );
    }
}
