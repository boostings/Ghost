package com.ghost.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class EmailService {

    private static final String RESEND_URL = "https://api.resend.com/emails";

    private final RestClient restClient;
    private final String apiKey;
    private final String fromAddress;
    private final boolean enabled;
    private final boolean deliveryRequested;

    public EmailService(
            @Value("${resend.api-key:}") String apiKey,
            @Value("${resend.from:Ghost <noreply@resonating.app>}") String fromAddress,
            @Value("${resend.api-url:" + RESEND_URL + "}") String apiUrl,
            @Value("${resend.enabled:true}") boolean deliveryRequested,
            RestClient.Builder restClientBuilder
    ) {
        this.apiKey = apiKey;
        this.fromAddress = fromAddress;
        this.deliveryRequested = deliveryRequested;
        this.enabled = deliveryRequested && apiKey != null && !apiKey.isBlank();
        this.restClient = restClientBuilder.baseUrl(apiUrl).build();

        if (!deliveryRequested) {
            log.warn("Resend email delivery disabled by configuration; emails will be logged only");
        } else if (!enabled) {
            log.warn("Resend API key not configured; emails will be logged only");
        }
    }

    public void sendVerificationCode(String toEmail, String code) {
        String subject = "Your Ghost verification code";
        String html = """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #4c1d95;">Verify your email</h2>
                  <p>Use the code below to finish creating your Ghost account. This code expires in 15 minutes.</p>
                  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1f2937; background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">%s</p>
                  <p style="color: #6b7280; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
                """.formatted(code);
        send(toEmail, subject, html, code);
    }

    public void sendPasswordResetCode(String toEmail, String code) {
        String subject = "Your Ghost password reset code";
        String html = """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #4c1d95;">Reset your password</h2>
                  <p>Use the code below to reset your Ghost password. This code expires in 15 minutes.</p>
                  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1f2937; background: #f3f4f6; padding: 16px; border-radius: 12px; text-align: center;">%s</p>
                  <p style="color: #6b7280; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
                """.formatted(code);
        send(toEmail, subject, html, code);
    }

    public void sendNotificationDigest(NotificationDigestJob.NotificationDigest digest) {
        if (digest.notifications().isEmpty()) {
            return;
        }

        String subject = digest.digestType().equals("WEEKLY_MON_7AM")
                ? "Your weekly Ghost digest"
                : "Your Ghost digest";
        String items = digest.notifications().stream()
                .limit(8)
                .map(notification -> """
                        <li style="margin-bottom: 12px;">
                          <strong>%s</strong><br />
                          <span style="color: #4b5563;">%s</span>
                        </li>
                        """.formatted(escapeHtml(notification.getTitle()), escapeHtml(notification.getBody())))
                .reduce("", String::concat);
        String html = """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                  <h2 style="color: #4c1d95;">%s</h2>
                  <p>You have %d unread %s from your Ghost classes.</p>
                  <ul style="padding-left: 20px;">%s</ul>
                  <p style="color: #6b7280; font-size: 12px;">Open Ghost to read the full threads and update notification preferences.</p>
                </div>
                """.formatted(
                escapeHtml(subject),
                digest.notifications().size(),
                digest.notifications().size() == 1 ? "notification" : "notifications",
                items
        );
        send(digest.recipientEmail(), subject, html, "digest:" + digest.digestType());
    }

    private void send(String toEmail, String subject, String html, String code) {
        if (!enabled) {
            String reason = deliveryRequested ? "missing-api-key" : "disabled-by-config";
            log.info("[email-disabled] reason={} to={} subject=\"{}\" code={}",
                    reason, toEmail, subject, code);
            return;
        }

        Map<String, Object> payload = Map.of(
                "from", fromAddress,
                "to", List.of(toEmail),
                "subject", subject,
                "html", html
        );

        try {
            restClient.post()
                    .uri("")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Resend email dispatched to={} subject=\"{}\"", toEmail, subject);
        } catch (RestClientResponseException e) {
            log.error("Resend email failed to={} status={} body={}",
                    toEmail, e.getStatusCode(), e.getResponseBodyAsString());
            throw new EmailDeliveryException("Failed to send email via Resend", e);
        } catch (Exception e) {
            log.error("Resend email failed to={} error={}", toEmail, e.getMessage());
            throw new EmailDeliveryException("Failed to send email via Resend", e);
        }
    }

    private String escapeHtml(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    public static class EmailDeliveryException extends RuntimeException {
        public EmailDeliveryException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
