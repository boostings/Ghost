package com.ghost.service;

import com.ghost.mapper.UserMapper;
import com.ghost.model.Course;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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

    @Mock
    private UserMapper userMapper;

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
}
