package com.ghost.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWhiteboardRequest {

    @NotBlank(message = "Course code is required")
    @Size(max = 20, message = "Course code must not exceed 20 characters")
    @Pattern(regexp = "^[A-Za-z0-9-]+$", message = "Course code contains invalid characters")
    private String courseCode;

    @NotBlank(message = "Course name is required")
    @Size(max = 150, message = "Course name must not exceed 150 characters")
    private String courseName;

    @Size(max = 20, message = "Section must not exceed 20 characters")
    private String section;

    @NotBlank(message = "Semester is required")
    @Size(max = 40, message = "Semester must not exceed 40 characters")
    private String semester;
}
