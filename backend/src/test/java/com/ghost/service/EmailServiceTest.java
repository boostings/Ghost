package com.ghost.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(OutputCaptureExtension.class)
class EmailServiceTest {

    @Test
    void sendVerificationCodeShouldUseConfiguredResendEndpointAndSender() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        EmailService emailService = new EmailService(
                "resend-key",
                "Ghost <noreply@example.com>",
                "https://api.resend.test/emails",
                restClientBuilder
        );

        server.expect(requestTo("https://api.resend.test/emails"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer resend-key"))
                .andExpect(content().string(allOf(
                        containsString("\"from\":\"Ghost <noreply@example.com>\""),
                        containsString("\"to\":[\"student@ilstu.edu\"]"),
                        containsString("\"subject\":\"Your Ghost verification code\""),
                        containsString("123456")
                )))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        emailService.sendVerificationCode("student@ilstu.edu", "123456");

        server.verify();
    }

    @Test
    void sendVerificationCodeShouldLogCodeWhenEmailDeliveryIsDisabled(CapturedOutput output) {
        EmailService emailService = new EmailService(
                "",
                "Ghost <noreply@example.com>",
                "https://api.resend.test/emails",
                RestClient.builder()
        );

        emailService.sendVerificationCode("student@ilstu.edu", "123456");

        assertThat(output).contains("[email-disabled]");
        assertThat(output).contains("student@ilstu.edu");
        assertThat(output).contains("Your Ghost verification code");
        assertThat(output).contains("123456");
    }
}
