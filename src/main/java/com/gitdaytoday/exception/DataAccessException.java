package com.gitdaytoday.exception;

import java.sql.SQLException;

/**
 * Custom checked exception that wraps underlying SQL and database exceptions
 * within the DAO layer.
 */
public class DataAccessException extends Exception {
    private static final long serialVersionUID = 1L;

    public DataAccessException(String message) {
        super(message);
    }

    public DataAccessException(String message, Throwable cause) {
        super(message, cause);
    }

    public DataAccessException(Throwable cause) {
        super(cause);
    }

    public DataAccessException(String message, SQLException sqlException) {
        super(message, sqlException);
    }

    public DataAccessException(SQLException sqlException) {
        super(sqlException);
    }
}
