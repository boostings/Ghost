package com.ghost.service;

import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.mapper.JoinRequestMapper;
import com.ghost.mapper.UserMapper;
import com.ghost.mapper.WhiteboardMapper;
import com.ghost.model.JoinRequest;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.JoinRequestRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhiteboardService {

    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final UserRepository userRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final AuditLogService auditLogService;
    private final TopicService topicService;
    private final WhiteboardMapper whiteboardMapper;
    private final JoinRequestMapper joinRequestMapper;
    private final UserMapper userMapper;

    private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int INVITE_CODE_LENGTH = 8;
    private static final int INVITE_CODE_MAX_ATTEMPTS = 10;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public Whiteboard createWhiteboard(UUID facultyId, CreateWhiteboardRequest req) {
        User faculty = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));

        if (faculty.getRole() != Role.FACULTY) {
            throw new UnauthorizedException("Only faculty members can create whiteboards");
        }

        String normalizedCourseCode = normalizeCourseCode(req.getCourseCode());
        String normalizedSemester = normalizeSemester(req.getSemester());
        String normalizedCourseName = req.getCourseName().trim();
        String normalizedSection = normalizeSection(req.getSection());

        // Auto-merge: return existing whiteboard if one already exists for this courseCode+semester
        Optional<Whiteboard> existing = whiteboardRepository.findByCourseCodeAndSemester(
                normalizedCourseCode, normalizedSemester);
        if (existing.isPresent()) {
            Whiteboard existingWhiteboard = existing.get();
            if (!whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(existingWhiteboard.getId(), facultyId)) {
                WhiteboardMembership facultyMembership = WhiteboardMembership.builder()
                        .whiteboard(existingWhiteboard)
                        .user(faculty)
                        .role(Role.FACULTY)
                        .build();
                whiteboardMembershipRepository.save(facultyMembership);

                auditLogService.logAction(
                        existingWhiteboard.getId(),
                        facultyId,
                        AuditAction.USER_ENLISTED,
                        "User",
                        facultyId,
                        null,
                        "Auto-merged into existing whiteboard as faculty"
                );
            }
            return existingWhiteboard;
        }

        // Generate random 8-char invite code
        String inviteCode = generateInviteCode();

        Whiteboard whiteboard = Whiteboard.builder()
                .courseCode(normalizedCourseCode)
                .courseName(normalizedCourseName)
                .section(normalizedSection)
                .semester(normalizedSemester)
                .owner(faculty)
                .inviteCode(inviteCode)
                .build();

        whiteboard = whiteboardRepository.save(whiteboard);

        // Add creator as FACULTY membership
        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(faculty)
                .role(Role.FACULTY)
                .build();
        whiteboardMembershipRepository.save(membership);

        // Create default topics
        topicService.createDefaultTopics(whiteboard.getId(), facultyId);

        // Log audit
        auditLogService.logAction(
                whiteboard.getId(), facultyId, AuditAction.WHITEBOARD_CREATED,
                "Whiteboard", whiteboard.getId(), null, whiteboard.getCourseCode()
        );

        return whiteboard;
    }

    @Transactional
    public WhiteboardResponse createWhiteboardResponse(UUID facultyId, CreateWhiteboardRequest req) {
        Whiteboard whiteboard = createWhiteboard(facultyId, req);
        return whiteboardMapper.toResponse(whiteboard, true);
    }

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

    private void joinWhiteboard(UUID userId, Whiteboard whiteboard) {
        UUID whiteboardId = whiteboard.getId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Check not already a member
        if (whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboard.getId(), userId)) {
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

    @Transactional
    public JoinRequest requestToJoin(UUID userId, UUID whiteboardId) {
        // Verify whiteboard exists
        Whiteboard whiteboard = whiteboardRepository.findById(whiteboardId)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "id", whiteboardId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Check not already a member
        if (whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, userId)) {
            throw new BadRequestException("You are already a member of this whiteboard");
        }

        // Check no pending request
        if (joinRequestRepository.existsByUserIdAndWhiteboardIdAndStatus(
                userId, whiteboardId, JoinRequestStatus.PENDING)) {
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
        return saved;
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

        // Verify faculty has FACULTY role in the whiteboard
        verifyFacultyRole(facultyId, whiteboardId);

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
    }

    @Transactional
    public void enlistUser(UUID facultyId, UUID whiteboardId, String userEmail) {
        verifyFacultyRole(facultyId, whiteboardId);

        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        String normalizedEmail = normalizeEmail(userEmail);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", userEmail));

        // Check not already a member
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
                whiteboardId, facultyId, AuditAction.USER_ENLISTED,
                "User", user.getId(), null, normalizedEmail
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
                whiteboardId, facultyId, AuditAction.USER_REMOVED,
                "User", targetUserId, null, null
        );
    }

    @Transactional
    public void transferOwnership(UUID ownerId, UUID whiteboardId, String newOwnerEmail) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        // Verify current user is owner
        if (!whiteboard.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("Only the owner can transfer ownership");
        }

        User newOwner = userRepository.findByEmail(normalizeEmail(newOwnerEmail))
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", newOwnerEmail));

        // Verify new owner has FACULTY role
        if (newOwner.getRole() != Role.FACULTY) {
            throw new BadRequestException("Ownership can only be transferred to a faculty member");
        }

        // Update whiteboard owner
        whiteboard.setOwner(newOwner);
        whiteboardRepository.save(whiteboard);

        // Add new owner as FACULTY membership if not already a member
        if (!whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, newOwner.getId())) {
            WhiteboardMembership newMembership = WhiteboardMembership.builder()
                    .whiteboard(whiteboard)
                    .user(newOwner)
                    .role(Role.FACULTY)
                    .build();
            whiteboardMembershipRepository.save(newMembership);
        }

        // Remove original owner's membership entirely
        whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, ownerId)
                .ifPresent(whiteboardMembershipRepository::delete);

        auditLogService.logAction(
                whiteboardId, ownerId, AuditAction.OWNERSHIP_TRANSFERRED,
                "Whiteboard", whiteboardId, ownerId.toString(), newOwner.getId().toString()
        );
    }

    @Transactional
    public void inviteFaculty(UUID ownerId, UUID whiteboardId, String facultyEmail) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        // Verify current user is owner
        if (!whiteboard.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("Only the owner can invite faculty");
        }

        User faculty = userRepository.findByEmail(normalizeEmail(facultyEmail))
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", facultyEmail));

        // Verify user has FACULTY role
        if (faculty.getRole() != Role.FACULTY) {
            throw new BadRequestException("Can only invite users with FACULTY role");
        }

        // Check not already a member
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
    public void deleteWhiteboard(UUID ownerId, UUID whiteboardId) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        if (!whiteboard.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("Only the owner can delete the whiteboard");
        }

        auditLogService.logAction(
                whiteboardId, ownerId, AuditAction.WHITEBOARD_DELETED,
                "Whiteboard", whiteboardId, whiteboard.getCourseCode(), null
        );

        whiteboardRepository.delete(whiteboard);
    }

    @Transactional
    public void leaveWhiteboard(UUID userId, UUID whiteboardId) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        // Check user is not owner
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
    public List<Whiteboard> getWhiteboardsForUser(UUID userId) {
        return whiteboardMembershipRepository.findByUserId(userId).stream()
                .map(WhiteboardMembership::getWhiteboard)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<WhiteboardResponse> getWhiteboardResponsesForUser(UUID userId, Pageable pageable) {
        return whiteboardMembershipRepository.findByUserId(userId, pageable)
                .map(membership -> whiteboardMapper.toResponse(
                        membership.getWhiteboard(),
                        membership.getRole() == Role.FACULTY
                ));
    }

    @Transactional(readOnly = true)
    public Page<WhiteboardResponse> getDiscoverableWhiteboards(UUID userId, Pageable pageable) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return whiteboardRepository.findDiscoverableForUser(userId, pageable)
                .map(whiteboard -> whiteboardMapper.toResponse(whiteboard, false));
    }

    @Transactional(readOnly = true)
    public WhiteboardResponse getWhiteboardResponse(UUID userId, UUID whiteboardId) {
        WhiteboardMembership membership = verifyMembership(userId, whiteboardId);
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);
        return whiteboardMapper.toResponse(whiteboard, membership.getRole() == Role.FACULTY);
    }

    @Transactional(readOnly = true)
    public Whiteboard getWhiteboardById(UUID id) {
        return whiteboardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "id", id));
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
    public Page<JoinRequestResponse> getJoinRequestResponses(UUID facultyId, UUID whiteboardId, Pageable pageable) {
        verifyFacultyRole(facultyId, whiteboardId);
        return joinRequestRepository.findByWhiteboardIdAndStatusOrderByCreatedAtDesc(
                whiteboardId,
                JoinRequestStatus.PENDING,
                pageable
        ).map(joinRequestMapper::toResponse);
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
                .orElseThrow(() -> new UnauthorizedException(
                        "You are not a member of this whiteboard"));
    }

    @Transactional(readOnly = true)
    public void verifyFacultyRole(UUID userId, UUID whiteboardId) {
        WhiteboardMembership membership = verifyMembership(userId, whiteboardId);
        if (membership.getRole() != Role.FACULTY) {
            throw new UnauthorizedException("Only faculty members can perform this action");
        }
    }

    private String generateInviteCode() {
        int attempts = 0;
        while (attempts++ < INVITE_CODE_MAX_ATTEMPTS) {
            StringBuilder code = new StringBuilder(INVITE_CODE_LENGTH);
            for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
                code.append(INVITE_CODE_CHARS.charAt(secureRandom.nextInt(INVITE_CODE_CHARS.length())));
            }
            String inviteCode = code.toString();
            if (!whiteboardRepository.existsByInviteCodeIgnoreCase(inviteCode)) {
                return inviteCode;
            }
        }
        throw new IllegalStateException("Failed to generate a unique invite code");
    }

    private Whiteboard findWhiteboardByInviteCode(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) {
            throw new BadRequestException("Invite code is required");
        }
        return whiteboardRepository.findByInviteCodeIgnoreCase(inviteCode.trim())
                .orElseThrow(() -> new BadRequestException("Invalid invite code"));
    }

    private String normalizeCourseCode(String courseCode) {
        return courseCode.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeSemester(String semester) {
        return semester.trim();
    }

    private String normalizeSection(String section) {
        if (section == null) {
            return null;
        }
        String trimmed = section.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
