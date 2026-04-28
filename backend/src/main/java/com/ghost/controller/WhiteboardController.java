package com.ghost.controller;

import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.request.EmailRequest;
import com.ghost.dto.request.JoinRequestActionRequest;
import com.ghost.dto.request.JoinWhiteboardRequest;
import com.ghost.dto.request.TransferOwnershipRequest;
import com.ghost.dto.response.InviteInfoResponse;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.MemberResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.service.WhiteboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/whiteboards")
@RequiredArgsConstructor
public class WhiteboardController {

    private final WhiteboardService whiteboardService;

    @PostMapping
    public ResponseEntity<WhiteboardResponse> createWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody CreateWhiteboardRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        WhiteboardResponse whiteboard = whiteboardService.createWhiteboardResponse(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(whiteboard);
    }

    @GetMapping
    public ResponseEntity<PageResponse<WhiteboardResponse>> getWhiteboards(
            @AuthenticationPrincipal String userIdStr,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<WhiteboardResponse> whiteboards = whiteboardService.getWhiteboardResponsesForUser(userId, pageable);
        return ResponseEntity.ok(PageResponse.from(whiteboards));
    }

    @GetMapping("/discover")
    public ResponseEntity<PageResponse<WhiteboardResponse>> getDiscoverableWhiteboards(
            @AuthenticationPrincipal String userIdStr,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<WhiteboardResponse> discoverable = whiteboardService.getDiscoverableWhiteboards(userId, pageable);
        return ResponseEntity.ok(PageResponse.from(discoverable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WhiteboardResponse> getWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        WhiteboardResponse whiteboard = whiteboardService.getWhiteboardResponse(userId, id);
        return ResponseEntity.ok(whiteboard);
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
            @Valid @RequestBody JoinWhiteboardRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.joinByInviteCode(userId, id, request.getInviteCode());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/join-by-invite")
    public ResponseEntity<Void> joinWhiteboardByInvite(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody JoinWhiteboardRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.joinByInviteCode(userId, request.getInviteCode());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/request-join")
    public ResponseEntity<JoinRequestResponse> requestJoin(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        JoinRequestResponse joinRequest = whiteboardService.requestToJoinResponse(userId, id);
        return ResponseEntity.status(HttpStatus.CREATED).body(joinRequest);
    }

    @GetMapping("/{id}/join-requests")
    public ResponseEntity<PageResponse<JoinRequestResponse>> getJoinRequests(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<JoinRequestResponse> requests = whiteboardService.getJoinRequestResponses(userId, id, pageable);
        return ResponseEntity.ok(PageResponse.from(requests));
    }

    @PutMapping("/{id}/join-requests/{reqId}")
    public ResponseEntity<Void> handleJoinRequest(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @PathVariable UUID reqId,
            @Valid @RequestBody JoinRequestActionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.handleJoinRequest(userId, id, reqId, request.getStatus());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<PageResponse<MemberResponse>> getMembers(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<MemberResponse> members = whiteboardService.getMemberResponses(userId, id, pageable);
        return ResponseEntity.ok(PageResponse.from(members));
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
            @Valid @RequestBody EmailRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.enlistUser(userId, id, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/transfer-ownership")
    public ResponseEntity<Void> transferOwnership(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @Valid @RequestBody TransferOwnershipRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.transferOwnership(userId, id, request.getNewOwnerEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invite-faculty")
    public ResponseEntity<Void> inviteFaculty(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @Valid @RequestBody EmailRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.inviteFaculty(userId, id, request.getEmail());
        return ResponseEntity.noContent().build();
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
    public ResponseEntity<InviteInfoResponse> getInviteInfo(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(whiteboardService.getInviteInfo(userId, id));
    }
}
