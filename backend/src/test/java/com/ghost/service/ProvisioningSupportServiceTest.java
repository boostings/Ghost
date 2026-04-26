package com.ghost.service;

import com.ghost.model.Course;
import com.ghost.model.Semester;
import com.ghost.repository.CourseRepository;
import com.ghost.repository.SemesterRepository;
import com.ghost.repository.WhiteboardRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProvisioningSupportServiceTest {

    @Test
    void courseServiceShouldUpdateMissingSectionWhenExistingCourseIsReused() {
        CourseRepository courseRepository = mock(CourseRepository.class);
        CourseService courseService = new CourseService(courseRepository);
        Course course = Course.builder()
                .courseCode("IT326")
                .courseName("Software Engineering")
                .section(null)
                .build();

        when(courseRepository.findByCourseCode("IT326")).thenReturn(Optional.of(course));
        when(courseRepository.save(course)).thenReturn(course);

        Course result = courseService.findOrCreate("IT326", "Software Engineering", "001");

        assertThat(result.getSection()).isEqualTo("001");
        verify(courseRepository).save(course);
    }

    @Test
    void semesterServiceShouldCreateSemesterWhenMissing() {
        SemesterRepository semesterRepository = mock(SemesterRepository.class);
        SemesterService semesterService = new SemesterService(semesterRepository);
        Semester semester = Semester.builder().name("Fall 2026").build();

        when(semesterRepository.findByName("Fall 2026")).thenReturn(Optional.empty());
        when(semesterRepository.save(org.mockito.ArgumentMatchers.any(Semester.class))).thenReturn(semester);

        Semester result = semesterService.findOrCreate("Fall 2026");

        assertThat(result.getName()).isEqualTo("Fall 2026");
    }

    @Test
    void inviteCodeServiceShouldGenerateEightCharacterInviteCode() {
        WhiteboardRepository whiteboardRepository = mock(WhiteboardRepository.class);
        InviteCodeService inviteCodeService = new InviteCodeService(whiteboardRepository);
        when(whiteboardRepository.existsByInviteCodeIgnoreCase(anyString())).thenReturn(false);

        String inviteCode = inviteCodeService.generate();

        assertThat(inviteCode).hasSize(8).matches("[A-Z0-9]{8}");
    }

    @Test
    void inviteCodeServiceShouldFailAfterRepeatedCollisions() {
        WhiteboardRepository whiteboardRepository = mock(WhiteboardRepository.class);
        InviteCodeService inviteCodeService = new InviteCodeService(whiteboardRepository);
        when(whiteboardRepository.existsByInviteCodeIgnoreCase(anyString())).thenReturn(true);

        assertThatThrownBy(inviteCodeService::generate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("unique invite code");
    }
}
