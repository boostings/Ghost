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
import java.util.UUID;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, UUID> {

    Optional<CourseSection> findBySourceObjectId(String sourceObjectId);

    Page<CourseSection> findBySemesterNameOrderByCourseCourseCodeAscSectionAsc(String semesterName, Pageable pageable);

    @EntityGraph(attributePaths = {"course", "semester"})
    @Query(
            value = """
                    SELECT section FROM CourseSection section
                    JOIN section.course course
                    JOIN section.semester semester
                    WHERE (:semester IS NULL OR semester.name = :semester)
                      AND (:subject IS NULL OR course.subject = :subject)
                      AND (
                        :query IS NULL
                        OR LOWER(course.courseCode) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(course.subject, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(course.catalogNumber, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(course.courseName) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(section.classNumber) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(section.section) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(section.instructor, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                      )
                    """,
            countQuery = """
                    SELECT COUNT(section) FROM CourseSection section
                    JOIN section.course course
                    JOIN section.semester semester
                    WHERE (:semester IS NULL OR semester.name = :semester)
                      AND (:subject IS NULL OR course.subject = :subject)
                      AND (
                        :query IS NULL
                        OR LOWER(course.courseCode) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(course.subject, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(course.catalogNumber, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(course.courseName) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(section.classNumber) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(section.section) LIKE LOWER(CONCAT('%', :query, '%'))
                        OR LOWER(COALESCE(section.instructor, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                      )
                    """
    )
    Page<CourseSection> searchSections(
            @Param("semester") String semester,
            @Param("query") String query,
            @Param("subject") String subject,
            Pageable pageable
    );
}
