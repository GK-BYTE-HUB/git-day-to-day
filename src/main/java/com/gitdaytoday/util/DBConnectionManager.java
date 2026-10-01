package com.gitdaytoday.util;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

/**
 * Utility manager for providing database connections configured via db.properties.
 */
public class DBConnectionManager {
    private static final Properties properties = new Properties();

    static {
        loadProperties();
    }

    private static synchronized void loadProperties() {
        // First try loading via context classloader (standard for webapps)
        InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream("db.properties");
        if (is == null) {
            is = DBConnectionManager.class.getClassLoader().getResourceAsStream("db.properties");
        }
        if (is != null) {
            try {
                properties.load(is);
            } catch (IOException e) {
                System.err.println("Error reading db.properties from classpath: " + e.getMessage());
            } finally {
                try {
                    is.close();
                } catch (IOException ignored) {}
            }
        } else {
            // Fallback to direct file path (useful for standalone scripts/tests)
            File file = new File("src/main/resources/db.properties");
            if (file.exists()) {
                try (FileInputStream fis = new FileInputStream(file)) {
                    properties.load(fis);
                } catch (IOException e) {
                    System.err.println("Error reading db.properties from file system: " + e.getMessage());
                }
            }
        }

        // Load the JDBC Driver class
        String driver = properties.getProperty("db.driver", "com.mysql.cj.jdbc.Driver");
        try {
            Class.forName(driver);
        } catch (ClassNotFoundException e) {
            System.err.println("JDBC Driver class not found: " + driver);
        }
    }

    /**
     * Obtains a new database connection using credentials from environment variables or db.properties.
     *
     * @return a valid java.sql.Connection
     * @throws SQLException if a database access error occurs
     */
    public static Connection getConnection() throws SQLException {
        String mysqlHost = System.getenv("MYSQLHOST");
        
        if (mysqlHost != null && !mysqlHost.trim().isEmpty()) {
            System.out.println("Using environment-variable DB config");
            String mysqlPort = System.getenv("MYSQLPORT");
            String mysqlDb = System.getenv("MYSQLDATABASE");
            String user = System.getenv("MYSQLUSER");
            String password = System.getenv("MYSQLPASSWORD");
            
            String url = "jdbc:mysql://" + mysqlHost + ":" + mysqlPort + "/" + mysqlDb + "?useSSL=true&serverTimezone=UTC";
            return DriverManager.getConnection(url, user, password);
        } else {
            System.out.println("Using local db.properties");
            if (properties.isEmpty()) {
                loadProperties();
            }
            String url = properties.getProperty("db.url");
            String user = properties.getProperty("db.user");
            String password = properties.getProperty("db.password");

            return DriverManager.getConnection(url, user, password);
        }
    }
}
