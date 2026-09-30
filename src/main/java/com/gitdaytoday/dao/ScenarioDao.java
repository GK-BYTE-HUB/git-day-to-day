package com.gitdaytoday.dao;

import com.gitdaytoday.exception.DataAccessException;
import com.gitdaytoday.model.Scenario;
import com.gitdaytoday.util.DBConnectionManager;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object implementation for Scenario entities.
 */
public class ScenarioDao implements Dao<Scenario> {

    @Override
    public Scenario findById(int id) throws DataAccessException {
        String sql = "SELECT id, title, the_mess, explanation, fix_steps, lab_prefill_state FROM scenarios WHERE id = ?";
        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Scenario(rs);
                }
            }
            return null;
        } catch (SQLException e) {
            e.printStackTrace();
            throw new DataAccessException("Error fetching scenario with id: " + id, e);
        }
    }

    @Override
    public List<Scenario> findAll() throws DataAccessException {
        String sql = "SELECT id, title, the_mess, explanation, fix_steps, lab_prefill_state FROM scenarios ORDER BY id ASC";
        List<Scenario> scenarios = new ArrayList<>();

        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                scenarios.add(new Scenario(rs));
            }
            return scenarios;
        } catch (SQLException e) {
            e.printStackTrace();
            throw new DataAccessException("Error fetching all scenarios", e);
        }
    }

    @Override
    public List<Scenario> findByModule(int moduleNo) throws DataAccessException {
        return findAll();
    }
}
