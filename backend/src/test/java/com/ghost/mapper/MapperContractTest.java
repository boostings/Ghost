package com.ghost.mapper;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MapperContractTest {

    private static final List<Class<?>> MAPPERS = List.of(
            AuditLogMapper.class,
            BookmarkMapper.class,
            CommentMapper.class,
            JoinRequestMapper.class,
            NotificationMapper.class,
            QuestionMapper.class,
            ReportMapper.class,
            TopicMapper.class,
            UserMapper.class,
            WhiteboardMapper.class
    );

    @Test
    void mappersShouldNotDependOnRepositories() {
        for (Class<?> mapper : MAPPERS) {
            for (Field field : mapper.getDeclaredFields()) {
                if (Modifier.isStatic(field.getModifiers()) || field.isSynthetic()) {
                    continue;
                }

                assertThat(field.getType().getSimpleName().endsWith("Repository"))
                        .as("%s should not depend on %s", mapper.getSimpleName(), field.getType().getSimpleName())
                        .isFalse();
            }
        }
    }
}
