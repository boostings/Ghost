package com.ghost.config;

import com.ghost.security.JwtAuthenticationFilter;
import com.ghost.security.WebSocketAuthChannelInterceptor;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.config.SimpleBrokerRegistration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConfigCoverageTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void corsConfigShouldExposeExpectedOriginsMethodsAndHeaders() {
        CorsConfigurationSource source = new CorsConfig().corsConfigurationSource();
        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/test"));

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins())
                .containsExactly("http://localhost:19006", "http://localhost:8081");
        assertThat(configuration.getAllowedMethods())
                .containsExactly("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertThat(configuration.getExposedHeaders())
                .containsExactly("Authorization", "Content-Type", "X-Total-Count");
        assertThat(configuration.getAllowCredentials()).isTrue();
        assertThat(configuration.getMaxAge()).isEqualTo(3600L);
    }

    @Test
    void rateLimitFilterShouldRespectTrustedProxyHeadersAndThrottleAuthRequests() throws Exception {
        RateLimitConfig config = new RateLimitConfig();
        ReflectionTestUtils.setField(config, "trustProxyHeaders", true);
        ReflectionTestUtils.setField(config, "trustedProxiesConfig", "10.0.0.1");
        config.initTrustedProxies();

        var filter = config.rateLimitFilter();

        for (int attempt = 0; attempt < 100; attempt++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("10.0.0.1");
            request.addHeader("X-Forwarded-For", "203.0.113.10");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, successChain(response));

            assertThat(response.getStatus()).isEqualTo(204);
        }

        MockHttpServletRequest throttledRequest = new MockHttpServletRequest("POST", "/api/auth/login");
        throttledRequest.setRemoteAddr("10.0.0.1");
        throttledRequest.addHeader("X-Forwarded-For", "203.0.113.10");
        MockHttpServletResponse throttledResponse = new MockHttpServletResponse();

        filter.doFilter(throttledRequest, throttledResponse, successChain(throttledResponse));

        MockHttpServletRequest generalRequest = new MockHttpServletRequest("GET", "/api/questions");
        generalRequest.setRemoteAddr("10.0.0.1");
        generalRequest.addHeader("X-Forwarded-For", "203.0.113.10");
        MockHttpServletResponse generalResponse = new MockHttpServletResponse();

        filter.doFilter(generalRequest, generalResponse, successChain(generalResponse));

        assertThat(throttledResponse.getStatus()).isEqualTo(429);
        assertThat(throttledResponse.getContentAsString()).contains("Rate limit exceeded");
        assertThat(generalResponse.getStatus()).isEqualTo(204);
    }

    @Test
    void requestLoggingFilterShouldLogReadableInfoEntryForSuccessfulRequests() throws Exception {
        RequestLoggingFilter filter = new RequestLoggingFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/questions");
        request.setQueryString("page=1");
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        ListAppender<ILoggingEvent> logAppender = attachLogAppender(Level.INFO);

        filter.doFilterInternal(request, response, (servletRequest, servletResponse) -> response.setStatus(200));

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getHeader("X-Request-Id")).isNotBlank();
        assertThat(logAppender.list).hasSize(1);
        assertThat(logAppender.list.get(0).getLevel()).isEqualTo(Level.INFO);
        assertThat(logAppender.list.get(0).getFormattedMessage())
                .contains("requestId=" + response.getHeader("X-Request-Id"))
                .contains("method=GET")
                .contains("path=/api/questions?page=1")
                .contains("status=200")
                .contains("userId=anonymous")
                .contains("remoteAddr=127.0.0.1");
    }

    @Test
    void requestLoggingFilterShouldLogWarningsForClientErrors() throws Exception {
        RequestLoggingFilter filter = new RequestLoggingFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        TestingAuthenticationToken authentication = new TestingAuthenticationToken(
                "df7c4cf6-6fe4-4610-b12e-74d2e0d7bfe4",
                "password",
                "ROLE_STUDENT"
        );
        authentication.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        ListAppender<ILoggingEvent> logAppender = attachLogAppender(Level.INFO);

        filter.doFilterInternal(request, response, (servletRequest, servletResponse) -> response.setStatus(401));

        assertThat(response.getHeader("X-Request-Id")).isNotBlank();
        assertThat(logAppender.list).hasSize(1);
        assertThat(logAppender.list.get(0).getLevel()).isEqualTo(Level.WARN);
        assertThat(logAppender.list.get(0).getFormattedMessage())
                .contains("requestId=" + response.getHeader("X-Request-Id"))
                .contains("method=POST")
                .contains("path=/api/auth/login")
                .contains("status=401")
                .contains("userId=df7c4cf6-6fe4-4610-b12e-74d2e0d7bfe4");
    }

    @Test
    void securityConfigShouldProvidePasswordEncodingAccessDeniedHandlingAndAuthenticationManager() throws Exception {
        JwtAuthenticationFilter jwtAuthenticationFilter = mock(JwtAuthenticationFilter.class);
        SecurityConfig securityConfig = new SecurityConfig(jwtAuthenticationFilter);
        PasswordEncoder passwordEncoder = securityConfig.passwordEncoder();
        AuthenticationConfiguration authenticationConfiguration = mock(AuthenticationConfiguration.class);
        var authenticationManager = mock(org.springframework.security.authentication.AuthenticationManager.class);
        when(authenticationConfiguration.getAuthenticationManager()).thenReturn(authenticationManager);

        AccessDeniedHandler accessDeniedHandler = securityConfig.restAccessDeniedHandler();

        MockHttpServletResponse anonymousResponse = new MockHttpServletResponse();
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"))
        );
        accessDeniedHandler.handle(
                new MockHttpServletRequest("GET", "/api/protected"),
                anonymousResponse,
                new org.springframework.security.access.AccessDeniedException("denied")
        );

        MockHttpServletResponse authenticatedResponse = new MockHttpServletResponse();
        TestingAuthenticationToken authenticatedUser = new TestingAuthenticationToken("user", "password", "ROLE_STUDENT");
        authenticatedUser.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(authenticatedUser);
        accessDeniedHandler.handle(
                new MockHttpServletRequest("GET", "/api/protected"),
                authenticatedResponse,
                new org.springframework.security.access.AccessDeniedException("denied")
        );

        assertThat(passwordEncoder.matches("secret123", passwordEncoder.encode("secret123"))).isTrue();
        assertThat(securityConfig.authenticationManager(authenticationConfiguration)).isSameAs(authenticationManager);
        assertThat(anonymousResponse.getStatus()).isEqualTo(401);
        assertThat(authenticatedResponse.getStatus()).isEqualTo(403);
    }

    @Test
    void webSocketConfigShouldRegisterBrokerPrefixesEndpointsAndInterceptors() {
        WebSocketAuthChannelInterceptor interceptor = mock(WebSocketAuthChannelInterceptor.class);
        WebSocketConfig config = new WebSocketConfig(interceptor);
        MessageBrokerRegistry brokerRegistry = mock(MessageBrokerRegistry.class);
        when(brokerRegistry.enableSimpleBroker("/topic")).thenReturn(mock(SimpleBrokerRegistration.class));
        StompEndpointRegistry endpointRegistry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration endpointRegistration = mock(StompWebSocketEndpointRegistration.class);
        when(endpointRegistry.addEndpoint("/ws")).thenReturn(endpointRegistration);
        when(endpointRegistration.setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*"))
                .thenReturn(endpointRegistration);
        ChannelRegistration channelRegistration = mock(ChannelRegistration.class);

        config.configureMessageBroker(brokerRegistry);
        config.registerStompEndpoints(endpointRegistry);
        config.configureClientInboundChannel(channelRegistration);

        verify(brokerRegistry).enableSimpleBroker("/topic");
        verify(brokerRegistry).setApplicationDestinationPrefixes("/app");
        verify(brokerRegistry).setUserDestinationPrefix("/user");
        verify(endpointRegistry, times(2)).addEndpoint("/ws");
        verify(endpointRegistration, times(2))
                .setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
        verify(endpointRegistration).withSockJS();
        verify(channelRegistration).interceptors(interceptor);
    }

    private static FilterChain successChain(MockHttpServletResponse response) {
        return (request, servletResponse) -> response.setStatus(204);
    }

    private static ListAppender<ILoggingEvent> attachLogAppender(Level level) {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
        logger.setLevel(level);

        ListAppender<ILoggingEvent> logAppender = new ListAppender<>();
        logAppender.start();
        logger.addAppender(logAppender);
        return logAppender;
    }
}
