FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Install Maven
RUN apk add --no-cache maven

COPY pom.xml .
COPY common ./common
COPY api ./api
COPY core ./core
COPY build-engine ./build-engine
COPY registry ./registry
COPY dependency-resolver ./dependency-resolver
COPY deployment-engine ./deployment-engine

# Build the application
RUN mvn clean package -DskipTests -q

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy JAR from build stage
COPY --from=0 /app/core/target/core-0.1.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
