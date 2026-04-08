package com.ghost.exception;

import com.ghost.dto.response.ApiError;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleValidationExceptionShouldReturnBadRequestWithFieldErrors() {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
        bindingResult.addError(new FieldError("request", "email", "Email is required"));
        bindingResult.addError(new FieldError("request", "password", "Password is required"));
        MethodArgumentNotValidException exception = new MethodArgumentNotValidException(
                Mockito.mock(org.springframework.core.MethodParameter.class),
                bindingResult
        );

        ResponseEntity<ApiError> response = handler.handleValidationException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getMessage()).isEqualTo("Validation failed");
        assertThat(response.getBody().getErrors())
                .containsExactlyInAnyOrder("email: Email is required", "password: Password is required");
    }

    @Test
    void handleResourceNotFoundExceptionShouldReturnNotFound() {
        ResponseEntity<ApiError> response = handler.handleResourceNotFoundException(
                new ResourceNotFoundException("Whiteboard", "id", UUID.randomUUID())
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(404);
        assertThat(response.getBody().getMessage()).contains("Whiteboard");
    }

    @Test
    void handleUnauthorizedExceptionShouldReturnUnauthorized() {
        ResponseEntity<ApiError> response = handler.handleUnauthorizedException(
                new UnauthorizedException("Only faculty can do this")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(401);
        assertThat(response.getBody().getMessage()).isEqualTo("Only faculty can do this");
    }

    @Test
    void handleBadRequestExceptionShouldReturnBadRequest() {
        ResponseEntity<ApiError> response = handler.handleBadRequestException(
                new BadRequestException("Invite code is invalid")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getMessage()).isEqualTo("Invite code is invalid");
    }

    @Test
    void handleHttpMessageNotReadableExceptionShouldReturnMalformedBodyMessage() {
        ResponseEntity<ApiError> response = handler.handleHttpMessageNotReadableException(
                new HttpMessageNotReadableException("Malformed JSON")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Malformed request body");
    }

    @Test
    void handleMethodArgumentTypeMismatchExceptionShouldReturnParameterMessage() {
        MethodArgumentTypeMismatchException exception = new MethodArgumentTypeMismatchException(
                "not-a-uuid",
                UUID.class,
                "whiteboardId",
                null,
                new IllegalArgumentException("bad value")
        );

        ResponseEntity<ApiError> response = handler.handleMethodArgumentTypeMismatchException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage())
                .isEqualTo("Invalid value for parameter 'whiteboardId': not-a-uuid");
    }

    @Test
    void handleConstraintViolationExceptionShouldReturnViolationMessages() {
        @SuppressWarnings("unchecked")
        ConstraintViolation<Object> violation = Mockito.mock(ConstraintViolation.class);
        Path path = Mockito.mock(Path.class);
        Mockito.when(path.toString()).thenReturn("register.email");
        Mockito.when(violation.getPropertyPath()).thenReturn(path);
        Mockito.when(violation.getMessage()).thenReturn("must end with @ilstu.edu");

        ResponseEntity<ApiError> response = handler.handleConstraintViolationException(
                new ConstraintViolationException(Set.of(violation))
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Constraint validation failed");
        assertThat(response.getBody().getErrors()).containsExactly("register.email: must end with @ilstu.edu");
    }

    @Test
    void handleIllegalArgumentExceptionShouldReturnMessageOrFallback() {
        ResponseEntity<ApiError> withMessage = handler.handleIllegalArgumentException(
                new IllegalArgumentException("Bad page size")
        );
        ResponseEntity<ApiError> withoutMessage = handler.handleIllegalArgumentException(
                new IllegalArgumentException((String) null)
        );

        assertThat(withMessage.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(withMessage.getBody()).isNotNull();
        assertThat(withMessage.getBody().getMessage()).isEqualTo("Bad page size");
        assertThat(withoutMessage.getBody()).isNotNull();
        assertThat(withoutMessage.getBody().getMessage()).isEqualTo("Invalid argument");
    }

    @Test
    void handleAccessDeniedExceptionShouldReturnForbidden() {
        ResponseEntity<ApiError> response = handler.handleAccessDeniedException(
                new AccessDeniedException("Forbidden")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(403);
        assertThat(response.getBody().getMessage()).isEqualTo("Access denied");
    }

    @Test
    void handleGenericExceptionShouldReturnInternalServerError() {
        ResponseEntity<ApiError> response = handler.handleGenericException(new RuntimeException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(500);
        assertThat(response.getBody().getMessage()).isEqualTo("An unexpected error occurred");
    }
}
