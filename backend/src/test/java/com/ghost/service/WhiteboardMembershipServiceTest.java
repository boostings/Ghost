package com.ghost.service;

import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.MemberResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ForbiddenException;
import com.ghost.model.Course;
import com.ghost.model.FacultyUser;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.Role;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhiteboardMembershipServiceTest {

    @Mock
    private WhiteboardRepository whiteboardRepository;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private WhiteboardMembershipService whiteboardMembershipService;

    @Test
    void joinDemoWhiteboardIfAvailableShouldCreateMembership() {
        UUID userId = UUID.randomUUID();
        UUID demoWhiteboardId = UUID.randomUUID();

        User user = User.builder()
                .id(userId)
                .build();
        Whiteboard demoWhiteboard = Whiteboard.builder()
                .id(demoWhiteboardId)
                .isDemo(true)
                .course(Course.builder()
                        .courseCode("DEMO101")
                        .courseName("Demo Course")
                        .build())
                .semester(Semester.builder()
                        .name("Spring 2026")
                        .build())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(whiteboardRepository.findFirstByIsDemoTrueOrderByCreatedAtAsc()).thenReturn(Optional.of(demoWhiteboard));
        when(whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(demoWhiteboardId, userId)).thenReturn(false);

        boolean joined = whiteboardMembershipService.joinDemoWhiteboardIfAvailable(userId);

        assertThat(joined).isTrue();
        verify(whiteboardMembershipRepository).save(any(WhiteboardMembership.class));
        verify(auditLogService).logAction(
                demoWhiteboardId,
                userId,
                AuditAction.USER_ENLISTED,
                "User",
                userId,
                null,
                "Auto-joined demo class"
        );
    }

    @Test
    void joinDemoWhiteboardIfAvailableShouldReturnFalseWhenDemoWhiteboardMissing() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(whiteboardRepository.findFirstByIsDemoTrueOrderByCreatedAtAsc()).thenReturn(Optional.empty());

        boolean joined = whiteboardMembershipService.joinDemoWhiteboardIfAvailable(userId);

        assertThat(joined).isFalse();
        verify(whiteboardMembershipRepository, never()).save(any(WhiteboardMembership.class));
        verify(auditLogService, never()).logAction(
                any(UUID.class),
                any(UUID.class),
                any(AuditAction.class),
                any(String.class),
                any(UUID.class),
                any(),
                any(String.class)
        );
    }

    @Test
    void joinDemoWhiteboardIfAvailableShouldReturnFalseWhenUserAlreadyMember() {
        UUID userId = UUID.randomUUID();
        UUID demoWhiteboardId = UUID.randomUUID();

        User user = User.builder()
                .id(userId)
                .build();
        Whiteboard demoWhiteboard = Whiteboard.builder()
                .id(demoWhiteboardId)
                .isDemo(true)
                .course(Course.builder()
                        .courseCode("DEMO101")
                        .courseName("Demo Course")
                        .build())
                .semester(Semester.builder()
                        .name("Spring 2026")
                        .build())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(whiteboardRepository.findFirstByIsDemoTrueOrderByCreatedAtAsc()).thenReturn(Optional.of(demoWhiteboard));
        when(whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(demoWhiteboardId, userId)).thenReturn(true);

        boolean joined = whiteboardMembershipService.joinDemoWhiteboardIfAvailable(userId);

        assertThat(joined).isFalse();
        verify(whiteboardMembershipRepository, never()).save(any(WhiteboardMembership.class));
        verify(auditLogService, never()).logAction(
                any(UUID.class),
                any(UUID.class),
                any(AuditAction.class),
                any(String.class),
                any(UUID.class),
                any(),
                any(String.class)
        );
    }

    @Test
    void joinByInviteCodeShouldRejectWhenWhiteboardDoesNotMatchRequestedId() {
        UUID userId = UUID.randomUUID();
        UUID requestedWhiteboardId = UUID.randomUUID();
        Whiteboard foundWhiteboard = Whiteboard.builder()
                .id(UUID.randomUUID())
                .inviteCode("JOIN326")
                .build();

        when(whiteboardRepository.findByInviteCodeIgnoreCase("JOIN326")).thenReturn(Optional.of(foundWhiteboard));

        assertThatThrownBy(() -> whiteboardMembershipService.joinByInviteCode(userId, requestedWhiteboardId, " JOIN326 "))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("does not match whiteboard");
    }

    @Test
    void joinByInviteCodeShouldCreateMembershipAndAudit() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        User user = User.builder().id(userId).build();
        Whiteboard whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .inviteCode("JOIN326")
                .build();

        when(whiteboardRepository.findByInviteCodeIgnoreCase("JOIN326")).thenReturn(Optional.of(whiteboard));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId)).thenReturn(false);

        whiteboardMembershipService.joinByInviteCode(userId, " JOIN326 ");

        verify(whiteboardMembershipRepository).save(any(WhiteboardMembership.class));
        verify(auditLogService).logAction(
                whiteboardId,
                userId,
                AuditAction.USER_ENLISTED,
                "User",
                userId,
                null,
                "Joined via invite code"
        );
    }

    @Test
    void inviteFacultyShouldSaveFacultyMembershipAndLeaveWhiteboardShouldDeleteMembership() {
        UUID ownerId = UUID.randomUUID();
        UUID facultyId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();

        Whiteboard whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .owner(User.builder().id(ownerId).build())
                .inviteCode("JOIN326")
                .build();
        User faculty = FacultyUser.builder()
                .id(facultyId)
                .email("faculty@ilstu.edu")
                .build();
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(faculty)
                .role(Role.FACULTY)
                .build();

        when(whiteboardRepository.findById(whiteboardId)).thenReturn(Optional.of(whiteboard));
        when(userRepository.findByEmail("faculty@ilstu.edu")).thenReturn(Optional.of(faculty));
        // inviteFaculty looks up first (must be empty so it creates a new membership);
        // leaveWhiteboard then looks up again (must be present so it can delete).
        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, facultyId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(membership));

        whiteboardMembershipService.inviteFaculty(ownerId, whiteboardId, " Faculty@ilstu.edu ");
        whiteboardMembershipService.leaveWhiteboard(facultyId, whiteboardId);

        verify(whiteboardMembershipRepository).save(any(WhiteboardMembership.class));
        verify(auditLogService).logAction(
                whiteboardId,
                ownerId,
                AuditAction.FACULTY_INVITED,
                "User",
                facultyId,
                null,
                "faculty@ilstu.edu"
        );
        verify(whiteboardMembershipRepository).delete(membership);
        verify(auditLogService).logAction(
                whiteboardId,
                facultyId,
                AuditAction.USER_LEFT_WHITEBOARD,
                "User",
                facultyId,
                "member",
                "left"
        );
    }

    @Test
    void getInviteInfoAndMembersShouldRequireMembershipAndFacultyRole() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        Whiteboard whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .inviteCode("JOIN326")
                .build();
        WhiteboardMembership facultyMembership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .role(Role.FACULTY)
                .build();
        User member = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .build();
        WhiteboardMembership memberRecord = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(member)
                .role(Role.STUDENT)
                .build();
        MemberResponse memberResponse = MemberResponse.builder()
                .id(memberRecord.getId())
                .userId(member.getId())
                .email(member.getEmail())
                .firstName(member.getFirstName())
                .lastName(member.getLastName())
                .role(Role.STUDENT)
                .joinedAt(memberRecord.getJoinedAt())
                .build();

        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(Optional.of(facultyMembership))
                .thenReturn(Optional.of(facultyMembership));
        when(whiteboardRepository.findById(whiteboardId)).thenReturn(Optional.of(whiteboard));
        when(whiteboardMembershipRepository.findByWhiteboardId(eq(whiteboardId), any()))
                .thenReturn(new PageImpl<>(List.of(memberRecord), PageRequest.of(0, 20), 1));
        InviteInfoResponse inviteInfo = whiteboardMembershipService.getInviteInfo(userId, whiteboardId);
        var page = whiteboardMembershipService.getMemberResponses(userId, whiteboardId, PageRequest.of(0, 20));

        assertThat(inviteInfo.getInviteCode()).isEqualTo("JOIN326");
        assertThat(inviteInfo.getQrData()).isEqualTo("ghost://join/JOIN326");
        assertThat(page.getContent()).hasSize(1);
        MemberResponse actualMember = page.getContent().get(0);
        assertThat(actualMember.getId()).isEqualTo(memberResponse.getId());
        assertThat(actualMember.getUserId()).isEqualTo(memberResponse.getUserId());
        assertThat(actualMember.getEmail()).isEqualTo(memberResponse.getEmail());
        assertThat(actualMember.getRole()).isEqualTo(Role.STUDENT);
    }

    @Test
    void verifyFacultyRoleShouldRejectNonFacultyMembers() {
        UUID userId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        WhiteboardMembership studentMembership = WhiteboardMembership.builder()
                .whiteboard(Whiteboard.builder().id(whiteboardId).build())
                .role(Role.STUDENT)
                .build();

        when(whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId))
                .thenReturn(Optional.of(studentMembership));

        assertThatThrownBy(() -> whiteboardMembershipService.verifyFacultyRole(userId, whiteboardId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only faculty members");
    }
}
