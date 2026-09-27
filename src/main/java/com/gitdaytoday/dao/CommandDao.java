package com.gitdaytoday.dao;

import com.gitdaytoday.exception.DataAccessException;
import com.gitdaytoday.model.Command;
import com.gitdaytoday.util.DBConnectionManager;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object implementation for Command entities.
 */
public class CommandDao implements Dao<Command> {

    @Override
    public Command findById(int id) throws DataAccessException {
        String sql = "SELECT id, module_no, name, tldr, syntax, example, used_after, used_before FROM commands WHERE id = ?";
        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Command(rs);
                }
            }
            return null;
        } catch (SQLException e) {
            throw new DataAccessException("Error fetching command with id: " + id, e);
        }
    }

    @Override
    public List<Command> findAll() throws DataAccessException {
        String sql = "SELECT id, module_no, name, tldr, syntax, example, used_after, used_before FROM commands ORDER BY module_no ASC, id ASC";
        List<Command> commands = new ArrayList<>();

        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                commands.add(new Command(rs));
            }
            return commands;
        } catch (SQLException e) {
            throw new DataAccessException("Error fetching all commands", e);
        }
    }

    @Override
    public List<Command> findByModule(int moduleNo) throws DataAccessException {
        String sql = "SELECT id, module_no, name, tldr, syntax, example, used_after, used_before FROM commands WHERE module_no = ? ORDER BY id ASC";
        List<Command> commands = new ArrayList<>();

        try (Connection conn = DBConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, moduleNo);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    commands.add(new Command(rs));
                }
            }
            return commands;
        } catch (SQLException e) {
            throw new DataAccessException("Error fetching commands for module: " + moduleNo, e);
        }
    }
}
