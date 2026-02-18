package com.ghost.controller;

import com.ghost.dto.request.CreateWhiteboardRequest;
import com.ghost.dto.request.JoinRequestActionRequest;
import com.ghost.dto.request.TransferOwnershipRequest;
import com.ghost.dto.response.JoinRequestResponse;
import com.ghost.dto.response.UserResponse;
import com.ghost.dto.response.WhiteboardResponse;
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
        WhiteboardResponse response = whiteboardService.createWhiteboard(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<WhiteboardResponse>> getWhiteboards(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        List<WhiteboardResponse> response = whiteboardService.getUserWhiteboards(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WhiteboardResponse> getWhiteboard(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        WhiteboardResponse response = whiteboardService.getWhiteboard(userId, id);
        return ResponseEntity.ok(response);
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
        whiteboardService.joinWhiteboard(userId, id, body.get("inviteCode"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/request-join")
    public ResponseEntity<JoinRequestResponse> requestJoin(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        JoinRequestResponse response = whiteboardService.requestJoin(userId, id);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}/join-requests")
    public ResponseEntity<List<JoinRequestResponse>> getJoinRequests(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        List<JoinRequestResponse> response = whiteboardService.getJoinRequests(userId, id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/join-requests/{reqId}")
    public ResponseEntity<Void> handleJoinRequest(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @PathVariable UUID reqId,
            @Valid @RequestBody JoinRequestActionRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.handleJoinRequest(userId, id, reqId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<UserResponse>> getMembers(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        List<UserResponse> response = whiteboardService.getMembers(userId, id);
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
        whiteboardService.transferOwnership(userId, id, request);
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
        Map<String, String> response = whiteboardService.getInviteInfo(userId, id);
        return ResponseEntity.ok(response);
    }
}
