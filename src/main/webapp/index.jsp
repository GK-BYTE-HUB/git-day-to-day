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

    <!-- Progress Hub (Shown only for returning users) -->
    <section id="progress-hub" class="neo-card progress-hub" style="display: none;">
        <div class="progress-hub-header">
            <div class="progress-hub-title-group">
                <span class="neo-badge progress-badge">PROGRESS HUB</span>
                <h2 class="progress-hub-heading">Welcome back!</h2>
            </div>
            <div class="progress-stats">
                <span class="stat-pill" id="stat-commands">Commands Practiced: <strong>0/20</strong></span>
                <span class="stat-pill" id="stat-missions">Missions Completed: <strong>0/4</strong></span>
            </div>
        </div>

        <!-- Chunky Brutalist Progress Bar -->
        <div class="progress-bar-container">
            <div id="progress-bar-fill" class="progress-bar-fill" style="width: 0%;">
                <span id="progress-bar-text" class="progress-bar-text">0%</span>
            </div>
        </div>

        <!-- Quick-Jump Buttons -->
        <div class="quick-jump-group">
            <span class="quick-jump-label">QUICK JUMP:</span>
            <a href="${pageContext.request.contextPath}/learning.jsp?module=1" id="qj-learn" class="neo-btn qj-btn">
                Learn &rarr;
            </a>
            <a href="${pageContext.request.contextPath}/lab.jsp?mode=guided&mission=1" id="qj-lab" class="neo-btn qj-btn qj-primary">
                Lab &rarr;
            </a>
            <a href="${pageContext.request.contextPath}/scenarios.jsp" id="qj-scenarios" class="neo-btn qj-btn">
                Scenarios &rarr;
            </a>
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