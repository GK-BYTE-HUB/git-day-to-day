package com.gitdaytoday.util;

import java.util.List;
import java.util.function.Function;

/**
 * Shared utility class providing JSON escaping and array-building helpers
 * across servlets.
 */
public final class JsonUtil {

    private JsonUtil() {
        // Utility class, prevent instantiation
    }

    /**
     * Escapes special characters in a string for safe inclusion in JSON string values.
     *
     * @param value the string to escape
     * @return the escaped string, or empty string if input is null
     */
    public static String escapeJson(String value) {
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
                    break;
            }
        }

        return result.toString();
    }

    /**
     * Formats a string as a quoted JSON string value or "null" literal if null.
     *
     * @param value string value
     * @return quoted escaped string or "null"
     */
    public static String toJsonString(String value) {
        if (value == null) {
            return "null";
        }
        return "\"" + escapeJson(value) + "\"";
    }

    /**
     * Builds a formatted JSON array string from a list of items using a serializer function.
     * Matches the exact indentation and formatting previously used across servlets:
     * [
     *   {...},
     *   {...}
     * ]
     *
     * @param items list of items
     * @param itemSerializer function that converts each item into its JSON representation
     * @param <T> item type
     * @return formatted JSON array string
     */
    public static <T> String buildJsonArray(List<T> items, Function<T, String> itemSerializer) {
        if (items == null) {
            return "[]";
        }

        StringBuilder json = new StringBuilder();
        json.append("[\n");

        for (int i = 0; i < items.size(); i++) {
            json.append(itemSerializer.apply(items.get(i)));
            if (i < items.size() - 1) {
                json.append(",");
            }
            json.append("\n");
        }

        json.append("]");
        return json.toString();
    }

    /**
     * Builds a formatted JSON array string from a list of pre-rendered JSON string elements.
     *
     * @param jsonElements list of JSON element strings
     * @return formatted JSON array string
     */
    public static String buildJsonArray(List<String> jsonElements) {
        return buildJsonArray(jsonElements, Function.identity());
    }
}
