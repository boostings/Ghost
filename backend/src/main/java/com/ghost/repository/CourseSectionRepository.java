package com.ghost.repository;

import com.ghost.model.CourseSection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, UUID> {

    Optional<CourseSection> findBySourceObjectId(String sourceObjectId);

    Page<CourseSection> findBySemesterNameOrderByCourseCourseCodeAscSectionAsc(String semesterName, Pageable pageable);

    long countByCourseIdAndSemesterId(UUID courseId, UUID semesterId);

    @Query("""
            SELECT DISTINCT section.instructor FROM CourseSection section
            WHERE section.course.id = :courseId
              AND section.semester.id = :semesterId
              AND section.instructor IS NOT NULL
              AND TRIM(section.instructor) <> ''
            ORDER BY section.instructor
            """)
    List<String> findDistinctInstructors(
            @Param("courseId") UUID courseId,
            @Param("semesterId") UUID semesterId
    );

    @EntityGraph(attributePaths = {"course", "semester"})
    @Query(
            value = """
                    SELECT section FROM CourseSection section
                    JOIN section.course course
                    JOIN section.semester semester
                    WHERE (CAST(:semester AS string) IS NULL OR semester.name = :semester)
                      AND (CAST(:courseCode AS string) IS NULL OR course.courseCode = :courseCode)
                      AND (CAST(:subject AS string) IS NULL OR course.subject = :subject)
                      AND (
                        CAST(:query AS string) IS NULL
                        OR LOWER(course.courseCode) LIKE LOWER(CONCAT('%', CAST(:querySquashed AS string), '%'))
                        OR LOWER(COALESCE(course.subject, '')) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(COALESCE(course.catalogNumber, '')) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(course.courseName) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(section.classNumber) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(section.section) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(COALESCE(section.instructor, '')) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                      )
                    """,
            countQuery = """
                    SELECT COUNT(section) FROM CourseSection section
                    JOIN section.course course
                    JOIN section.semester semester
                    WHERE (CAST(:semester AS string) IS NULL OR semester.name = :semester)
                      AND (CAST(:courseCode AS string) IS NULL OR course.courseCode = :courseCode)
                      AND (CAST(:subject AS string) IS NULL OR course.subject = :subject)
                      AND (
                        CAST(:query AS string) IS NULL
                        OR LOWER(course.courseCode) LIKE LOWER(CONCAT('%', CAST(:querySquashed AS string), '%'))
                        OR LOWER(COALESCE(course.subject, '')) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(COALESCE(course.catalogNumber, '')) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(course.courseName) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(section.classNumber) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(section.section) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                        OR LOWER(COALESCE(section.instructor, '')) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%'))
                      )
                    """
    )
    Page<CourseSection> searchSections(
            @Param("semester") String semester,
            @Param("query") String query,
            @Param("querySquashed") String querySquashed,
            @Param("courseCode") String courseCode,
            @Param("subject") String subject,
            Pageable pageable
    );
}
