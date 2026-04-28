package com.ghost.controller;

import com.ghost.dto.request.EmailRequest;
import com.ghost.dto.request.JoinWhiteboardRequest;
import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.MemberResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.service.WhiteboardMembershipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/whiteboard-memberships")
@RequiredArgsConstructor
public class WhiteboardMembershipController {

    private final WhiteboardMembershipService whiteboardMembershipService;

    @PostMapping("/join-by-invite")
    public ResponseEntity<Void> joinByInviteCode(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody JoinWhiteboardRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardMembershipService.joinByInviteCode(userId, request.getInviteCode());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/join-demo")
    public ResponseEntity<Boolean> joinDemoWhiteboardIfAvailable(@AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(whiteboardMembershipService.joinDemoWhiteboardIfAvailable(userId));
    }

    @PostMapping("/whiteboards/{wbId}/enlist")
    public ResponseEntity<Void> enlistUser(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody EmailRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardMembershipService.enlistUser(userId, wbId, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/whiteboards/{wbId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID memberId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardMembershipService.removeMember(userId, wbId, memberId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/whiteboards/{wbId}/invite-faculty")
    public ResponseEntity<Void> inviteFaculty(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody EmailRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardMembershipService.inviteFaculty(userId, wbId, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/whiteboards/{wbId}/leave")
    public ResponseEntity<Void> leaveWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardMembershipService.leaveWhiteboard(userId, wbId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/whiteboards/{wbId}/members")
    public ResponseEntity<PageResponse<MemberResponse>> getMemberResponses(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<MemberResponse> members = whiteboardMembershipService.getMemberResponses(userId, wbId, pageable);
        return ResponseEntity.ok(PageResponse.from(members));
    }

    @GetMapping("/whiteboards/{wbId}/invite-info")
    public ResponseEntity<InviteInfoResponse> getInviteInfo(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(whiteboardMembershipService.getInviteInfo(userId, wbId));
    }
}
