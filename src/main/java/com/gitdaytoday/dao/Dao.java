package com.gitdaytoday.dao;

import java.util.List;
import com.gitdaytoday.exception.DataAccessException;

/**
 * Generic Data Access Object (DAO) interface defining core persistence retrieval operations.
 *
 * @param <T> the model entity type
 */
public interface Dao<T> {
    /**
     * Retrieves an entity by its unique database identifier.
     *
     * @param id the record primary key
     * @return the found entity instance, or null if not found
     * @throws DataAccessException if a database access error occurs
     */
    T findById(int id) throws DataAccessException;

    /**
     * Retrieves all entities of type T from the database.
     *
     * @return a List of all entities found
     * @throws DataAccessException if a database access error occurs
     */
    List<T> findAll() throws DataAccessException;

    /**
     * Retrieves entities associated with a specific module or mission number.
     *
     * @param moduleNo the module or mission group number
     * @return a List of matching entities
     * @throws DataAccessException if a database access error occurs
     */
    List<T> findByModule(int moduleNo) throws DataAccessException;
}
