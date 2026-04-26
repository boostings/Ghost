package com.ghost.config;

import com.ghost.controller.AuthController;
import com.ghost.exception.GlobalExceptionHandler;
import com.ghost.security.JwtAuthenticationFilter;
import com.ghost.security.JwtTokenProvider;
import com.ghost.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, AuthSecurityWebMvcTest.TestConfig.class})
class AuthSecurityWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Test
    void forgotPasswordShouldAllowAnonymousRequestsToReachValidation() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": ""
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyPasswordResetShouldAllowAnonymousRequestsToReachValidation() throws Exception {
        mockMvc.perform(post("/api/auth/verify-password-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "",
                                  "code": ""
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPasswordShouldAllowAnonymousRequestsToReachValidation() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "",
                                  "code": "",
                                  "newPassword": "",
                                  "confirmPassword": ""
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter() {
            return new JwtAuthenticationFilter(mock(JwtTokenProvider.class)) {
                @Override
                protected void doFilterInternal(
                        HttpServletRequest request,
                        HttpServletResponse response,
                        FilterChain filterChain) throws ServletException, IOException {
                    filterChain.doFilter(request, response);
                }
            };
        }
    }
}
