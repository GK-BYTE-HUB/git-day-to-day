package com.gitdaytoday.dao;

import com.gitdaytoday.exception.DataAccessException;
import com.gitdaytoday.model.MissionStep;
import com.gitdaytoday.util.DBConnectionManager;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object implementation for MissionStep entities.
 * Interacts with the 'mission_steps' database table.
 */
public class MissionStepDao implements Dao<MissionStep> {

    /**
     * Retrieves all steps associated with a specific mission number in sequential order.
     *
     * @param missionNo the mission number (e.g. 1, 2, 3, 4)
     * @return a List of MissionStep objects ordered by step_no
     * @throws DataAccessException if a database error occurs
     */
    public List<MissionStep> findByMission(int missionNo) throws DataAccessException {
        String sql = "SELECT id, mission_no, step_no, instruction, expected_commands " +
                     "FROM mission_steps WHERE mission_no = ? ORDER BY step_no ASC";
        List<MissionStep> steps = new ArrayList<>();

        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, missionNo);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    steps.add(new MissionStep(rs));
                }
            }
            return steps;
        } catch (SQLException e) {
            throw new DataAccessException("Error fetching steps for mission: " + missionNo, e);
        }
    }

    @Override
    public MissionStep findById(int id) throws DataAccessException {
        String sql = "SELECT id, mission_no, step_no, instruction, expected_commands " +
                     "FROM mission_steps WHERE id = ?";
        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new MissionStep(rs);
                }
            }
            return null;
        } catch (SQLException e) {
            throw new DataAccessException("Error fetching mission step with id: " + id, e);
        }
    }

    @Override
    public List<MissionStep> findAll() throws DataAccessException {
        String sql = "SELECT id, mission_no, step_no, instruction, expected_commands " +
                     "FROM mission_steps ORDER BY mission_no ASC, step_no ASC";
        List<MissionStep> steps = new ArrayList<>();

        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                steps.add(new MissionStep(rs));
            }
            return steps;
        } catch (SQLException e) {
            throw new DataAccessException("Error fetching all mission steps", e);
        }
    }

    @Override
    public List<MissionStep> findByModule(int moduleNo) throws DataAccessException {
        // In the context of guided missions, moduleNo maps directly to missionNo
        return findByMission(moduleNo);
    }
}
