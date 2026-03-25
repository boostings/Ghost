package com.ghost.service;

import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.UnauthorizedException;
import com.ghost.mapper.WhiteboardMapper;
import com.ghost.model.Course;
import com.ghost.model.JoinRequest;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.AuditAction;
import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.model.enums.Role;
import com.ghost.repository.CourseRepository;
import com.ghost.repository.SemesterRepository;
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
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhiteboardService {

    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final TopicService topicService;
    private final WhiteboardMapper whiteboardMapper;
    private final WhiteboardMembershipService whiteboardMembershipService;
    private final WhiteboardJoinRequestService whiteboardJoinRequestService;

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

        Course course = getOrCreateCourse(normalizedCourseCode, normalizedCourseName, normalizedSection);
        Semester semester = getOrCreateSemester(normalizedSemester);

        Optional<Whiteboard> existing = whiteboardRepository.findByCourseCourseCodeAndSemesterName(
                normalizedCourseCode,
                normalizedSemester
        );

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

        String inviteCode = generateInviteCode();

        Whiteboard whiteboard = Whiteboard.builder()
                .course(course)
                .semester(semester)
                .owner(faculty)
                .inviteCode(inviteCode)
                .build();

        whiteboard = whiteboardRepository.save(whiteboard);

        WhiteboardMembership membership = WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(faculty)
                .role(Role.FACULTY)
                .build();
        whiteboardMembershipRepository.save(membership);

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
        return whiteboardMapper.toResponse(whiteboard, true);
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
            throw new UnauthorizedException("Only the owner can transfer ownership");
        }

        User newOwner = userRepository.findByEmail(normalizeEmail(newOwnerEmail))
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", newOwnerEmail));

        if (newOwner.getRole() != Role.FACULTY) {
            throw new UnauthorizedException("Ownership can only be transferred to a faculty member");
        }

        whiteboard.setOwner(newOwner);
        whiteboardRepository.save(whiteboard);

        if (!whiteboardMembershipRepository.existsByWhiteboardIdAndUserId(whiteboardId, newOwner.getId())) {
            WhiteboardMembership newMembership = WhiteboardMembership.builder()
                    .whiteboard(whiteboard)
                    .user(newOwner)
                    .role(Role.FACULTY)
                    .build();
            whiteboardMembershipRepository.save(newMembership);
        }

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
            throw new UnauthorizedException("Only the owner can delete the whiteboard");
        }

        auditLogService.logAction(
                whiteboardId,
                ownerId,
                AuditAction.WHITEBOARD_DELETED,
                "Whiteboard",
                whiteboardId,
                whiteboard.getCourse().getCourseCode(),
                null
        );

        whiteboardRepository.delete(whiteboard);
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
        return whiteboardMembershipService.getMembers(whiteboardId);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getMemberResponses(UUID userId, UUID whiteboardId, Pageable pageable) {
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

    private Course getOrCreateCourse(String courseCode, String courseName, String section) {
        Optional<Course> existing = courseRepository.findByCourseCode(courseCode);
        if (existing.isPresent()) {
            Course course = existing.get();
            if ((course.getSection() == null || course.getSection().isBlank()) && section != null) {
                course.setSection(section);
                return courseRepository.save(course);
            }
            return course;
        }

        return courseRepository.save(Course.builder()
                .courseCode(courseCode)
                .courseName(courseName)
                .section(section)
                .build());
    }

    private Semester getOrCreateSemester(String semesterName) {
        return semesterRepository.findByName(semesterName)
                .orElseGet(() -> semesterRepository.save(Semester.builder()
                        .name(semesterName)
                        .build()));
    }
}
