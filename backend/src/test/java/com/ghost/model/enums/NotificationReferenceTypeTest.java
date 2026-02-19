package com.ghost.model.enums;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationReferenceTypeTest {

    @Test
    void fromShouldNormalizeMixedCaseValue() {
        assertThat(NotificationReferenceType.from("Whiteboard")).isEqualTo(NotificationReferenceType.WHITEBOARD);
    }

    @Test
    void fromShouldNormalizeDelimitedValue() {
        assertThat(NotificationReferenceType.from("join-request")).isEqualTo(NotificationReferenceType.JOIN_REQUEST);
    }

    @Test
    void fromShouldFallbackToUnknownForInvalidValue() {
        assertThat(NotificationReferenceType.from("not-a-reference")).isEqualTo(NotificationReferenceType.UNKNOWN);
        assertThat(NotificationReferenceType.from("   ")).isEqualTo(NotificationReferenceType.UNKNOWN);
    }
}
