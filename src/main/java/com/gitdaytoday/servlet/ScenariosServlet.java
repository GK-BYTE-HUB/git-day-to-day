package com.gitdaytoday.servlet;

import com.gitdaytoday.dao.ScenarioDao;
import com.gitdaytoday.exception.DataAccessException;
import com.gitdaytoday.model.Scenario;
import com.gitdaytoday.util.JsonUtil;

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
 * REST API Servlet serving real-world scenario data from the database.
 * Responds at /api/scenarios (optionally filtered by ?id=X).
 */
@WebServlet("/api/scenarios")
public class ScenariosServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private ScenarioDao scenarioDao;

    @Override
    public void init() throws ServletException {
        super.init();
        this.scenarioDao = new ScenarioDao();
    }

    public ScenariosServlet() {
    }

    public ScenariosServlet(ScenarioDao scenarioDao) {
        this.scenarioDao = scenarioDao;
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String idParam = request.getParameter("id");
        List<Scenario> scenarios = new ArrayList<>();

        try {
            if (idParam != null && !idParam.trim().isEmpty()) {
                int id = Integer.parseInt(idParam.trim());
                Scenario scenario = scenarioDao.findById(id);
                if (scenario != null) {
                    scenarios.add(scenario);
                }
            } else {
                scenarios = scenarioDao.findAll();
            }
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            PrintWriter out = response.getWriter();
            out.write("{\"error\": \"Invalid scenario ID parameter. Must be an integer.\"}");
            out.flush();
            return;
        } catch (DataAccessException e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            PrintWriter out = response.getWriter();
            out.write("{\"error\": \"Database access error: " + JsonUtil.escapeJson(e.getMessage()) + "\"}");
            out.flush();
            return;
        }

        String json = buildJsonArray(scenarios);
        PrintWriter out = response.getWriter();
        out.write(json);
        out.flush();
    }

    /**
     * Constructs a JSON array string matching the exact shape of api-contracts/scenarios.json.
     *
     * @param scenarios List of Scenario objects
     * @return Formatted JSON array string
     */
    private String buildJsonArray(List<Scenario> scenarios) {
        return JsonUtil.buildJsonArray(scenarios, s -> {
            StringBuilder json = new StringBuilder();
            json.append("  {\n");
            json.append("    \"id\": ").append(s.getId()).append(",\n");
            json.append("    \"title\": \"").append(JsonUtil.escapeJson(s.getTitle())).append("\",\n");
            json.append("    \"theMess\": \"").append(JsonUtil.escapeJson(s.getTheMess())).append("\",\n");
            json.append("    \"explanation\": \"").append(JsonUtil.escapeJson(s.getExplanation())).append("\",\n");

            String fixStepsJson = (s.getFixSteps() != null && !s.getFixSteps().trim().isEmpty()) ? s.getFixSteps().trim() : "[]";
            json.append("    \"fixSteps\": ").append(fixStepsJson).append(",\n");

            String labPrefillJson = (s.getLabPrefillState() != null && !s.getLabPrefillState().trim().isEmpty()) ? s.getLabPrefillState().trim() : "{}";
            json.append("    \"labPrefillState\": ").append(labPrefillJson).append("\n");

            json.append("  }");
            return json.toString();
        });
    }
}
