<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${param.title != null ? param.title : 'Git Day to Day | Learn Git Interactively'}</title>
    <!-- Google Fonts: Space Grotesk & IBM Plex Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Shared Neo-Brutalism Global Stylesheet -->
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/global.css">
</head>
<body>
    <header>
        <nav class="neo-navbar">
            <a href="${pageContext.request.contextPath}/index.jsp" class="neo-navbar-brand">
                <span>Git Day to Day</span>
                <span class="neo-badge">Interactive</span>
            </a>
            <div class="neo-nav-links">
                <a href="${pageContext.request.contextPath}/learning.jsp" class="neo-nav-link">Learn</a>
                <a href="${pageContext.request.contextPath}/lab.jsp" class="neo-nav-link">Lab</a>
                <a href="${pageContext.request.contextPath}/scenarios.jsp" class="neo-nav-link">Scenarios</a>
            </div>
        </nav>
    </header>
    <main class="main-content">
