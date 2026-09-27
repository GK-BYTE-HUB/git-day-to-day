#!/bin/bash

# Ensure we're in the project root
mkdir -p .tools
cd .tools

# Download and extract OpenJDK 17
if [ ! -d "jdk" ]; then
    echo "Downloading OpenJDK 17 for Windows..."
    curl -L "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk" -o jdk.zip
    echo "Extracting OpenJDK 17..."
    unzip -q -o jdk.zip
    rm jdk.zip
    # Rename extracted folder to 'jdk'
    mv jdk-* jdk
else
    echo "JDK already exists in .tools/jdk"
fi

# Download and extract Apache Maven
if [ ! -d "maven" ]; then
    echo "Downloading Apache Maven..."
    curl -L "https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip" -o maven.zip
    echo "Extracting Apache Maven..."
    unzip -q -o maven.zip
    rm maven.zip
    # Rename extracted folder to 'maven'
    mv apache-maven-* maven
else
    echo "Maven already exists in .tools/maven"
fi

echo "Setup complete. JDK and Maven extracted in .tools/"
