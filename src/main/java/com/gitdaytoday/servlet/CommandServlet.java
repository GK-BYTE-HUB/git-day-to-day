package com.gitdaytoday.servlet;

import com.gitdaytoday.dao.CommandDao;
import com.gitdaytoday.exception.DataAccessException;
import com.gitdaytoday.model.Command;
import com.gitdaytoday.util.JsonUtil;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

@WebServlet("/api/commands")
public class CommandServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    private CommandDao commandDao;

    @Override
    public void init() throws ServletException {
        super.init();
        this.commandDao = new CommandDao();
    }

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String moduleParam = request.getParameter("module");

        try {
            List<Command> commands;

            if (moduleParam == null || moduleParam.trim().isEmpty()) {
                commands = commandDao.findAll();
            } else {
                int moduleNo = Integer.parseInt(moduleParam.trim());

                if (moduleNo < 1 || moduleNo > 4) {
                    sendError(
                            response,
                            HttpServletResponse.SC_BAD_REQUEST,
                            "Module must be between 1 and 4."
                    );
                    return;
                }

                commands = commandDao.findByModule(moduleNo);
            }

            PrintWriter out = response.getWriter();
            out.write(buildJsonArray(commands));
            out.flush();

        } catch (NumberFormatException e) {

            sendError(
                    response,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Invalid module parameter. Must be an integer."
            );

        } catch (DataAccessException e) {

            sendError(
                    response,
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Database access error."
            );
        }
    }

    private String buildJsonArray(List<Command> commands) {
        return JsonUtil.buildJsonArray(commands, command -> {
            StringBuilder json = new StringBuilder();
            json.append("  {\n");
            json.append("    \"id\": ")
                    .append(command.getId())
                    .append(",\n");
            json.append("    \"moduleNo\": ")
                    .append(command.getModuleNo())
                    .append(",\n");
            json.append("    \"name\": \"")
                    .append(JsonUtil.escapeJson(command.getName()))
                    .append("\",\n");
            json.append("    \"tldr\": \"")
                    .append(JsonUtil.escapeJson(command.getTldr()))
                    .append("\",\n");
            json.append("    \"syntax\": \"")
                    .append(JsonUtil.escapeJson(command.getSyntax()))
                    .append("\",\n");
            json.append("    \"example\": \"")
                    .append(JsonUtil.escapeJson(command.getExample()))
                    .append("\",\n");
            json.append("    \"usedAfter\": ")
                    .append(JsonUtil.toJsonString(command.getUsedAfter()))
                    .append(",\n");
            json.append("    \"usedBefore\": ")
                    .append(JsonUtil.toJsonString(command.getUsedBefore()))
                    .append("\n");
            json.append("  }");
            return json.toString();
        });
    }

    private void sendError(
            HttpServletResponse response,
            int status,
            String message)
            throws IOException {

        response.setStatus(status);

        PrintWriter out = response.getWriter();

        out.write(
                "{\"error\":\"" +
                JsonUtil.escapeJson(message) +
                "\"}"
        );

        out.flush();
    }
}