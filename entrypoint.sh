#!/bin/bash
# Defensive line in case line endings get mangled during copy/paste
sed -i 's/\r$//' /entrypoint.sh 2>/dev/null || true

# Default port to 8080 if not set by Railway
PORT="${PORT:-8080}"

echo "Configuring Tomcat to bind to port: $PORT"

# Replace port="8080" with the port supplied by the environment
sed -i "s/port=\"8080\"/port=\"${PORT}\"/" "$CATALINA_HOME/conf/server.xml"

# Start Tomcat, making it PID 1 so it handles signals properly
exec catalina.sh run
