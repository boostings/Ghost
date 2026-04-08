package com.ghost;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;

class GhostApplicationTest {

    @Test
    void mainShouldDelegateToSpringApplication() {
        try (MockedStatic<SpringApplication> springApplication = Mockito.mockStatic(SpringApplication.class)) {
            GhostApplication.main(new String[]{"--spring.main.web-application-type=none"});

            springApplication.verify(() ->
                    SpringApplication.run(GhostApplication.class, new String[]{"--spring.main.web-application-type=none"}));
        }
    }
}
