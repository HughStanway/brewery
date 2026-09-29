# Stage 1: Build Next.js Dashboard static export
FROM node:20-alpine AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard ./
RUN rm -rf src/app/api
RUN npm run build

# Stage 2: Build Spring Boot Jar (including Dashboard static output)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
COPY common ./common
COPY core ./core
COPY build-engine ./build-engine
COPY registry ./registry
COPY dependency-resolver ./dependency-resolver
COPY deployment-engine ./deployment-engine
COPY cascade-rebuild ./cascade-rebuild

# Copy Next.js static export directly into Spring Boot static resources
COPY --from=dashboard-build /app/dashboard/out /app/core/src/main/resources/static

# Build the application
RUN mvn clean package -DskipTests -q

# Stage 3: Runtime Stage
FROM eclipse-temurin:21-jre

# Install git and Docker CLI
RUN apt-get update && apt-get install -y git curl && \
    curl -fsSL https://get.docker.com | sh && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/core/target/core-0.1.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
