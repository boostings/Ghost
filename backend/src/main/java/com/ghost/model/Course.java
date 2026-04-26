package com.ghost.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "courses",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_courses_course_code", columnNames = {"course_code"})
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "course_code", nullable = false)
    private String courseCode;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(name = "section")
    private String section;

    @Column(name = "subject")
    private String subject;

    @Column(name = "catalog_number")
    private String catalogNumber;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "course_description", columnDefinition = "text")
    private String courseDescription;

    @Column(name = "credit")
    private String credit;

    @Column(name = "source_course_id")
    private String sourceCourseId;
}
