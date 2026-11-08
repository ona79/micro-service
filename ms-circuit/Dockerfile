# Start with a base image containing Java runtime (Java 21 LTS ; cours : FROM openjdk:27-ea-jdk)
FROM eclipse-temurin:21-jdk
# Information around who maintains the image
MAINTAINER fatylamine.com
# Add the application's jar to the image
COPY target/ms-circuit-0.0.1-SNAPSHOT.jar ms-circuit-0.0.1-SNAPSHOT.jar
EXPOSE 3002
# Execute the application
ENTRYPOINT ["java", "-jar", "ms-circuit-0.0.1-SNAPSHOT.jar"]

