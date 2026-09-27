package com.gitdaytoday.model;

import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Model representing a step in a guided mission from the 'mission_steps' table.
 */
public class MissionStep {
    private int id;
    private int missionNo;
    private int stepNo;
    private String instruction;
    private String expectedCommands; // JSON array string e.g. ["mkdir my-website"]

    public MissionStep() {
    }

    public MissionStep(int id, int missionNo, int stepNo, String instruction, String expectedCommands) {
        this.id = id;
        this.missionNo = missionNo;
        this.stepNo = stepNo;
        this.instruction = instruction;
        this.expectedCommands = expectedCommands;
    }

    public MissionStep(ResultSet rs) throws SQLException {
        this.id = rs.getInt("id");
        this.missionNo = rs.getInt("mission_no");
        this.stepNo = rs.getInt("step_no");
        this.instruction = rs.getString("instruction");
        this.expectedCommands = rs.getString("expected_commands");
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getMissionNo() {
        return missionNo;
    }

    public void setMissionNo(int missionNo) {
        this.missionNo = missionNo;
    }

    public int getStepNo() {
        return stepNo;
    }

    public void setStepNo(int stepNo) {
        this.stepNo = stepNo;
    }

    public String getInstruction() {
        return instruction;
    }

    public void setInstruction(String instruction) {
        this.instruction = instruction;
    }

    public String getExpectedCommands() {
        return expectedCommands;
    }

    public void setExpectedCommands(String expectedCommands) {
        this.expectedCommands = expectedCommands;
    }

    @Override
    public String toString() {
        return "MissionStep{" +
                "id=" + id +
                ", missionNo=" + missionNo +
                ", stepNo=" + stepNo +
                ", instruction='" + instruction + '\'' +
                ", expectedCommands='" + expectedCommands + '\'' +
                '}';
    }
}
