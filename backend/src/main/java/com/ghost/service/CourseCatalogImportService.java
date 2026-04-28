package com.ghost.service;

import com.ghost.model.Course;
import com.ghost.model.CourseSection;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.enums.AuditAction;
import com.ghost.exception.ResourceNotFoundException;
import com.ghost.exception.ForbiddenException;
import com.ghost.repository.CourseRepository;
import com.ghost.repository.CourseSectionRepository;
import com.ghost.repository.SemesterRepository;
import com.ghost.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseCatalogImportService {

    public static final List<String> ALLOWED_TERMS = List.of("Summer 2026", "Fall 2026", "Winter 2026");

    private final CourseFinderClient courseFinderClient;
    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public CourseCatalogImportResult importAllowedTerms(UUID facultyId) {
        User faculty = userRepository.findById(facultyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", facultyId));
        if (!faculty.isFaculty()) {
            throw new ForbiddenException("Only faculty members can import the course catalog");
        }

        int imported = 0;
        for (String term : ALLOWED_TERMS) {
            imported += importSections(courseFinderClient.fetchSections(term));
        }
        CourseCatalogImportResult result = new CourseCatalogImportResult(ALLOWED_TERMS, imported);
        auditLogService.logAction(
                null,
                facultyId,
                AuditAction.COURSE_CATALOG_IMPORTED,
                "CourseCatalog",
                null,
                null,
                "Imported " + imported + " course sections"
        );
        return result;
    }

    private int importSections(List<CourseFinderSection> sections) {
        int imported = 0;
        for (CourseFinderSection section : sections) {
            if (!isImportable(section)) {
                continue;
            }
            Course course = findOrCreateCourse(section);
            Semester semester = findOrCreateSemester(section.getTerm());
            CourseSection courseSection = courseSectionRepository.findBySourceObjectId(section.getSourceObjectId())
                    .orElseGet(() -> CourseSection.builder()
                            .sourceObjectId(section.getSourceObjectId())
                            .build());

            applySection(section, course, semester, courseSection);
            courseSectionRepository.save(courseSection);
            imported++;
        }
        return imported;
    }

    private boolean isImportable(CourseFinderSection section) {
        return normalize(section.getSourceObjectId()) != null
                && normalize(section.getSubject()) != null
                && normalize(section.getCatalogNumber()) != null
                && normalize(section.getTerm()) != null;
    }

    private Course findOrCreateCourse(CourseFinderSection section) {
        String courseCode = normalizeCourseCode(section.getSubject(), section.getCatalogNumber());
        var existingCourse = courseRepository.findByCourseCodeAndSectionIsNull(courseCode);
        Course course = existingCourse
                .orElseGet(() -> Course.builder()
                        .courseCode(courseCode)
                        .courseName(section.getCourseTitle())
                        .build());
        course.setCourseName(normalizeRequired(section.getCourseTitle(), course.getCourseName()));
        course.setSubject(normalizeUpper(section.getSubject()));
        course.setCatalogNumber(normalize(section.getCatalogNumber()));
        course.setDepartmentName(normalize(section.getDepartmentName()));
        course.setCourseDescription(normalize(section.getCourseDescription()));
        course.setCredit(normalize(section.getCredit()));
        course.setSourceCourseId(normalize(section.getSourceCourseId()));
        return existingCourse.isPresent() ? course : courseRepository.save(course);
    }

    private Semester findOrCreateSemester(String term) {
        return semesterRepository.findByName(term)
                .orElseGet(() -> semesterRepository.save(Semester.builder()
                        .name(term)
                        .build()));
    }

    private void applySection(
            CourseFinderSection imported,
            Course course,
            Semester semester,
            CourseSection courseSection
    ) {
        courseSection.setCourse(course);
        courseSection.setSemester(semester);
        courseSection.setTermId(normalize(imported.getTermId()));
        courseSection.setSection(normalizeRequired(imported.getSection(), "UNKNOWN"));
        courseSection.setClassNumber(normalizeRequired(imported.getClassNumber(), imported.getSourceObjectId()));
        courseSection.setInstructor(normalize(imported.getInstructor()));
        courseSection.setSession(normalize(imported.getSession()));
        courseSection.setCareer(normalize(imported.getCareer()));
        courseSection.setInstructionMode(normalize(imported.getInstructionMode()));
        courseSection.setMeetingPattern(join(imported.getMeetingPattern()));
        courseSection.setMeetingTimes(join(imported.getMeetingTimes()));
        courseSection.setNumberOfWeeks(imported.getNumberOfWeeks());
        courseSection.setOpenSection(imported.isOpenSection());
        courseSection.setLowCostMaterialsSection(imported.isLowCostMaterialsSection());
        courseSection.setNoCostMaterialsSection(imported.isNoCostMaterialsSection());
    }

    private String normalizeCourseCode(String subject, String catalogNumber) {
        return normalizeUpper(subject) + normalizeUpper(catalogNumber);
    }

    private String normalizeUpper(String value) {
        String normalized = normalize(value);
        return normalized == null ? "" : normalized.toUpperCase(Locale.ROOT);
    }

    private String normalizeRequired(String value, String fallback) {
        String normalized = normalize(value);
        return normalized == null ? fallback : normalized;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String join(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.stream()
                .map(this::normalize)
                .filter(value -> value != null)
                .collect(Collectors.joining("; "));
    }
}
