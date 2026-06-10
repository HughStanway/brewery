# Build stage using a pre-installed Maven image on top of Eclipse Temurin JDK 21
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY common ./common
COPY pubsub ./pubsub
COPY core ./core
COPY build-engine ./build-engine
COPY registry ./registry
COPY dependency-resolver ./dependency-resolver
COPY deployment-engine ./deployment-engine
COPY cascade-rebuild ./cascade-rebuild

# Build the application
RUN mvn clean package -DskipTests -q

# Runtime stage using standard glibc-based Eclipse Temurin JRE 21 (fixes netty ARM64 SIGSEGV on Alpine)
FROM eclipse-temurin:21-jre

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/core/target/core-0.1.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
