package com.ghost.controller;

import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.request.JoinRequestActionRequest;
import com.ghost.dto.request.TransferOwnershipRequest;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.model.JoinRequest;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.repository.JoinRequestRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.service.WhiteboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/whiteboards")
@RequiredArgsConstructor
public class WhiteboardController {

    private final WhiteboardService whiteboardService;
    private final WhiteboardMembershipRepository whiteboardMembershipRepository;
    private final JoinRequestRepository joinRequestRepository;

    @PostMapping
    public ResponseEntity<WhiteboardResponse> createWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody CreateWhiteboardRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        Whiteboard whiteboard = whiteboardService.createWhiteboard(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToWhiteboardResponse(whiteboard));
    }

    @GetMapping
    public ResponseEntity<List<WhiteboardResponse>> getWhiteboards(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        List<Whiteboard> whiteboards = whiteboardService.getWhiteboardsForUser(userId);
        List<WhiteboardResponse> response = whiteboards.stream()
                .map(this::mapToWhiteboardResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WhiteboardResponse> getWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyMembership(userId, id);
        Whiteboard whiteboard = whiteboardService.getWhiteboardById(id);
        return ResponseEntity.ok(mapToWhiteboardResponse(whiteboard));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.deleteWhiteboard(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<Void> joinWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.joinByInviteCode(userId, body.get("inviteCode"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/request-join")
    public ResponseEntity<JoinRequestResponse> requestJoin(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        JoinRequest joinRequest = whiteboardService.requestToJoin(userId, id);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToJoinRequestResponse(joinRequest));
    }

    @GetMapping("/{id}/join-requests")
    public ResponseEntity<List<JoinRequestResponse>> getJoinRequests(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, id);
        List<JoinRequest> requests = joinRequestRepository.findByWhiteboardIdAndStatus(id, JoinRequestStatus.PENDING);
        List<JoinRequestResponse> response = requests.stream()
                .map(this::mapToJoinRequestResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/join-requests/{reqId}")
    public ResponseEntity<Void> handleJoinRequest(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @PathVariable UUID reqId,
            @Valid @RequestBody JoinRequestActionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.handleJoinRequest(userId, reqId, request.getStatus());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<UserResponse>> getMembers(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyMembership(userId, id);
        List<WhiteboardMembership> memberships = whiteboardService.getMembers(id);
        List<UserResponse> response = memberships.stream()
                .map(m -> mapToUserResponse(m.getUser()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @PathVariable UUID memberId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.removeMember(userId, id, memberId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/enlist")
    public ResponseEntity<Void> enlistUser(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.enlistUser(userId, id, body.get("email"));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/transfer-ownership")
    public ResponseEntity<Void> transferOwnership(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @Valid @RequestBody TransferOwnershipRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.transferOwnership(userId, id, request.getNewOwnerEmail());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/invite-faculty")
    public ResponseEntity<Void> inviteFaculty(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.inviteFaculty(userId, id, body.get("email"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<Void> leaveWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.leaveWhiteboard(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/invite-info")
    public ResponseEntity<Map<String, String>> getInviteInfo(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyFacultyRole(userId, id);
        Whiteboard whiteboard = whiteboardService.getWhiteboardById(id);
        Map<String, String> response = Map.of(
                "inviteCode", whiteboard.getInviteCode(),
                "qrData", "ghost://join/" + whiteboard.getInviteCode()
        );
        return ResponseEntity.ok(response);
    }

    private WhiteboardResponse mapToWhiteboardResponse(Whiteboard wb) {
        long memberCount = whiteboardMembershipRepository.countByWhiteboardId(wb.getId());
        User owner = wb.getOwner();
        return WhiteboardResponse.builder()
                .id(wb.getId())
                .courseCode(wb.getCourseCode())
                .courseName(wb.getCourseName())
                .section(wb.getSection())
                .semester(wb.getSemester())
                .ownerId(owner.getId())
                .ownerName(owner.getFirstName() + " " + owner.getLastName())
                .inviteCode(wb.getInviteCode())
                .isDemo(wb.isDemo())
                .memberCount(memberCount)
                .createdAt(wb.getCreatedAt())
                .build();
    }

    private JoinRequestResponse mapToJoinRequestResponse(JoinRequest jr) {
        User user = jr.getUser();
        return JoinRequestResponse.builder()
                .id(jr.getId())
                .userId(user.getId())
                .userName(user.getFirstName() + " " + user.getLastName())
                .userEmail(user.getEmail())
                .whiteboardId(jr.getWhiteboard().getId())
                .status(jr.getStatus())
                .createdAt(jr.getCreatedAt())
                .build();
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .karmaScore(user.getKarmaScore())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
