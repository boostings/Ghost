package com.ghost.service;

import com.ghost.exception.ForbiddenException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Course;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhiteboardDeletionServiceTest {

    @Mock
    private WhiteboardRepository whiteboardRepository;

    @Mock
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private CourseService courseService;

    @Mock
    private SemesterService semesterService;

    @Mock
    private InviteCodeService inviteCodeService;

    @Mock
    private TopicService topicService;

    @Mock
    private WhiteboardResponseAssembler whiteboardResponseAssembler;

    @Mock
    private WhiteboardMembershipService whiteboardMembershipService;

    @Mock
    private WhiteboardJoinRequestService whiteboardJoinRequestService;

    @InjectMocks
    private WhiteboardService whiteboardService;

    @Test
    void deleteWhiteboardShouldDeleteBeforeWritingGlobalAuditLog() {
        UUID ownerId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();
        Whiteboard whiteboard = whiteboard(ownerId, whiteboardId);

        when(whiteboardRepository.findById(whiteboardId)).thenReturn(Optional.of(whiteboard));

        whiteboardService.deleteWhiteboard(ownerId, whiteboardId);

        InOrder inOrder = inOrder(whiteboardRepository, auditLogService);
        inOrder.verify(whiteboardRepository).delete(whiteboard);
        inOrder.verify(whiteboardRepository).flush();
        inOrder.verify(auditLogService).logAction(
                eq(null),
                eq(ownerId),
                eq(AuditAction.WHITEBOARD_DELETED),
                eq("Whiteboard"),
                eq(whiteboardId),
                eq("IT326"),
                eq(null)
        );
    }

    @Test
    void deleteWhiteboardShouldRejectNonOwnerWithForbiddenError() {
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();

        when(whiteboardRepository.findById(whiteboardId))
                .thenReturn(Optional.of(whiteboard(ownerId, whiteboardId)));

        assertThatThrownBy(() -> whiteboardService.deleteWhiteboard(otherUserId, whiteboardId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Only the owner can delete the whiteboard");

        verify(whiteboardRepository, never()).delete(org.mockito.ArgumentMatchers.any());
        verify(whiteboardRepository, never()).flush();
        verify(auditLogService, never()).logAction(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void deleteWhiteboardShouldReturnNotFoundForMissingWhiteboard() {
        UUID ownerId = UUID.randomUUID();
        UUID whiteboardId = UUID.randomUUID();

        when(whiteboardRepository.findById(whiteboardId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> whiteboardService.deleteWhiteboard(ownerId, whiteboardId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(whiteboardRepository, never()).delete(org.mockito.ArgumentMatchers.any());
        verify(whiteboardRepository, never()).flush();
    }

    private Whiteboard whiteboard(UUID ownerId, UUID whiteboardId) {
        return Whiteboard.builder()
                .id(whiteboardId)
                .owner(User.builder().id(ownerId).build())
                .course(Course.builder()
                        .courseCode("IT326")
                        .courseName("Software Engineering")
                        .build())
                .semester(Semester.builder().name("Fall 2026").build())
                .build();
    }
}
