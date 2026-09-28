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

    <!-- Four Feature Block Cards -->
    <section class="features-section">
        <div class="features-grid">
            <!-- Card 1: Learn -->
            <div class="neo-card feature-card">
                <div>
                    <div class="feature-header">
                        <span class="feature-tag">MODULES</span>
                    </div>
                    <h2 class="feature-title">Learn Concepts</h2>
                    <p class="feature-desc">
                        Master fundamental Git concepts with clear breakdowns, visual diagrams, and practical examples before diving into terminal commands.
                    </p>
                </div>
                <div class="feature-action">
                    <a href="${pageContext.request.contextPath}/learning.jsp?module=1" class="neo-btn">
                        Explore Lessons &rarr;
                    </a>
                </div>
            </div>

            <!-- Card 2: Guided Training -->
            <div class="neo-card feature-card">
                <div>
                    <div class="feature-header">
                        <span class="feature-tag tag-pink">GUIDED</span>
                    </div>
                    <h2 class="feature-title">Guided Training</h2>
                    <p class="feature-desc">
                        Solve interactive missions step-by-step inside the terminal simulator with real-time feedback and hints.
                    </p>
                </div>
                <div class="feature-action">
                    <a href="${pageContext.request.contextPath}/lab.jsp?mode=guided&mission=1" id="feature-guided-link" class="neo-btn">
                        Start Mission 1 &rarr;
                    </a>
                </div>
            </div>

            <!-- Card 3: Practice Sandbox -->
            <div class="neo-card feature-card">
                <div>
                    <div class="feature-header">
                        <span class="feature-tag tag-green">SANDBOX</span>
                    </div>
                    <h2 class="feature-title">Practice Sandbox</h2>
                    <p class="feature-desc">
                        Experiment freely with Git commands in a safe playground. Test `git branch`, `git log`, `git checkout` and more.
                    </p>
                </div>
                <div class="feature-action">
                    <a href="${pageContext.request.contextPath}/lab.jsp?mode=sandbox" class="neo-btn">
                        Open Sandbox &rarr;
                    </a>
                </div>
            </div>

            <!-- Card 4: Real-World Scenarios -->
            <div class="neo-card feature-card">
                <div>
                    <div class="feature-header">
                        <span class="feature-tag tag-blue">CHALLENGES</span>
                    </div>
                    <h2 class="feature-title">Real-World Scenarios</h2>
                    <p class="feature-desc">
                        Handle sticky real-life situations like untangling merge conflicts, recovering detached HEADs, and resetting commits.
                    </p>
                </div>
                <div class="feature-action">
                    <a href="${pageContext.request.contextPath}/scenarios.jsp" class="neo-btn">
                        View Scenarios &rarr;
                    </a>
                </div>
            </div>
        </div>
    </section>
</div>

<script src="${pageContext.request.contextPath}/js/index.js"></script>

<jsp:include page="includes/footer.jsp" />