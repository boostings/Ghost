package com.ghost.service;

import com.ghost.model.Notification;
import com.ghost.model.User;
import com.ghost.model.enums.NotificationType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

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
                true,
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
                true,
                RestClient.builder()
        );

        emailService.sendVerificationCode("student@ilstu.edu", "123456");

        assertThat(output).contains("[email-disabled]");
        assertThat(output).contains("student@ilstu.edu");
        assertThat(output).contains("Your Ghost verification code");
        assertThat(output).contains("123456");
    }

    @Test
    void sendPasswordResetCodeShouldLogCodeWhenEmailDeliveryIsDisabledByConfig(CapturedOutput output) {
        EmailService emailService = new EmailService(
                "resend-key",
                "Ghost <noreply@example.com>",
                "https://api.resend.test/emails",
                false,
                RestClient.builder()
        );

        emailService.sendPasswordResetCode("student@ilstu.edu", "654321");

        assertThat(output).contains("[email-disabled]");
        assertThat(output).contains("disabled-by-config");
        assertThat(output).contains("student@ilstu.edu");
        assertThat(output).contains("Your Ghost password reset code");
        assertThat(output).contains("654321");
    }

    @Test
    void sendNotificationDigestShouldUseConfiguredResendEndpointAndEscapedSummary() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        EmailService emailService = new EmailService(
                "resend-key",
                "Ghost <noreply@example.com>",
                "https://api.resend.test/emails",
                true,
                restClientBuilder
        );
        User recipient = User.builder()
                .id(UUID.randomUUID())
                .email("student@ilstu.edu")
                .build();
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.COMMENT_ADDED)
                .title("Comment <added>")
                .body("Read & reply")
                .build();

        server.expect(requestTo("https://api.resend.test/emails"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer resend-key"))
                .andExpect(content().string(allOf(
                        containsString("\"from\":\"Ghost <noreply@example.com>\""),
                        containsString("\"to\":[\"student@ilstu.edu\"]"),
                        containsString("\"subject\":\"Your Ghost digest\""),
                        containsString("Comment &lt;added&gt;"),
                        containsString("Read &amp; reply")
                )))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        emailService.sendNotificationDigest(new NotificationDigestJob.NotificationDigest(
                recipient.getId(),
                recipient.getEmail(),
                null,
                "DAILY_7AM",
                List.of(notification)
        ));

        server.verify();
    }
}
