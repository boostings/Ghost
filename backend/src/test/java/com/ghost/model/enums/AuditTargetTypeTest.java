package com.ghost.model.enums;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditTargetTypeTest {

    @Test
    void fromShouldNormalizePascalCaseValue() {
        assertThat(AuditTargetType.from("JoinRequest")).isEqualTo(AuditTargetType.JOIN_REQUEST);
    }

    @Test
    void fromShouldNormalizeSnakeCaseAndWhitespace() {
        assertThat(AuditTargetType.from("  karma_vote ")).isEqualTo(AuditTargetType.KARMA_VOTE);
    }

    @Test
    void fromShouldFallbackToUnknownForInvalidValue() {
        assertThat(AuditTargetType.from("totally-invalid")).isEqualTo(AuditTargetType.UNKNOWN);
        assertThat(AuditTargetType.from(null)).isEqualTo(AuditTargetType.UNKNOWN);
    }
}
