FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM tomcat:9.0-jdk17-temurin
# Remove default webapps to prevent conflicts
RUN rm -rf $CATALINA_HOME/webapps/ROOT

# Copy the WAR from the build stage as ROOT.war
COPY --from=build /app/target/*.war $CATALINA_HOME/webapps/ROOT.war

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
