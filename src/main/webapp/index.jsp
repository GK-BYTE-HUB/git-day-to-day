<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<jsp:include page="includes/header.jsp">
    <jsp:param name="title" value="Git Day to Day | Learn Git Interactively" />
</jsp:include>

<link rel="stylesheet" href="${pageContext.request.contextPath}/css/index.css">

<div class="container landing-container">
    <!-- Hero Section -->
    <section class="neo-card hero-card">
        <span class="hero-badge">Built for Beginners</span>
        <h1 class="hero-title">
            Master <span class="highlight">Git</span> through terminal simulation.
        </h1>
        <p class="hero-pitch">
            Learn Git step-by-step in a risk-free simulated environment without breaking real repositories.
        </p>
        <div class="hero-cta-group">
            <a href="${pageContext.request.contextPath}/learning.jsp?module=1" id="main-cta-btn" class="neo-btn hero-cta-btn">
                START LEARNING &rarr;
            </a>
            <div id="cta-microcopy" class="hero-microcopy"></div>
        </div>
    </section>
</div>

<script src="${pageContext.request.contextPath}/js/index.js"></script>

<jsp:include page="includes/footer.jsp" />