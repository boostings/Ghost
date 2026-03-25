package com.ghost.controller;

import com.ghost.dto.response.QuestionResponse;
import com.ghost.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionLookupController {

    private final QuestionService questionService;

    @GetMapping("/{id}")
    public ResponseEntity<QuestionResponse> getQuestionById(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        QuestionResponse question = questionService.getQuestionById(userId, id);
        return ResponseEntity.ok(question);
    }
}
