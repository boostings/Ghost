package com.ghost.controller;

import com.ghost.dto.response.BookmarkResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.service.BookmarkService;
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
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping
    public ResponseEntity<PageResponse<BookmarkResponse>> getBookmarks(
            @AuthenticationPrincipal String userIdStr,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(userIdStr);
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<BookmarkResponse> bookmarks = bookmarkService.getBookmarks(userId, pageable);
        return ResponseEntity.ok(PageResponse.from(bookmarks));
    }

    @PostMapping("/questions/{id}")
    public ResponseEntity<Void> bookmarkQuestion(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        bookmarkService.bookmark(userId, id);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> removeBookmark(
            @AuthenticationPrincipal String userIdStr,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(userIdStr);
        bookmarkService.removeBookmark(userId, id);
        return ResponseEntity.noContent().build();
    }
}
