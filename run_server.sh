#!/bin/bash

# Get absolute path of project root
PROJECT_ROOT="$(pwd)"

# Set JAVA_HOME and M2_HOME to the local .tools directories
export JAVA_HOME="$PROJECT_ROOT/.tools/jdk"
export M2_HOME="$PROJECT_ROOT/.tools/maven"

# Add them to PATH
export PATH="$JAVA_HOME/bin:$M2_HOME/bin:$PATH"

echo "Using JAVA_HOME: $JAVA_HOME"
echo "Using M2_HOME: $M2_HOME"

echo "Java version:"
java -version

echo "Maven version:"
mvn -version

echo "Starting Tomcat via Maven..."
mvn tomcat7:run
