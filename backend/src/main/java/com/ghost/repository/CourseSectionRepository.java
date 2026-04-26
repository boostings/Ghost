package com.ghost.repository;

import com.ghost.model.CourseSection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, UUID> {

    Optional<CourseSection> findBySourceObjectId(String sourceObjectId);

    Page<CourseSection> findBySemesterNameOrderByCourseCourseCodeAscSectionAsc(String semesterName, Pageable pageable);
}
