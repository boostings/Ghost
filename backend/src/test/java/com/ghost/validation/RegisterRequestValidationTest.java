package com.ghost.validation;

import com.ghost.dto.request.RegisterRequest;
import com.ghost.dto.request.VerifyEmailRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class RegisterRequestValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @ParameterizedTest(name = "password length {0} should be valid={2}")
    @MethodSource("passwordBoundaryCases")
    void registerRequestShouldEnforcePasswordBoundaries(
            int length,
            String password,
            boolean expectedValid
    ) {
        RegisterRequest request = RegisterRequest.builder()
                .email("student@ilstu.edu")
                .password(password)
                .firstName("Taylor")
                .lastName("Student")
                .build();

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(hasViolation(violations, "password")).isEqualTo(!expectedValid);
    }

    @ParameterizedTest(name = "verification code \"{0}\" should be valid={1}")
    @MethodSource("verificationCodeBoundaryCases")
    void verifyEmailRequestShouldRequireExactlySixDigits(String code, boolean expectedValid) {
        VerifyEmailRequest request = VerifyEmailRequest.builder()
                .email("student@ilstu.edu")
                .code(code)
                .build();

        Set<ConstraintViolation<VerifyEmailRequest>> violations = validator.validate(request);

        assertThat(hasViolation(violations, "code")).isEqualTo(!expectedValid);
    }

    private boolean hasViolation(Set<? extends ConstraintViolation<?>> violations, String propertyName) {
        return violations.stream()
                .anyMatch(violation -> propertyName.equals(violation.getPropertyPath().toString()));
    }

    private static Stream<Arguments> passwordBoundaryCases() {
        return Stream.of(
                Arguments.of(7, "passw01", false),
                Arguments.of(8, "passw0r1", true),
                Arguments.of(64, repeatedPassword(64), true),
                Arguments.of(128, repeatedPassword(128), true),
                Arguments.of(129, repeatedPassword(129), false)
        );
    }

    private static Stream<Arguments> verificationCodeBoundaryCases() {
        return Stream.of(
                Arguments.of("12345", false),
                Arguments.of("123456", true),
                Arguments.of("654321", true),
                Arguments.of("1234567", false)
        );
    }

    private static String repeatedPassword(int length) {
        String body = "a".repeat(Math.max(0, length - 1));
        return body + "1";
    }
}
