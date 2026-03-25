package com.ghost.service;

import com.ghost.dto.response.WhiteboardResponse;
import com.ghost.mapper.WhiteboardMapper;
import com.ghost.model.Course;
import com.ghost.model.Semester;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.repository.WhiteboardMembershipRepository;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WhiteboardResponseAssemblerTest {

    @Test
    void toResponseShouldAssembleMemberCountWithoutRepositoryInMapper() {
        WhiteboardMembershipRepository membershipRepository = mock(WhiteboardMembershipRepository.class);
        WhiteboardResponseAssembler assembler = new WhiteboardResponseAssembler(
                membershipRepository,
                new WhiteboardMapper()
        );

        UUID whiteboardId = UUID.randomUUID();
        Whiteboard whiteboard = Whiteboard.builder()
                .id(whiteboardId)
                .course(Course.builder().courseCode("IT326").courseName("Software Engineering").section("001").build())
                .semester(Semester.builder().name("Fall 2026").build())
                .owner(User.builder().id(UUID.randomUUID()).firstName("Riley").lastName("Owner").build())
                .inviteCode("ABCD1234")
                .build();

        when(membershipRepository.countByWhiteboardId(whiteboardId)).thenReturn(7L);

        WhiteboardResponse response = assembler.toResponse(whiteboard, true);

        assertThat(response.getMemberCount()).isEqualTo(7);
        assertThat(response.getInviteCode()).isEqualTo("ABCD1234");
        assertThat(response.getOwnerName()).isEqualTo("Riley Owner");
    }
}
