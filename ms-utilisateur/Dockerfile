# Start with a base image containing Java runtime (Java 21 LTS ; cours : FROM openjdk:27-ea-jdk)
FROM eclipse-temurin:21-jdk
MAINTAINER fatylamine.com
COPY target/ms-utilisateur-0.0.1-SNAPSHOT.jar ms-utilisateur-0.0.1-SNAPSHOT.jar
EXPOSE 3005
ENTRYPOINT ["java", "-jar", "ms-utilisateur-0.0.1-SNAPSHOT.jar"]

