package com.gitdaytoday.model;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a guided mission aggregate containing mission details and its sequence of steps.
 */
public class Mission {
    private int id;
    private int missionNo;
    private String title;
    private String description;
    private List<MissionStep> steps = new ArrayList<>();

    public Mission() {
    }

    public Mission(int id, int missionNo, String title, String description) {
        this.id = id;
        this.missionNo = missionNo;
        this.title = title;
        this.description = description;
    }

    public Mission(int id, int missionNo, String title, String description, List<MissionStep> steps) {
        this.id = id;
        this.missionNo = missionNo;
        this.title = title;
        this.description = description;
        this.steps = (steps != null) ? steps : new ArrayList<>();
    }

    public Mission(ResultSet rs) throws SQLException {
        ResultSetMetaData meta = rs.getMetaData();
        int count = meta.getColumnCount();

        for (int i = 1; i <= count; i++) {
            String col = meta.getColumnLabel(i);
            if (col == null || col.isEmpty()) {
                col = meta.getColumnName(i);
            }
            if ("id".equalsIgnoreCase(col)) {
                this.id = rs.getInt(i);
            } else if ("mission_no".equalsIgnoreCase(col)) {
                this.missionNo = rs.getInt(i);
            } else if ("title".equalsIgnoreCase(col) || "name".equalsIgnoreCase(col)) {
                this.title = rs.getString(i);
            } else if ("description".equalsIgnoreCase(col)) {
                this.description = rs.getString(i);
            }
        }

        if (this.missionNo == 0 && this.id != 0) {
            this.missionNo = this.id;
        }
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<MissionStep> getSteps() {
        return steps;
    }

    public void setSteps(List<MissionStep> steps) {
        this.steps = (steps != null) ? steps : new ArrayList<>();
    }

    public void addStep(MissionStep step) {
        if (this.steps == null) {
            this.steps = new ArrayList<>();
        }
        this.steps.add(step);
    }

    @Override
    public String toString() {
        return "Mission{" +
                "id=" + id +
                ", missionNo=" + missionNo +
                ", title='" + title + '\'' +
                ", description='" + description + '\'' +
                ", stepsCount=" + (steps != null ? steps.size() : 0) +
                '}';
    }
}
