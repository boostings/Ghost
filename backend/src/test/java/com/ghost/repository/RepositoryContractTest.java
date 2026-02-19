package com.ghost.repository;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RepositoryContractTest {

    private static final List<Class<?>> REPOSITORIES = List.of(
            AuditLogRepository.class,
            BookmarkRepository.class,
            CommentRepository.class,
            JoinRequestRepository.class,
            KarmaVoteRepository.class,
            NotificationRepository.class,
            QuestionRepository.class,
            ReportRepository.class,
            TopicRepository.class,
            UserRepository.class,
            WhiteboardMembershipRepository.class,
            WhiteboardRepository.class
    );

    @Test
    void repositoriesShouldExtendJpaRepository() {
        for (Class<?> repository : REPOSITORIES) {
            assertThat(JpaRepository.class.isAssignableFrom(repository))
                    .as("%s should extend JpaRepository", repository.getSimpleName())
                    .isTrue();
        }
    }

    @Test
    void pageReturningMethodsShouldAcceptPageable() {
        for (Class<?> repository : REPOSITORIES) {
            for (Method method : repository.getMethods()) {
                if (!Page.class.isAssignableFrom(method.getReturnType())) {
                    continue;
                }
                boolean hasPageable = false;
                for (Class<?> parameterType : method.getParameterTypes()) {
                    if (Pageable.class.isAssignableFrom(parameterType)) {
                        hasPageable = true;
                        break;
                    }
                }
                assertThat(hasPageable)
                        .as("%s.%s should accept Pageable", repository.getSimpleName(), method.getName())
                        .isTrue();
            }
        }
    }
}
