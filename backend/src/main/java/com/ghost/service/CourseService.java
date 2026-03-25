package com.ghost.service;

import com.ghost.model.Course;
import com.ghost.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    @Transactional
    public Course findOrCreate(String courseCode, String courseName, String section) {
        return courseRepository.findByCourseCode(courseCode)
                .map(existingCourse -> updateSectionIfNeeded(existingCourse, section))
                .orElseGet(() -> courseRepository.save(Course.builder()
                        .courseCode(courseCode)
                        .courseName(courseName)
                        .section(section)
                        .build()));
    }

    private Course updateSectionIfNeeded(Course course, String section) {
        if ((course.getSection() == null || course.getSection().isBlank()) && section != null) {
            course.setSection(section);
            return courseRepository.save(course);
        }
        return course;
    }
}
