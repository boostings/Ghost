package com.ghost.controller;

import com.ghost.dto.request.VoteRequest;
import com.ghost.service.KarmaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/karma")
@RequiredArgsConstructor
public class KarmaController {

    private final KarmaService karmaService;

    @PostMapping("/questions/{id}/vote")
    public ResponseEntity<Void> voteOnQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @Valid @RequestBody VoteRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.voteOnQuestion(userId, id, request.getVoteType());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/comments/{id}/vote")
    public ResponseEntity<Void> voteOnComment(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id,
            @Valid @RequestBody VoteRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.voteOnComment(userId, id, request.getVoteType());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/questions/{id}/vote")
    public ResponseEntity<Void> removeQuestionVote(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.removeQuestionVote(userId, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/comments/{id}/vote")
    public ResponseEntity<Void> removeCommentVote(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        karmaService.removeCommentVote(userId, id);
        return ResponseEntity.noContent().build();
    }
}
