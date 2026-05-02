package com.ghost.model;

import com.ghost.model.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "role", discriminatorType = DiscriminatorType.STRING, length = 20)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "verification_code_expires_at")
    private LocalDateTime verificationCodeExpiresAt;

    @Column(name = "password_reset_code")
    private String passwordResetCode;

    @Column(name = "password_reset_code_expires_at")
    private LocalDateTime passwordResetCodeExpiresAt;

    @Column(name = "karma_score", nullable = false)
    @Builder.Default
    private int karmaScore = 0;

    @Column(name = "expo_push_token")
    private String expoPushToken;

    @Column(name = "anonymous_mode", nullable = false)
    @Builder.Default
    private boolean anonymousMode = false;

    @Column(name = "refresh_token_version", nullable = false)
    @Builder.Default
    private int refreshTokenVersion = 0;

    @Column(name = "settings_json", columnDefinition = "jsonb", nullable = false)
    @ColumnTransformer(write = "?::jsonb")
    @Builder.Default
    private String settingsJson = "{}";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Deliberate deviation from codeRules.md §11a (entity purity).
    // These three accessors expose the JPA single-table inheritance
    // discriminator (FacultyUser vs base User) as a Role enum. Hoisting
    // them into a service would force every caller — including security
    // (CustomUserDetailsService) and mappers — to depend on that service
    // just to ask "what kind of user is this?". Since the value is
    // structurally derived from the entity's own runtime type and never
    // mutated, it stays here.
    public Role getRole() {
        return isFaculty() ? Role.FACULTY : Role.STUDENT;
    }

    public boolean isFaculty() {
        return this instanceof FacultyUser;
    }

    public boolean isStudent() {
        return !isFaculty();
    }
}
