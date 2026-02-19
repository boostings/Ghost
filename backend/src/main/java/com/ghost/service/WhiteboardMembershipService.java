package com.ghost.service;

import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.mapper.UserMapper;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.Role;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WhiteboardMembershipService {

    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final UserMapper userMapper;

    @Transactional
    public void joinByInviteCode(UUID userId, UUID whiteboardId, String inviteCode) {
        Whiteboard whiteboard = findWhiteboardByInviteCode(inviteCode);
        if (!whiteboard.getId().equals(whiteboardId)) {
            throw new BadRequestException("Invite code does not match whiteboard");
        }
        joinWhiteboard(userId, whiteboard);
    }

    @Transactional
    public void joinByInviteCode(UUID userId, String inviteCode) {
        Whiteboard whiteboard = findWhiteboardByInviteCode(inviteCode);
        joinWhiteboard(userId, whiteboard);
    }

    @Transactional
    public boolean joinDemoWhiteboardIfAvailable(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return whiteboardRepository.findFirstByIsDemoTrueOrderByCreatedAtAsc()
                .map(demoWhiteboard -> {
                    if (whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(demoWhiteboard.getId(), userId)) {
                        return false;
                    }

                    WhiteboardMembership membership = WhiteboardMembership.builder()
                            .whiteboard(demoWhiteboard)
                            .user(user)
                            .role(Role.STUDENT)
                            .build();
                    whiteboardMembershipRepository.save(membership);

                    auditLogService.logAction(
                            demoWhiteboard.getId(),
                            userId,
                            AuditAction.USER_ENLISTED,
                            "User",
                            userId,
                            null,
                            "Auto-joined demo class"
                    );
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public void enlistUser(UUID facultyId, UUID whiteboardId, String userEmail) {
        verifyFacultyRole(facultyId, whiteboardId);

        Whiteboard whiteboard = getWhiteboardById(whiteboardId);
        String normalizedEmail = normalizeEmail(userEmail);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", userEmail));

        if (whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, user.getId())) {
            throw new BadRequestException("User is already a member of this whiteboard");
        }

        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(user)
                .role(Role.STUDENT)
                .build();
        whiteboardMembershipRepository.save(membership);

        auditLogService.logAction(
                whiteboardId,
                facultyId,
                AuditAction.USER_ENLISTED,
                "User",
                user.getId(),
                null,
                normalizedEmail
        );
    }

    @Transactional
    public void removeMember(UUID facultyId, UUID whiteboardId, UUID targetUserId) {
        verifyFacultyRole(facultyId, whiteboardId);

        WhiteboardMembership membership = whiteboardMembershipRepository
                .findByWhiteboardIdAndUserId(whiteboardId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("WhiteboardMembership", "userId", targetUserId));

        whiteboardMembershipRepository.delete(membership);

        auditLogService.logAction(
                whiteboardId,
                facultyId,
                AuditAction.USER_REMOVED,
                "User",
                targetUserId,
                null,
                null
        );
    }

    @Transactional
    public void inviteFaculty(UUID ownerId, UUID whiteboardId, String facultyEmail) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        if (!whiteboard.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("Only the owner can invite faculty");
        }

        User faculty = userRepository.findByEmail(normalizeEmail(facultyEmail))
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", facultyEmail));

        if (faculty.getRole() != Role.FACULTY) {
            throw new BadRequestException("Can only invite users with FACULTY role");
        }

        if (whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, faculty.getId())) {
            throw new BadRequestException("Faculty member is already in this whiteboard");
        }

        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(faculty)
                .role(Role.FACULTY)
                .build();
        whiteboardMembershipRepository.save(membership);

        auditLogService.logAction(
                whiteboardId,
                ownerId,
                AuditAction.FACULTY_INVITED,
                "User",
                faculty.getId(),
                null,
                faculty.getEmail()
        );
    }

    @Transactional
    public void leaveWhiteboard(UUID userId, UUID whiteboardId) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        if (whiteboard.getOwner().getId().equals(userId)) {
            throw new BadRequestException("Owners cannot leave their whiteboard. Transfer ownership first.");
        }

        WhiteboardMembership membership = whiteboardMembershipRepository
                .findByWhiteboardIdAndUserId(whiteboardId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("WhiteboardMembership", "userId", userId));

        whiteboardMembershipRepository.delete(membership);

        auditLogService.logAction(
                whiteboardId,
                userId,
                AuditAction.USER_LEFT_WHITEBOARD,
                "User",
                userId,
                "member",
                "left"
        );
    }

    @Transactional(readOnly = true)
    public List<WhiteboardMembership> getMembers(UUID whiteboardId) {
        return whiteboardMembershipRepository.findByWhiteboardId(whiteboardId);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getMemberResponses(UUID userId, UUID whiteboardId, Pageable pageable) {
        verifyMembership(userId, whiteboardId);
        return whiteboardMembershipRepository.findByWhiteboardId(whiteboardId, pageable)
                .map(WhiteboardMembership::getUser)
                .map(userMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public InviteInfoResponse getInviteInfo(UUID facultyId, UUID whiteboardId) {
        verifyFacultyRole(facultyId, whiteboardId);
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        return InviteInfoResponse.builder()
                .inviteCode(whiteboard.getInviteCode())
                .qrData("ghost://join/" + whiteboard.getInviteCode())
                .build();
    }

    @Transactional(readOnly = true)
    public WhiteboardMembership verifyMembership(UUID userId, UUID whiteboardId) {
        return whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, userId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this whiteboard"));
    }

    @Transactional(readOnly = true)
    public void verifyFacultyRole(UUID userId, UUID whiteboardId) {
        WhiteboardMembership membership = verifyMembership(userId, whiteboardId);
        if (membership.getRole() != Role.FACULTY) {
            throw new UnauthorizedException("Only faculty members can perform this action");
        }
    }

    private void joinWhiteboard(UUID userId, Whiteboard whiteboard) {
        UUID whiteboardId = whiteboard.getId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId)) {
            throw new BadRequestException("You are already a member of this whiteboard");
        }

        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(user)
                .role(Role.STUDENT)
                .build();
        whiteboardMembershipRepository.save(membership);

        auditLogService.logAction(
                whiteboardId,
                userId,
                AuditAction.USER_ENLISTED,
                "User",
                userId,
                null,
                "Joined via invite code"
        );
    }

    private Whiteboard findWhiteboardByInviteCode(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) {
            throw new BadRequestException("Invite code is required");
        }

        return whiteboardRepository.findByInviteCodeIgnoreCase(inviteCode.trim())
                .orElseThrow(() -> new BadRequestException("Invalid invite code"));
    }

    private Whiteboard getWhiteboardById(UUID whiteboardId) {
        return whiteboardRepository.findById(whiteboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "id", whiteboardId));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
