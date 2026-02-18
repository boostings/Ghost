# Stage 1: Build
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

# Copy Maven wrapper and POM first for dependency caching
COPY pom.xml ./
COPY .mvn .mvn
COPY mvnw ./
RUN chmod +x mvnw

# Download dependencies (cached layer unless pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application, skip tests for faster image builds
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:17-jre

WORKDIR /app

# Create a non-root user for security
RUN groupadd --system ghost && useradd --system --gid ghost ghost

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Set ownership
RUN chown ghost:ghost app.jar

USER ghost

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
