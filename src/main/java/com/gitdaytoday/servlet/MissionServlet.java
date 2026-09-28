package com.gitdaytoday.servlet;

import com.gitdaytoday.dao.MissionStepDao;
import com.gitdaytoday.exception.DataAccessException;
import com.gitdaytoday.model.MissionStep;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;

/**
 * REST API Servlet serving mission step data from the database.
 * Responds at /api/missions (optionally filtered by ?mission=X).
 */
@WebServlet("/api/missions")
public class MissionServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private MissionStepDao missionStepDao;

    @Override
    public void init() throws ServletException {
        super.init();
        this.missionStepDao = new MissionStepDao();
    }

    public MissionServlet() {
    }

    public MissionServlet(MissionStepDao missionStepDao) {
        this.missionStepDao = missionStepDao;
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String missionParam = request.getParameter("mission");
        List<MissionStep> steps;

        try {
            if (missionParam != null && !missionParam.trim().isEmpty()) {
                int missionNo = Integer.parseInt(missionParam.trim());
                steps = missionStepDao.findByMission(missionNo);
            } else {
                steps = missionStepDao.findAll();
            }
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            PrintWriter out = response.getWriter();
            out.write("{\"error\": \"Invalid mission parameter. Must be an integer.\"}");
            out.flush();
            return;
        } catch (DataAccessException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            PrintWriter out = response.getWriter();
            out.write("{\"error\": \"Database access error: " + escapeJson(e.getMessage()) + "\"}");
            out.flush();
            return;
        }

        String json = buildJsonArray(steps);
        PrintWriter out = response.getWriter();
        out.write(json);
        out.flush();
    }

    /**
     * Constructs a JSON array matching the exact shape of api-contracts/missions.json.
     *
     * @param steps List of MissionStep objects
     * @return Formatted JSON array string
     */
    private String buildJsonArray(List<MissionStep> steps) {
        StringBuilder json = new StringBuilder();
        json.append("[\n");

        for (int i = 0; i < steps.size(); i++) {
            MissionStep step = steps.get(i);
            json.append("  {\n");
            json.append("    \"missionNo\": ").append(step.getMissionNo()).append(",\n");
            json.append("    \"stepNo\": ").append(step.getStepNo()).append(",\n");
            json.append("    \"instruction\": \"").append(escapeJson(step.getInstruction())).append("\",\n");
            json.append("    \"expectedCommands\": [\n");

            List<String> cmds = parseExpectedCommands(step.getExpectedCommands());
            for (int j = 0; j < cmds.size(); j++) {
                json.append("      \"").append(escapeJson(cmds.get(j))).append("\"");
                if (j < cmds.size() - 1) {
                    json.append(",");
                }
                json.append("\n");
            }

            json.append("    ]\n");
            json.append("  }");
            if (i < steps.size() - 1) {
                json.append(",");
            }
            json.append("\n");
        }

        json.append("]");
        return json.toString();
    }

    /**
     * Parses the expected_commands string from the database (typically a JSON array string
     * like ["mkdir my-website"] or ["git add .", "git add -A"]) into a List of command strings.
     *
     * @param raw Raw expected_commands text from database
     * @return List of command strings
     */
    private List<String> parseExpectedCommands(String raw) {
        List<String> commands = new ArrayList<>();
        if (raw == null || raw.trim().isEmpty()) {
            return commands;
        }

        String trimmed = raw.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            boolean inQuotes = false;
            StringBuilder current = new StringBuilder();

            for (int i = 1; i < trimmed.length() - 1; i++) {
                char c = trimmed.charAt(i);

                if (inQuotes && c == '\\' && i + 1 < trimmed.length() - 1) {
                    char next = trimmed.charAt(i + 1);
                    if (next == '"' || next == '\\') {
                        current.append(next);
                        i++;
                        continue;
                    }
                }

                if (c == '"') {
                    if (inQuotes) {
                        commands.add(current.toString());
                        current.setLength(0);
                        inQuotes = false;
                    } else {
                        inQuotes = true;
                    }
                } else if (inQuotes) {
                    current.append(c);
                }
            }

            if (inQuotes && current.length() > 0) {
                commands.add(current.toString());
            }
        } else {
            String unquoted = trimmed.replaceAll("^\"|\"$", "");
            if (!unquoted.isEmpty()) {
                commands.add(unquoted);
            }
        }

        return commands;
    }

    /**
     * Escapes characters in a string for safe inclusion in JSON values.
     *
     * @param s Input string
     * @return Escaped string
     */
    private String escapeJson(String s) {
        if (s == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\b':
                    sb.append("\\b");
                    break;
                case '\f':
                    sb.append("\\f");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    if (c < ' ') {
                        String hex = "000" + Integer.toHexString(c);
                        sb.append("\\u").append(hex.substring(hex.length() - 4));
                    } else {
                        sb.append(c);
                    }
                    break;
            }
        }
        return sb.toString();
    }
}
