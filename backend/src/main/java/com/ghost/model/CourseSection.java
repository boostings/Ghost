package com.ghost.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "course_sections",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_course_sections_source_object_id", columnNames = {"source_object_id"}),
                @UniqueConstraint(
                        name = "uq_course_sections_course_semester_section_class",
                        columnNames = {"course_id", "semester_id", "section", "class_number"}
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Semester semester;

    @Column(name = "source_object_id", nullable = false)
    private String sourceObjectId;

    @Column(name = "term_id")
    private String termId;

    @Column(name = "section", nullable = false)
    private String section;

    @Column(name = "class_number", nullable = false)
    private String classNumber;

    @Column(name = "instructor")
    private String instructor;

    @Column(name = "session")
    private String session;

    @Column(name = "career")
    private String career;

    @Column(name = "instruction_mode")
    private String instructionMode;

    @Column(name = "meeting_pattern", columnDefinition = "text")
    private String meetingPattern;

    @Column(name = "meeting_times", columnDefinition = "text")
    private String meetingTimes;

    @Column(name = "number_of_weeks")
    private Integer numberOfWeeks;

    @Column(name = "is_open_section", nullable = false)
    @Builder.Default
    private boolean openSection = false;

    @Column(name = "is_low_cost_materials_section", nullable = false)
    @Builder.Default
    private boolean lowCostMaterialsSection = false;

    @Column(name = "is_no_cost_materials_section", nullable = false)
    @Builder.Default
    private boolean noCostMaterialsSection = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
