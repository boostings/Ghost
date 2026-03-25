package com.ghost.controller;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ControllerLayerContractTest {

    private static final List<Class<?>> CONTROLLERS = List.of(
            AuthController.class,
            FacultyController.class,
            UserController.class,
            WhiteboardController.class,
            WhiteboardMembershipController.class,
            QuestionController.class,
            CommentController.class,
            TopicController.class,
            ReportController.class,
            AuditLogController.class,
            NotificationController.class,
            BookmarkController.class,
            SearchController.class,
            KarmaController.class,
            StudentController.class
    );

    @Test
    void controllersShouldDependOnServicesOnly() {
        for (Class<?> controller : CONTROLLERS) {
            for (Field field : controller.getDeclaredFields()) {
                if (Modifier.isStatic(field.getModifiers()) || field.isSynthetic()) {
                    continue;
                }
                assertThat(field.getType().getSimpleName().endsWith("Service"))
                        .as("%s field %s should be a service dependency", controller.getSimpleName(), field.getName())
                        .isTrue();
            }
        }
    }

    @Test
    void controllersShouldExposeMappedEndpoints() {
        for (Class<?> controller : CONTROLLERS) {
            boolean hasMappedMethod = false;
            for (Method method : controller.getDeclaredMethods()) {
                if (method.isAnnotationPresent(GetMapping.class)
                        || method.isAnnotationPresent(PostMapping.class)
                        || method.isAnnotationPresent(PutMapping.class)
                        || method.isAnnotationPresent(DeleteMapping.class)
                        || method.isAnnotationPresent(PatchMapping.class)) {
                    hasMappedMethod = true;
                    break;
                }
            }
            assertThat(hasMappedMethod)
                    .as("%s should have at least one mapped endpoint", controller.getSimpleName())
                    .isTrue();
        }
    }
}
