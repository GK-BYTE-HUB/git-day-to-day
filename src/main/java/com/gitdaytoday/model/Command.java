package com.gitdaytoday.model;

import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Model representing a command from the 'commands' table.
 */
public class Command {
    private int id;
    private int moduleNo;
    private String name;
    private String tldr;
    private String syntax;
    private String example;
    private String usedAfter;
    private String usedBefore;

    public Command() {
    }

    public Command(int id, int moduleNo, String name, String tldr, String syntax, String example, String usedAfter, String usedBefore) {
        this.id = id;
        this.moduleNo = moduleNo;
        this.name = name;
        this.tldr = tldr;
        this.syntax = syntax;
        this.example = example;
        this.usedAfter = usedAfter;
        this.usedBefore = usedBefore;
    }

    public Command(ResultSet rs) throws SQLException {
        this.id = rs.getInt("id");
        this.moduleNo = rs.getInt("module_no");
        this.name = rs.getString("name");
        this.tldr = rs.getString("tldr");
        this.syntax = rs.getString("syntax");
        this.example = rs.getString("example");
        this.usedAfter = rs.getString("used_after");
        this.usedBefore = rs.getString("used_before");
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getModuleNo() {
        return moduleNo;
    }

    public void setModuleNo(int moduleNo) {
        this.moduleNo = moduleNo;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTldr() {
        return tldr;
    }

    public void setTldr(String tldr) {
        this.tldr = tldr;
    }

    public String getSyntax() {
        return syntax;
    }

    public void setSyntax(String syntax) {
        this.syntax = syntax;
    }

    public String getExample() {
        return example;
    }

    public void setExample(String example) {
        this.example = example;
    }

    public String getUsedAfter() {
        return usedAfter;
    }

    public void setUsedAfter(String usedAfter) {
        this.usedAfter = usedAfter;
    }

    public String getUsedBefore() {
        return usedBefore;
    }

    public void setUsedBefore(String usedBefore) {
        this.usedBefore = usedBefore;
    }

    @Override
    public String toString() {
        return "Command{" +
                "id=" + id +
                ", moduleNo=" + moduleNo +
                ", name='" + name + '\'' +
                ", tldr='" + tldr + '\'' +
                ", syntax='" + syntax + '\'' +
                ", example='" + example + '\'' +
                ", usedAfter='" + usedAfter + '\'' +
                ", usedBefore='" + usedBefore + '\'' +
                '}';
    }
}
