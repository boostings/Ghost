package com.ghost.controller;

import com.ghost.dto.response.PageResponse;
import com.ghost.dto.response.QuestionResponse;
import com.ghost.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/questions")
    public ResponseEntity<PageResponse<QuestionResponse>> searchQuestions(
            @AuthenticationPrincipal String userIdStr,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID whiteboard,
            @RequestParam(required = false) UUID topic,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<QuestionResponse> questionPage = searchService.search(userId, q, whiteboard, topic, status, pageable);
        return ResponseEntity.ok(PageResponse.from(questionPage));
    }
}
