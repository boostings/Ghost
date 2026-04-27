package com.ghost.service;

import com.ghost.dto.response.CourseSectionResponse;
import com.ghost.mapper.CourseSectionMapper;
import com.ghost.model.Course;
import com.ghost.model.CourseSection;
import com.ghost.model.Semester;
import com.ghost.repository.CourseSectionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseCatalogServiceTest {

    @Mock
    private CourseSectionRepository courseSectionRepository;

    @Mock
    private CourseSectionMapper courseSectionMapper;

    @InjectMocks
    private CourseCatalogService courseCatalogService;

    @Test
    void getSectionsSearchesCatalogWithNormalizedFilters() {
        Pageable pageable = PageRequest.of(0, 20);
        CourseSection section = CourseSection.builder()
                .id(UUID.randomUUID())
                .course(Course.builder().courseCode("IT326").courseName("Systems Analysis").build())
                .semester(Semester.builder().name("Fall 2026").build())
                .section("001")
                .classNumber("9001")
                .build();
        CourseSectionResponse mapped = CourseSectionResponse.builder()
                .id(section.getId())
                .courseCode("IT326")
                .courseName("Systems Analysis")
                .semester("Fall 2026")
                .section("001")
                .classNumber("9001")
                .build();

        when(courseSectionRepository.searchSections("Fall 2026", "systems", "IT", pageable))
                .thenReturn(new PageImpl<>(List.of(section), pageable, 1));
        when(courseSectionMapper.toResponse(section)).thenReturn(mapped);

        var result = courseCatalogService.getSections(" Fall 2026 ", " systems ", " it ", pageable);

        assertThat(result.getContent()).containsExactly(mapped);
        verify(courseSectionRepository).searchSections("Fall 2026", "systems", "IT", pageable);
    }

    @Test
    void getSectionsUsesNullFiltersForBlankValues() {
        Pageable pageable = PageRequest.of(0, 20);
        when(courseSectionRepository.searchSections(null, null, null, pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        courseCatalogService.getSections(" ", "", " ", pageable);

        ArgumentCaptor<String> semesterCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> queryCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
        verify(courseSectionRepository).searchSections(
                semesterCaptor.capture(),
                queryCaptor.capture(),
                subjectCaptor.capture(),
                org.mockito.ArgumentMatchers.eq(pageable)
        );
        assertThat(semesterCaptor.getValue()).isNull();
        assertThat(queryCaptor.getValue()).isNull();
        assertThat(subjectCaptor.getValue()).isNull();
    }

    @Test
    void createPageRequestBuildsValidatedSorts() {
        Pageable pageable = courseCatalogService.createPageRequest(1, 30, "teacher", "DESC");

        Sort.Order primaryOrder = pageable.getSort().getOrderFor("instructor");
        assertThat(pageable.getPageNumber()).isEqualTo(1);
        assertThat(pageable.getPageSize()).isEqualTo(30);
        assertThat(primaryOrder).isNotNull();
        assertThat(primaryOrder.getDirection()).isEqualTo(Sort.Direction.DESC);
        assertThat(primaryOrder.isIgnoreCase()).isTrue();
    }

}
