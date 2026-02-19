package com.ghost.controller;

import com.ghost.dto.request.CreateTopicRequest;
import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.TopicResponse;
import com.ghost.service.TopicService;
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
@RequestMapping("/api/whiteboards/{wbId}/topics")
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;

    @GetMapping
    public ResponseEntity<PageResponse<TopicResponse>> getTopics(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<TopicResponse> topics = topicService.getTopics(userId, wbId, pageable);
        return ResponseEntity.ok(PageResponse.from(topics));
    }

    @PostMapping
    public ResponseEntity<TopicResponse> createTopic(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @Valid @RequestBody CreateTopicRequest request) {
        UUID userId = UUID.fromString(userIdStr);
        TopicResponse topic = topicService.createTopic(userId, wbId, request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(topic);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTopic(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        topicService.deleteTopic(userId, wbId, id);
        return ResponseEntity.noContent().build();
    }
}
