package com.ghost.service;

import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.mapper.JoinRequestMapper;
import com.ghost.model.JoinRequest;
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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WhiteboardJoinRequestService {

    private final WhiteboardRepository whiteboardRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final NotificationFactory notificationFactory;
    private final JoinRequestMapper joinRequestMapper;
    private final WhiteboardMembershipService whiteboardMembershipService;

    @Transactional
    public JoinRequest requestToJoin(UUID userId, UUID whiteboardId) {
        Whiteboard whiteboard = whiteboardRepository.findById(whiteboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "id", whiteboardId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId)) {
            throw new BadRequestException("You are already a member of this whiteboard");
        }

        if (joinRequestRepository.existsByUserIdAndWhiteboardIdAndStatus(
                userId,
                whiteboardId,
                JoinRequestStatus.PENDING
        )) {
            throw new BadRequestException("You already have a pending join request for this whiteboard");
        }

        JoinRequest joinRequest = JoinRequest.builder()
                .user(user)
                .whiteboard(whiteboard)
                .status(JoinRequestStatus.PENDING)
                .build();

        JoinRequest saved = joinRequestRepository.save(joinRequest);
        auditLogService.logAction(
                whiteboardId,
                userId,
                AuditAction.JOIN_REQUEST_SUBMITTED,
                "JoinRequest",
                saved.getId(),
                null,
                JoinRequestStatus.PENDING.name()
        );

        notifyFacultyOfJoinRequest(user, whiteboard);

        return saved;
    }

    private void notifyFacultyOfJoinRequest(User requester, Whiteboard whiteboard) {
        List<WhiteboardMembership> memberships =
                whiteboardMembershipRepository.findByWhiteboardId(whiteboard.getId());
        for (WhiteboardMembership membership : memberships) {
            if (membership.getRole() == Role.FACULTY) {
                notificationFactory.sendJoinRequestSubmittedNotification(
                        requester,
                        membership.getUser(),
                        whiteboard
                );
            }
        }
    }

    @Transactional
    public JoinRequestResponse requestToJoinResponse(UUID userId, UUID whiteboardId) {
        return joinRequestMapper.toResponse(requestToJoin(userId, whiteboardId));
    }

    @Transactional
    public void handleJoinRequest(UUID facultyId, UUID whiteboardId, UUID requestId, JoinRequestStatus status) {
        JoinRequest joinRequest = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("JoinRequest", "id", requestId));

        if (!joinRequest.getWhiteboard().getId().equals(whiteboardId)) {
            throw new ResourceNotFoundException("JoinRequest", "id", requestId);
        }

        whiteboardMembershipService.verifyFacultyRole(facultyId, whiteboardId);

        User reviewer = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));

        if (joinRequest.getStatus() != JoinRequestStatus.PENDING) {
            throw new BadRequestException("Only pending join requests can be reviewed");
        }
        if (status == JoinRequestStatus.PENDING) {
            throw new BadRequestException("Join request status must be APPROVED or REJECTED");
        }

        JoinRequestStatus oldStatus = joinRequest.getStatus();

        if (status == JoinRequestStatus.APPROVED) {
            UUID requestWhiteboardId = joinRequest.getWhiteboard().getId();
            UUID targetUserId = joinRequest.getUser().getId();

            if (!whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(requestWhiteboardId, targetUserId)) {
                WhiteboardMembership membership = WhiteboardMembership.builder()
                        .whiteboard(joinRequest.getWhiteboard())
                        .user(joinRequest.getUser())
                        .role(Role.STUDENT)
                        .build();
                whiteboardMembershipRepository.save(membership);
            }
        }

        joinRequest.setStatus(status);
        joinRequest.setReviewedByUser(reviewer);
        joinRequestRepository.save(joinRequest);

        auditLogService.logAction(
                whiteboardId,
                facultyId,
                AuditAction.JOIN_REQUEST_REVIEWED,
                "JoinRequest",
                joinRequest.getId(),
                oldStatus.name(),
                status.name()
        );

        NotificationType notificationType = status == JoinRequestStatus.APPROVED
                ? NotificationType.JOIN_REQUEST_APPROVED
                : NotificationType.JOIN_REQUEST_REJECTED;
        String title = status == JoinRequestStatus.APPROVED
                ? "Join Request Approved"
                : "Join Request Rejected";
        String body = status == JoinRequestStatus.APPROVED
                ? "Your request to join " + joinRequest.getWhiteboard().getCourse().getCourseCode() + " was approved."
                : "Your request to join " + joinRequest.getWhiteboard().getCourse().getCourseCode() + " was rejected.";

        notificationService.createAndSend(
                facultyId,
                joinRequest.getUser().getId(),
                notificationType,
                title,
                body,
                "Whiteboard",
                whiteboardId,
                whiteboardId
        );
    }

    @Transactional(readOnly = true)
    public Page<JoinRequestResponse> getJoinRequestResponses(UUID facultyId, UUID whiteboardId, Pageable pageable) {
        whiteboardMembershipService.verifyFacultyRole(facultyId, whiteboardId);
        return joinRequestRepository.findByWhiteboardIdAndStatusOrderByCreatedAtDesc(
                whiteboardId,
                JoinRequestStatus.PENDING,
                pageable
        ).map(joinRequestMapper::toResponse);
    }
}
