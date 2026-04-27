package com.ghost.controller;

import com.ghost.dto.response.CourseSectionResponse;
import com.ghost.dto.response.PageResponse;
import com.ghost.service.CourseCatalogImportResult;
import com.ghost.service.CourseCatalogImportService;
import com.ghost.service.CourseCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CourseCatalogController {

    private final CourseCatalogService courseCatalogService;
    private final CourseCatalogImportService courseCatalogImportService;

    @GetMapping("/api/course-catalog/sections")
    public ResponseEntity<PageResponse<CourseSectionResponse>> getSections(
            @RequestParam(required = false) String semester,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) String subject,
            @RequestParam(defaultValue = "courseCode") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = courseCatalogService.createPageRequest(
                page,
                Math.min(Math.max(size, 1), 100),
                sortBy,
                sortDirection
        );
        return ResponseEntity.ok(PageResponse.from(courseCatalogService.getSections(
                semester,
                query,
                subject,
                pageable
        )));
    }

    @PostMapping("/api/faculty/course-catalog/import")
    public ResponseEntity<CourseCatalogImportResult> importCatalog(
            @AuthenticationPrincipal String userIdStr) {
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(courseCatalogImportService.importAllowedTerms(userId));
    }
}
