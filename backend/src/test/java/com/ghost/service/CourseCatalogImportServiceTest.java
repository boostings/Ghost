package com.ghost.service;

import com.ghost.model.Course;
import com.ghost.model.CourseSection;
import com.ghost.model.FacultyUser;
import com.ghost.model.Semester;
import com.ghost.model.enums.AuditAction;
import com.ghost.repository.CourseRepository;
import com.ghost.repository.CourseSectionRepository;
import com.ghost.repository.SemesterRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CourseCatalogImportServiceTest {

    private final UUID facultyId = UUID.randomUUID();

    @Test
    void importAllowedTermsOnlyPersistsSummerFallAndWinter2026Sections() {
        CourseFinderClient courseFinderClient = mock(CourseFinderClient.class);
        CourseRepository courseRepository = mock(CourseRepository.class);
        SemesterRepository semesterRepository = mock(SemesterRepository.class);
        CourseSectionRepository courseSectionRepository = mock(CourseSectionRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        WhiteboardRepository whiteboardRepository = mock(WhiteboardRepository.class);
        CourseCatalogImportService service = new CourseCatalogImportService(
                courseFinderClient,
                courseRepository,
                semesterRepository,
                courseSectionRepository,
                userRepository,
                auditLogService
        );

        CourseFinderSection summerSection = section("Summer 2026", "IT", "326", "Systems Analysis", "001", "9001");
        CourseFinderSection fallSection = section("Fall 2026", "ACC", "131", "Financial Accounting", "1", "3853");
        CourseFinderSection winterSection = section("Winter 2026", "MAT", "102", "College Algebra", "01", "7001");

        when(courseFinderClient.fetchSections("Summer 2026")).thenReturn(List.of(summerSection));
        when(courseFinderClient.fetchSections("Fall 2026")).thenReturn(List.of(fallSection));
        when(courseFinderClient.fetchSections("Winter 2026")).thenReturn(List.of(winterSection));
        when(userRepository.findById(facultyId)).thenReturn(Optional.of(FacultyUser.builder().id(facultyId).build()));
        when(courseRepository.findByCourseCodeAndSectionIsNull(any())).thenReturn(Optional.empty());
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(semesterRepository.findByName(any())).thenReturn(Optional.empty());
        when(semesterRepository.save(any(Semester.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(courseSectionRepository.findBySourceObjectId(any())).thenReturn(Optional.empty());
        when(courseSectionRepository.save(any(CourseSection.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CourseCatalogImportResult result = service.importAllowedTerms(facultyId);

        assertThat(result.allowedTerms()).containsExactly("Summer 2026", "Fall 2026", "Winter 2026");
        assertThat(result.sectionsImported()).isEqualTo(3);
        verify(courseFinderClient).fetchSections("Summer 2026");
        verify(courseFinderClient).fetchSections("Fall 2026");
        verify(courseFinderClient).fetchSections("Winter 2026");
        verify(courseFinderClient, never()).fetchSections("Spring 2026");
        verify(whiteboardRepository, never()).save(any());
        verify(auditLogService).logAction(
                null,
                facultyId,
                AuditAction.COURSE_CATALOG_IMPORTED,
                "CourseCatalog",
                null,
                null,
                "Imported 3 course sections"
        );

        ArgumentCaptor<Course> courseCaptor = ArgumentCaptor.forClass(Course.class);
        verify(courseRepository, times(3)).save(courseCaptor.capture());
        assertThat(courseCaptor.getAllValues())
                .extracting(Course::getCourseCode)
                .containsExactly("IT326", "ACC131", "MAT102");
        assertThat(courseCaptor.getAllValues().get(0).getSubject()).isEqualTo("IT");
        assertThat(courseCaptor.getAllValues().get(0).getCatalogNumber()).isEqualTo("326");

        ArgumentCaptor<CourseSection> sectionCaptor = ArgumentCaptor.forClass(CourseSection.class);
        verify(courseSectionRepository, times(3)).save(sectionCaptor.capture());
        assertThat(sectionCaptor.getAllValues().get(0).getSemester().getName()).isEqualTo("Summer 2026");
        assertThat(sectionCaptor.getAllValues().get(0).getSection()).isEqualTo("001");
        assertThat(sectionCaptor.getAllValues().get(0).getClassNumber()).isEqualTo("9001");
    }

    @Test
    void importerUpdatesExistingSectionRowsBySourceObjectId() {
        CourseFinderClient courseFinderClient = mock(CourseFinderClient.class);
        CourseRepository courseRepository = mock(CourseRepository.class);
        SemesterRepository semesterRepository = mock(SemesterRepository.class);
        CourseSectionRepository courseSectionRepository = mock(CourseSectionRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        CourseCatalogImportService service = new CourseCatalogImportService(
                courseFinderClient,
                courseRepository,
                semesterRepository,
                courseSectionRepository,
                userRepository,
                auditLogService
        );
        Course course = Course.builder().courseCode("IT326").courseName("Systems Analysis").build();
        Semester semester = Semester.builder().name("Fall 2026").build();
        CourseSection existing = CourseSection.builder()
                .course(course)
                .semester(semester)
                .sourceObjectId("it326-fall")
                .section("001")
                .classNumber("9001")
                .instructor("Old Instructor")
                .build();

        when(courseFinderClient.fetchSections("Summer 2026")).thenReturn(List.of());
        when(courseFinderClient.fetchSections("Fall 2026"))
                .thenReturn(List.of(section("Fall 2026", "IT", "326", "Systems Analysis", "001", "9001")));
        when(courseFinderClient.fetchSections("Winter 2026")).thenReturn(List.of());
        when(userRepository.findById(facultyId)).thenReturn(Optional.of(FacultyUser.builder().id(facultyId).build()));
        when(courseRepository.findByCourseCodeAndSectionIsNull("IT326")).thenReturn(Optional.of(course));
        when(semesterRepository.findByName("Fall 2026")).thenReturn(Optional.of(semester));
        when(courseSectionRepository.findBySourceObjectId("Fall-2026-IT326-001-9001")).thenReturn(Optional.of(existing));
        when(courseSectionRepository.save(existing)).thenReturn(existing);

        CourseCatalogImportResult result = service.importAllowedTerms(facultyId);

        assertThat(result.sectionsImported()).isEqualTo(1);
        assertThat(existing.getInstructor()).isEqualTo("New Instructor");
        verify(courseSectionRepository).save(existing);
    }

    private CourseFinderSection section(
            String term,
            String subject,
            String catalogNumber,
            String title,
            String section,
            String classNumber
    ) {
        return CourseFinderSection.builder()
                .sourceObjectId(sourceObjectId(term, subject, catalogNumber, section, classNumber))
                .sourceCourseId("course-" + subject + catalogNumber)
                .subject(subject)
                .catalogNumber(catalogNumber)
                .courseTitle(title)
                .courseDescription(title + " description")
                .departmentName("Information Technology (IT)")
                .credit("3.00")
                .term(term)
                .termId("2272")
                .section(section)
                .classNumber(classNumber)
                .instructor("New Instructor")
                .session("Full Semester")
                .career("Undergraduate")
                .instructionMode("In Person")
                .meetingPattern(List.of("Mo We"))
                .meetingTimes(List.of("09:00AM - 10:15AM"))
                .numberOfWeeks(16)
                .openSection(true)
                .lowCostMaterialsSection(false)
                .noCostMaterialsSection(true)
                .build();
    }

    private String sourceObjectId(
            String term,
            String subject,
            String catalogNumber,
            String section,
            String classNumber
    ) {
        return term.replace(" ", "-") + "-" + subject + catalogNumber + "-" + section + "-" + classNumber;
    }
}
