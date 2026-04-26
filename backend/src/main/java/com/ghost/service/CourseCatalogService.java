package com.ghost.service;

import com.ghost.dto.response.CourseSectionResponse;
import com.ghost.mapper.CourseSectionMapper;
import com.ghost.repository.CourseSectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseCatalogService {

    private final CourseSectionRepository courseSectionRepository;
    private final CourseSectionMapper courseSectionMapper;

    @Transactional(readOnly = true)
    public Page<CourseSectionResponse> getSections(String semester, Pageable pageable) {
        if (semester == null || semester.isBlank()) {
            return courseSectionRepository.findAll(pageable).map(courseSectionMapper::toResponse);
        }
        return courseSectionRepository
                .findBySemesterNameOrderByCourseCourseCodeAscSectionAsc(semester.trim(), pageable)
                .map(courseSectionMapper::toResponse);
    }
}
