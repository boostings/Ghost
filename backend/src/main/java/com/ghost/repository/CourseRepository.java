package com.ghost.repository;

import com.ghost.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {

    Optional<Course> findByCourseCodeAndSection(String courseCode, String section);

    Optional<Course> findByCourseCodeAndSectionIsNull(String courseCode);
}
