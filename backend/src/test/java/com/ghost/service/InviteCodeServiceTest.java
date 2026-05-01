package com.ghost.service;

import com.ghost.repository.WhiteboardRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InviteCodeServiceTest {

    @Test
    void generateShouldAvoidAmbiguousCharacters() {
        WhiteboardRepository whiteboardRepository = mock(WhiteboardRepository.class);
        when(whiteboardRepository.existsByInviteCodeIgnoreCase(anyString())).thenReturn(false);
        InviteCodeService service = new InviteCodeService(whiteboardRepository);

        for (int i = 0; i < 100; i++) {
            String code = service.generate();

            assertThat(code).hasSize(8);
            assertThat(code).matches("[A-HJ-KM-NP-Z2-9]+");
            assertThat(code).doesNotContain("I", "L", "O", "0", "1");
        }
    }
}
