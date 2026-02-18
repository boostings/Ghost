package com.ghost.service;

import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.exception.BadRequestException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.model.JoinRequest;
import com.ghost.model.Topic;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.JoinRequestRepository;
import com.ghost.repository.TopicRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhiteboardService {

    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final UserRepository userRepository;
    private final TopicRepository topicRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final AuditLogService auditLogService;

    private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int INVITE_CODE_LENGTH = 8;
    private static final List<String> DEFAULT_TOPIC_NAMES = Arrays.asList(
            "Homework", "Exam", "Lecture", "General"
    );

    @Transactional
    public Whiteboard createWhiteboard(UUID facultyId, CreateWhiteboardRequest req) {
        User faculty = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));

        if (faculty.getRole() != Role.FACULTY) {
            throw new UnauthorizedException("Only faculty members can create whiteboards");
        }

        // Auto-merge: return existing whiteboard if one already exists for this courseCode+semester
        Optional<Whiteboard> existing = whiteboardRepository.findByCourseCodeAndSemester(
                req.getCourseCode(), req.getSemester());
        if (existing.isPresent()) {
            return existing.get();
        }

        // Generate random 8-char invite code
        String inviteCode = generateInviteCode();

        Whiteboard whiteboard = Whiteboard.builder()
                .courseCode(req.getCourseCode())
                .courseName(req.getCourseName())
                .section(req.getSection())
                .semester(req.getSemester())
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
        createDefaultTopics(whiteboard);

        // Log audit
        auditLogService.logAction(
                whiteboard.getId(), facultyId, AuditAction.WHITEBOARD_CREATED,
                "Whiteboard", whiteboard.getId(), null, whiteboard.getCourseCode()
        );

        return whiteboard;
    }

    @Transactional
    public void joinByInviteCode(UUID userId, String inviteCode) {
        Whiteboard whiteboard = whiteboardRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "inviteCode", inviteCode));

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

        return joinRequestRepository.save(joinRequest);
    }

    @Transactional
    public void handleJoinRequest(UUID facultyId, UUID requestId, JoinRequestStatus status) {
        JoinRequest joinRequest = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("JoinRequest", "id", requestId));

        // Verify faculty has FACULTY role in the whiteboard
        verifyFacultyRole(facultyId, joinRequest.getWhiteboard().getId());

        User reviewer = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));

        if (status == JoinRequestStatus.APPROVED) {
            // Add membership
            WhiteboardMembership membership = WhiteboardMembership.builder()
                    .whiteboard(joinRequest.getWhiteboard())
                    .user(joinRequest.getUser())
                    .role(Role.STUDENT)
                    .build();
            whiteboardMembershipRepository.save(membership);
        }

        joinRequest.setStatus(status);
        joinRequest.setReviewedByUser(reviewer);
        joinRequestRepository.save(joinRequest);
    }

    @Transactional
    public void enlistUser(UUID facultyId, UUID whiteboardId, String userEmail) {
        verifyFacultyRole(facultyId, whiteboardId);

        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        User user = userRepository.findByEmail(userEmail.toLowerCase())
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
                "User", user.getId(), null, userEmail
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

        User newOwner = userRepository.findByEmail(newOwnerEmail.toLowerCase())
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

        User faculty = userRepository.findByEmail(facultyEmail.toLowerCase())
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
    }

    @Transactional(readOnly = true)
    public List<Whiteboard> getWhiteboardsForUser(UUID userId) {
        List<WhiteboardMembership> memberships = whiteboardMembershipRepository.findByUserId(userId);
        return memberships.stream()
                .map(WhiteboardMembership::getWhiteboard)
                .collect(Collectors.toList());
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
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            code.append(INVITE_CODE_CHARS.charAt(random.nextInt(INVITE_CODE_CHARS.length())));
        }
        return code.toString();
    }

    private void createDefaultTopics(Whiteboard whiteboard) {
        for (String topicName : DEFAULT_TOPIC_NAMES) {
            Topic topic = Topic.builder()
                    .whiteboard(whiteboard)
                    .name(topicName)
                    .isDefault(true)
                    .build();
            topicRepository.save(topic);
        }
    }
}
