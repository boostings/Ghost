package com.ghost.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseFinderSection {

    private String sourceObjectId;
    private String sourceCourseId;
    private String subject;
    private String catalogNumber;
    private String courseTitle;
    private String courseDescription;
    private String departmentName;
    private String credit;
    private String term;
    private String termId;
    private String section;
    private String classNumber;
    private String instructor;
    private String session;
    private String career;
    private String instructionMode;
    private List<String> meetingPattern;
    private List<String> meetingTimes;
    private Integer numberOfWeeks;
    private boolean openSection;
    private boolean lowCostMaterialsSection;
    private boolean noCostMaterialsSection;
}
