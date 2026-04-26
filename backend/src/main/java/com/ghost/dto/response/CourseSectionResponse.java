package com.ghost.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseSectionResponse {

    private UUID id;

    private String courseCode;

    private String courseName;

    private String subject;

    private String catalogNumber;

    private String departmentName;

    private String courseDescription;

    private String credit;

    private String semester;

    private String termId;

    private String section;

    private String classNumber;

    private String instructor;

    private String session;

    private String career;

    private String instructionMode;

    private String meetingPattern;

    private String meetingTimes;

    private Integer numberOfWeeks;

    private boolean openSection;

    private boolean lowCostMaterialsSection;

    private boolean noCostMaterialsSection;
}
