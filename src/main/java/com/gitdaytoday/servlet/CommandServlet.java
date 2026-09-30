package com.gitdaytoday.servlet;

import com.gitdaytoday.dao.CommandDao;
import com.gitdaytoday.exception.DataAccessException;
import com.gitdaytoday.model.Command;

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

        StringBuilder json = new StringBuilder();

        json.append("[\n");

        for (int i = 0; i < commands.size(); i++) {

            Command command = commands.get(i);

            json.append("  {\n");

            json.append("    \"id\": ")
                    .append(command.getId())
                    .append(",\n");

            json.append("    \"moduleNo\": ")
                    .append(command.getModuleNo())
                    .append(",\n");

            json.append("    \"name\": \"")
                    .append(escapeJson(command.getName()))
                    .append("\",\n");

            json.append("    \"tldr\": \"")
                    .append(escapeJson(command.getTldr()))
                    .append("\",\n");

            json.append("    \"syntax\": \"")
                    .append(escapeJson(command.getSyntax()))
                    .append("\",\n");

            json.append("    \"example\": \"")
                    .append(escapeJson(command.getExample()))
                    .append("\",\n");

            json.append("    \"usedAfter\": ")
                    .append(toJsonString(command.getUsedAfter()))
                    .append(",\n");

            json.append("    \"usedBefore\": ")
                    .append(toJsonString(command.getUsedBefore()))
                    .append("\n");

            json.append("  }");

            if (i < commands.size() - 1) {
                json.append(",");
            }

            json.append("\n");
        }

        json.append("]");

        return json.toString();
    }

    private String toJsonString(String value) {

        if (value == null) {
            return "null";
        }

        return "\"" + escapeJson(value) + "\"";
    }

    private String escapeJson(String value) {

        if (value == null) {
            return "";
        }

        StringBuilder result = new StringBuilder();

        for (int i = 0; i < value.length(); i++) {

            char c = value.charAt(i);

            switch (c) {

                case '"':
                    result.append("\\\"");
                    break;

                case '\\':
                    result.append("\\\\");
                    break;

                case '\b':
                    result.append("\\b");
                    break;

                case '\f':
                    result.append("\\f");
                    break;

                case '\n':
                    result.append("\\n");
                    break;

                case '\r':
                    result.append("\\r");
                    break;

                case '\t':
                    result.append("\\t");
                    break;

                default:
                    if (c < 0x20) {
                        result.append(String.format("\\u%04x", (int) c));
                    } else {
                        result.append(c);
                    }
            }
        }

        return result.toString();
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
                escapeJson(message) +
                "\"}"
        );

        out.flush();
    }
}