<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<jsp:include page="includes/header.jsp">
    <jsp:param name="title" value="Git Day to Day | Neo-Brutalism Core Verified" />
</jsp:include>

<div class="container" style="padding-top: 48px; padding-bottom: 48px;">
    <section class="neo-card" style="max-width: 650px; margin: 40px auto; text-align: center;">
        <span class="neo-badge" style="display: inline-block; margin-bottom: 16px;">Phase 3 &bull; Step 5 Checkpoint</span>
        <h1 style="font-size: 2.2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 16px;">
            Neo-Brutalism Core Active
        </h1>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 28px; color: var(--text);">
            The shared design system is working. Global CSS tokens, typography (<code style="background: #e2e8f0; padding: 2px 6px;">Space Grotesk</code> &amp; <code style="background: #e2e8f0; padding: 2px 6px;">IBM Plex Mono</code>), and modular JSP headers and footers are functioning across the application.
        </p>
        <div>
            <button type="button" class="neo-btn" id="test-btn">
                Test Neo Button &rarr;
            </button>
        </div>
    </section>
</div>

<jsp:include page="includes/footer.jsp" />