package com.gitdaytoday.model;

import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Model representing a real-world troubleshooting scenario from the 'scenarios' table.
 */
public class Scenario {
    private int id;
    private String title;
    private String theMess;
    private String explanation;
    private String fixSteps;          // JSON array string e.g. ["git restore --staged secret.txt"]
    private String labPrefillState;   // JSON snapshot string for lab sandbox state

    public Scenario() {
    }

    public Scenario(int id, String title, String theMess, String explanation, String fixSteps, String labPrefillState) {
        this.id = id;
        this.title = title;
        this.theMess = theMess;
        this.explanation = explanation;
        this.fixSteps = fixSteps;
        this.labPrefillState = labPrefillState;
    }

    public Scenario(ResultSet rs) throws SQLException {
        this.id = rs.getInt("id");
        this.title = rs.getString("title");
        this.theMess = rs.getString("the_mess");
        this.explanation = rs.getString("explanation");
        this.fixSteps = rs.getString("fix_steps");
        this.labPrefillState = rs.getString("lab_prefill_state");
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTheMess() {
        return theMess;
    }

    public void setTheMess(String theMess) {
        this.theMess = theMess;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getFixSteps() {
        return fixSteps;
    }

    public void setFixSteps(String fixSteps) {
        this.fixSteps = fixSteps;
    }

    public String getLabPrefillState() {
        return labPrefillState;
    }

    public void setLabPrefillState(String labPrefillState) {
        this.labPrefillState = labPrefillState;
    }

    @Override
    public String toString() {
        return "Scenario{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", theMess='" + theMess + '\'' +
                ", explanation='" + explanation + '\'' +
                ", fixSteps='" + fixSteps + '\'' +
                ", labPrefillState='" + labPrefillState + '\'' +
                '}';
    }
}
