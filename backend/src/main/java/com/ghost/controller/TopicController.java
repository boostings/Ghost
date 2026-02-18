package com.ghost.controller;

import com.ghost.dto.response.TopicResponse;
import com.ghost.model.Topic;
import com.ghost.service.TopicService;
import com.ghost.service.WhiteboardService;
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
@RequestMapping("/api/whiteboards/{wbId}/topics")
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;
    private final WhiteboardService whiteboardService;

    @GetMapping
    public ResponseEntity<List<TopicResponse>> getTopics(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId) {
        UUID userId = UUID.fromString(userIdStr);
        whiteboardService.verifyMembership(userId, wbId);
        List<Topic> topics = topicService.getTopics(wbId);
        List<TopicResponse> response = topics.stream()
                .map(this::mapToTopicResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<TopicResponse> createTopic(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(userIdStr);
        Topic topic = topicService.createTopic(userId, wbId, body.get("name"));
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToTopicResponse(topic));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTopic(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID wbId,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        topicService.deleteTopic(userId, id);
        return ResponseEntity.noContent().build();
    }

    private TopicResponse mapToTopicResponse(Topic topic) {
        return TopicResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .isDefault(topic.isDefault())
                .build();
    }
}
