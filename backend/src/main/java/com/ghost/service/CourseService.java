package com.ghost.service;

import com.ghost.model.Course;
import com.ghost.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    @Transactional
    public Course findOrCreate(String courseCode, String courseName, String section) {
        Optional<Course> existingCourse = section == null
                ? courseRepository.findByCourseCodeAndSectionIsNull(courseCode)
                : courseRepository.findByCourseCodeAndSection(courseCode, section);
        return existingCourse
                .orElseGet(() -> courseRepository.save(Course.builder()
                        .courseCode(courseCode)
                        .courseName(courseName)
                        .section(section)
                        .build()));
    }
}
