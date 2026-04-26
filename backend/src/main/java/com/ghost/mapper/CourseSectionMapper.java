package com.ghost.mapper;

import com.ghost.dto.response.CourseSectionResponse;
import com.ghost.model.Course;
import com.ghost.model.CourseSection;
import com.ghost.model.Semester;
import org.springframework.stereotype.Component;

@Component
public class CourseSectionMapper {

    public CourseSectionResponse toResponse(CourseSection section) {
        Course course = section.getCourse();
        Semester semester = section.getSemester();
        return CourseSectionResponse.builder()
                .id(section.getId())
                .courseCode(course.getCourseCode())
                .courseName(course.getCourseName())
                .subject(course.getSubject())
                .catalogNumber(course.getCatalogNumber())
                .departmentName(course.getDepartmentName())
                .courseDescription(course.getCourseDescription())
                .credit(course.getCredit())
                .semester(semester.getName())
                .termId(section.getTermId())
                .section(section.getSection())
                .classNumber(section.getClassNumber())
                .instructor(section.getInstructor())
                .session(section.getSession())
                .career(section.getCareer())
                .instructionMode(section.getInstructionMode())
                .meetingPattern(section.getMeetingPattern())
                .meetingTimes(section.getMeetingTimes())
                .numberOfWeeks(section.getNumberOfWeeks())
                .openSection(section.isOpenSection())
                .lowCostMaterialsSection(section.isLowCostMaterialsSection())
                .noCostMaterialsSection(section.isNoCostMaterialsSection())
                .build();
    }
}
