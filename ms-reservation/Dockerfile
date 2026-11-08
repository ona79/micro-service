# Start with a base image containing Java runtime (Java 21 LTS ; cours : FROM openjdk:27-ea-jdk)
FROM eclipse-temurin:21-jdk
# Information around who maintains the image
MAINTAINER fatylamine.com
# Add the application's jar to the image
COPY target/ms-reservation-0.0.1-SNAPSHOT.jar ms-reservation-0.0.1-SNAPSHOT.jar
EXPOSE 3004
# Execute the application
ENTRYPOINT ["java", "-jar", "ms-reservation-0.0.1-SNAPSHOT.jar"]

