package com.ghost.service;

import com.ghost.dto.response.CourseSectionResponse;
import com.ghost.exception.BadRequestException;
import com.ghost.mapper.CourseSectionMapper;
import com.ghost.repository.CourseSectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CourseCatalogService {

    private static final String DEFAULT_SORT_KEY = "courseCode";
    private static final Map<String, SortSpec> SORTS = Map.ofEntries(
            Map.entry("courseCode", new SortSpec("course.courseCode", true)),
            Map.entry("classCode", new SortSpec("course.courseCode", true)),
            Map.entry("courseName", new SortSpec("course.courseName", true)),
            Map.entry("title", new SortSpec("course.courseName", true)),
            Map.entry("subject", new SortSpec("course.subject", true)),
            Map.entry("classType", new SortSpec("course.subject", true)),
            Map.entry("catalogNumber", new SortSpec("course.catalogNumber", true)),
            Map.entry("section", new SortSpec("section", true)),
            Map.entry("classNumber", new SortSpec("classNumber", true)),
            Map.entry("teacher", new SortSpec("instructor", true)),
            Map.entry("instructor", new SortSpec("instructor", true)),
            Map.entry("session", new SortSpec("session", true)),
            Map.entry("career", new SortSpec("career", true)),
            Map.entry("instructionMode", new SortSpec("instructionMode", true)),
            Map.entry("meetingTimes", new SortSpec("meetingTimes", true)),
            Map.entry("weeks", new SortSpec("numberOfWeeks", false)),
            Map.entry("numberOfWeeks", new SortSpec("numberOfWeeks", false)),
            Map.entry("openSection", new SortSpec("openSection", false)),
            Map.entry("lowCostMaterials", new SortSpec("lowCostMaterialsSection", false)),
            Map.entry("noCostMaterials", new SortSpec("noCostMaterialsSection", false)),
            Map.entry("department", new SortSpec("course.departmentName", true)),
            Map.entry("credit", new SortSpec("course.credit", true)),
            Map.entry("semester", new SortSpec("semester.name", true))
    );

    private final CourseSectionRepository courseSectionRepository;
    private final CourseSectionMapper courseSectionMapper;

    public Pageable createPageRequest(int page, int size, String sortBy, String sortDirection) {
        SortSpec sortSpec = SORTS.get(normalizeSortKey(sortBy));
        if (sortSpec == null) {
            throw new BadRequestException("Unsupported course catalog sort: " + sortBy);
        }

        Sort.Direction direction = parseDirection(sortDirection);
        Sort.Order primaryOrder = new Sort.Order(direction, sortSpec.property()).nullsLast();
        if (sortSpec.ignoreCase()) {
            primaryOrder = primaryOrder.ignoreCase();
        }

        Sort sort = Sort.by(primaryOrder)
                .and(Sort.by(Sort.Order.asc("course.courseCode").ignoreCase()))
                .and(Sort.by(Sort.Order.asc("section").ignoreCase()))
                .and(Sort.by(Sort.Order.asc("classNumber").ignoreCase()));
        return PageRequest.of(page, size, sort);
    }

    @Transactional(readOnly = true)
    public Page<CourseSectionResponse> getSections(
            String semester,
            String query,
            String subject,
            Pageable pageable
    ) {
        String normalizedSemester = normalizeOptional(semester);
        String normalizedQuery = normalizeOptional(query);
        String normalizedSubject = normalizeUpperOptional(subject);
        String squashedQuery = normalizedQuery == null ? null : normalizedQuery.replaceAll("\\s+", "");

        return courseSectionRepository
                .searchSections(normalizedSemester, normalizedQuery, squashedQuery, normalizedSubject, pageable)
                .map(courseSectionMapper::toResponse);
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeUpperOptional(String value) {
        String normalized = normalizeOptional(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private String normalizeSortKey(String sortBy) {
        String normalized = normalizeOptional(sortBy);
        return normalized == null ? DEFAULT_SORT_KEY : normalized;
    }

    private Sort.Direction parseDirection(String sortDirection) {
        if (sortDirection == null || sortDirection.isBlank()) {
            return Sort.Direction.ASC;
        }
        try {
            return Sort.Direction.fromString(sortDirection);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported course catalog sort direction: " + sortDirection);
        }
    }

    private record SortSpec(String property, boolean ignoreCase) {
    }
}
