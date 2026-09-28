<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<jsp:include page="includes/header.jsp">
    <jsp:param name="title" value="Git Day to Day | Real-World Scenarios" />
</jsp:include>

<link rel="stylesheet" href="${pageContext.request.contextPath}/css/scenarios.css">

<div class="container scenarios-container">
    <!-- Header / Intro Section -->
    <section class="neo-card scenarios-header-card">
        <span class="scenarios-badge">REAL-WORLD TROUBLESHOOTING</span>
        <h1 class="scenarios-title">
            What to do when <span class="highlight">Git</span> goes wrong.
        </h1>
        <p class="scenarios-pitch">
            Don't panic! Explore real-world Git mistakes, understand why they happen, learn the step-by-step fix, and launch directly into the terminal simulator to practice repairing them.
        </p>
    </section>

    <!-- 2-Column Desktop / 1-Column Mobile Scenarios Grid -->
    <section class="scenarios-grid-section">
        <div id="scenarios-grid" class="scenarios-grid">
            <!-- Scenario cards rendered dynamically by scenarios.js -->
        </div>
    </section>
</div>

<!-- Progress manager script must be loaded before page scripts -->
<script src="${pageContext.request.contextPath}/js/progress.js"></script>
<script src="${pageContext.request.contextPath}/js/scenarios.js"></script>

<jsp:include page="includes/footer.jsp" />
