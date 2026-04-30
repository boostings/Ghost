package com.ghost.service;

import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.MemberResponse;
import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.exception.ForbiddenException;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.model.Course;
import com.ghost.model.JoinRequest;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
    private final AuditLogService auditLogService;
    private final CourseService courseService;
    private final SemesterService semesterService;
    private final InviteCodeService inviteCodeService;
    private final TopicService topicService;
    private final WhiteboardResponseAssembler whiteboardResponseAssembler;
    private final WhiteboardMembershipService whiteboardMembershipService;
    private final WhiteboardJoinRequestService whiteboardJoinRequestService;

    @Transactional
    public Whiteboard createWhiteboard(UUID facultyId, CreateWhiteboardRequest req) {
        User faculty = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));

        if (!faculty.isFaculty()) {
            throw new ForbiddenException("Only faculty members can create whiteboards");
        }

        String normalizedCourseCode = normalizeCourseCode(req.getCourseCode());
        String normalizedSemester = normalizeSemester(req.getSemester());
        String normalizedCourseName = req.getCourseName().trim();
        String normalizedSection = normalizeSection(req.getSection());

        Course course = courseService.findOrCreate(normalizedCourseCode, normalizedCourseName, normalizedSection);
        Semester semester = semesterService.findOrCreate(normalizedSemester);

        Optional<Whiteboard> existing = whiteboardRepository.findByCourseCourseCodeAndCourseSectionAndSemesterName(
                normalizedCourseCode,
                normalizedSection,
                normalizedSemester
        );

        if (existing.isPresent()) {
            Whiteboard existingWhiteboard = existing.get();
            int inserted = whiteboardMembershipRepository.insertMembershipIfAbsent(
                    UUID.randomUUID(),
                    existingWhiteboard.getId(),
                    facultyId,
                    Role.FACULTY.name()
            );
            if (inserted == 1) {
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

        String inviteCode = inviteCodeService.generate();

        Whiteboard whiteboard = Whiteboard.builder()
                .course(course)
                .semester(semester)
                .owner(faculty)
                .inviteCode(inviteCode)
                .build();

        whiteboard = whiteboardRepository.save(whiteboard);

        whiteboardMembershipRepository.insertMembershipIfAbsent(
                UUID.randomUUID(),
                whiteboard.getId(),
                facultyId,
                Role.FACULTY.name()
        );

        topicService.createDefaultTopics(whiteboard.getId(), facultyId);

        auditLogService.logAction(
                whiteboard.getId(),
                facultyId,
                AuditAction.WHITEBOARD_CREATED,
                "Whiteboard",
                whiteboard.getId(),
                null,
                whiteboard.getCourse().getCourseCode()
        );

        return whiteboard;
    }

    @Transactional
    public WhiteboardResponse createWhiteboardResponse(UUID facultyId, CreateWhiteboardRequest req) {
        Whiteboard whiteboard = createWhiteboard(facultyId, req);
        return whiteboardResponseAssembler.toResponse(whiteboard, true, facultyId);
    }

    @Transactional
    public void joinByInviteCode(UUID userId, UUID whiteboardId, String inviteCode) {
        whiteboardMembershipService.joinByInviteCode(userId, whiteboardId, inviteCode);
    }

    @Transactional
    public void joinByInviteCode(UUID userId, String inviteCode) {
        whiteboardMembershipService.joinByInviteCode(userId, inviteCode);
    }

    @Transactional
    public JoinRequest requestToJoin(UUID userId, UUID whiteboardId) {
        return whiteboardJoinRequestService.requestToJoin(userId, whiteboardId);
    }

    @Transactional
    public JoinRequestResponse requestToJoinResponse(UUID userId, UUID whiteboardId) {
        return whiteboardJoinRequestService.requestToJoinResponse(userId, whiteboardId);
    }

    @Transactional
    public void handleJoinRequest(UUID facultyId, UUID whiteboardId, UUID requestId, JoinRequestStatus status) {
        whiteboardJoinRequestService.handleJoinRequest(facultyId, whiteboardId, requestId, status);
    }

    @Transactional
    public void enlistUser(UUID facultyId, UUID whiteboardId, String userEmail) {
        whiteboardMembershipService.enlistUser(facultyId, whiteboardId, userEmail);
    }

    @Transactional
    public void removeMember(UUID facultyId, UUID whiteboardId, UUID targetUserId) {
        whiteboardMembershipService.removeMember(facultyId, whiteboardId, targetUserId);
    }

    @Transactional
    public void transferOwnership(UUID ownerId, UUID whiteboardId, String newOwnerEmail) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        if (!whiteboard.getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("Only the owner can transfer ownership");
        }

        User newOwner = userRepository.findByEmail(normalizeEmail(newOwnerEmail))
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", newOwnerEmail));

        if (!newOwner.isFaculty()) {
            throw new ForbiddenException("Ownership can only be transferred to a faculty member");
        }

        whiteboard.setOwner(newOwner);
        whiteboardRepository.save(whiteboard);

        whiteboardMembershipRepository.insertMembershipIfAbsent(
                UUID.randomUUID(),
                whiteboardId,
                newOwner.getId(),
                Role.FACULTY.name()
        );

        whiteboardMembershipRepository.findByWhiteboardIdAndUserId(whiteboardId, ownerId)
                .ifPresent(whiteboardMembershipRepository::delete);

        auditLogService.logAction(
                whiteboardId,
                ownerId,
                AuditAction.OWNERSHIP_TRANSFERRED,
                "Whiteboard",
                whiteboardId,
                ownerId.toString(),
                newOwner.getId().toString()
        );
    }

    @Transactional
    public void inviteFaculty(UUID ownerId, UUID whiteboardId, String facultyEmail) {
        whiteboardMembershipService.inviteFaculty(ownerId, whiteboardId, facultyEmail);
    }

    @Transactional
    public void deleteWhiteboard(UUID ownerId, UUID whiteboardId) {
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);

        if (!whiteboard.getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("Only the owner can delete the whiteboard");
        }

        String courseCode = whiteboard.getCourse().getCourseCode();
        whiteboardRepository.delete(whiteboard);
        whiteboardRepository.flush();

        auditLogService.logAction(
                null,
                ownerId,
                AuditAction.WHITEBOARD_DELETED,
                "Whiteboard",
                whiteboardId,
                courseCode,
                null
        );
    }

    @Transactional
    public void leaveWhiteboard(UUID userId, UUID whiteboardId) {
        whiteboardMembershipService.leaveWhiteboard(userId, whiteboardId);
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
                .map(membership -> whiteboardResponseAssembler.toResponse(
                        membership.getWhiteboard(),
                        membership.getRole() == Role.FACULTY,
                        userId
                ));
    }

    @Transactional(readOnly = true)
    public Page<WhiteboardResponse> getDiscoverableWhiteboards(UUID userId, Pageable pageable) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return whiteboardRepository.findDiscoverableForUser(userId, pageable)
                .map(whiteboard -> whiteboardResponseAssembler.toResponse(whiteboard, false, userId));
    }

    @Transactional(readOnly = true)
    public WhiteboardResponse getWhiteboardResponse(UUID userId, UUID whiteboardId) {
        WhiteboardMembership membership = verifyMembership(userId, whiteboardId);
        Whiteboard whiteboard = getWhiteboardById(whiteboardId);
        return whiteboardResponseAssembler.toResponse(
                whiteboard,
                membership.getRole() == Role.FACULTY,
                userId
        );
    }

    @Transactional(readOnly = true)
    public Whiteboard getWhiteboardById(UUID id) {
        return whiteboardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard", "id", id));
    }

    @Transactional(readOnly = true)
    public List<WhiteboardMembership> getMembers(UUID whiteboardId) {
        return whiteboardMembershipService.getMembers(whiteboardId);
    }

    @Transactional(readOnly = true)
    public Page<MemberResponse> getMemberResponses(UUID userId, UUID whiteboardId, Pageable pageable) {
        return whiteboardMembershipService.getMemberResponses(userId, whiteboardId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<JoinRequestResponse> getJoinRequestResponses(UUID facultyId, UUID whiteboardId, Pageable pageable) {
        return whiteboardJoinRequestService.getJoinRequestResponses(facultyId, whiteboardId, pageable);
    }

    @Transactional(readOnly = true)
    public InviteInfoResponse getInviteInfo(UUID facultyId, UUID whiteboardId) {
        return whiteboardMembershipService.getInviteInfo(facultyId, whiteboardId);
    }

    @Transactional(readOnly = true)
    public WhiteboardMembership verifyMembership(UUID userId, UUID whiteboardId) {
        return whiteboardMembershipService.verifyMembership(userId, whiteboardId);
    }

    @Transactional(readOnly = true)
    public WhiteboardMembership verifyFacultyRole(UUID userId, UUID whiteboardId) {
        return whiteboardMembershipService.verifyFacultyRole(userId, whiteboardId);
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
