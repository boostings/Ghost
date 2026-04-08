package com.ghost.dto.request;

import com.ghost.model.enums.JoinRequestStatus;
import com.ghost.model.enums.ReportStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RequestDtoHelperTest {

    @Test
    void joinRequestActionShouldOnlyAcceptTerminalStatuses() {
        JoinRequestActionRequest approved = JoinRequestActionRequest.builder()
                .status(JoinRequestStatus.APPROVED)
                .build();
        JoinRequestActionRequest rejected = JoinRequestActionRequest.builder()
                .status(JoinRequestStatus.REJECTED)
                .build();
        JoinRequestActionRequest pending = JoinRequestActionRequest.builder()
                .status(JoinRequestStatus.PENDING)
                .build();

        assertThat(approved.isTerminalStatus()).isTrue();
        assertThat(rejected.isTerminalStatus()).isTrue();
        assertThat(pending.isTerminalStatus()).isFalse();
    }

    @Test
    void reviewReportShouldOnlyAcceptTerminalStatuses() {
        ReviewReportRequest reviewed = ReviewReportRequest.builder()
                .status(ReportStatus.REVIEWED)
                .build();
        ReviewReportRequest dismissed = ReviewReportRequest.builder()
                .status(ReportStatus.DISMISSED)
                .build();
        ReviewReportRequest pending = ReviewReportRequest.builder()
                .status(ReportStatus.PENDING)
                .build();

        assertThat(reviewed.isTerminalStatus()).isTrue();
        assertThat(dismissed.isTerminalStatus()).isTrue();
        assertThat(pending.isTerminalStatus()).isFalse();
    }
}
