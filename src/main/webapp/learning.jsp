<%@ page contentType="text/html;charset=UTF-8" language="java" %>

<jsp:include page="includes/header.jsp">
    <jsp:param name="title" value="Git Day to Day | Learn" />
</jsp:include>

<link rel="stylesheet"
      href="${pageContext.request.contextPath}/css/learn.css">


<!--
    Make the Tomcat application context available to learn.js.

    Example:
    /git-day-to-day
-->
<script>
    const APP_CONTEXT = '${pageContext.request.contextPath}';
</script>


<div class="learn-page">

    <!-- ======================================================
         LEFT SIDEBAR
         ====================================================== -->

    <aside class="learn-sidebar">

        <div class="sidebar-header">

            <span class="neo-badge">
                LEARN MODULE
            </span>

            <h1>
                Git Reference
            </h1>

            <p>
                Select a command to learn.
            </p>

        </div>


        <div id="module-list" class="module-list">


            <!-- MODULE 1 -->

            <div class="module">

                <button
                    type="button"
                    class="module-header"
                    data-module="1">

                    <span>
                        01 — Terminal Basics
                    </span>

                    <span class="module-arrow">
                        +
                    </span>

                </button>


                <div
                    class="command-list"
                    id="module-1">
                </div>

            </div>


            <!-- MODULE 2 -->

            <div class="module">

                <button
                    type="button"
                    class="module-header"
                    data-module="2">

                    <span>
                        02 — Git Basics
                    </span>

                    <span class="module-arrow">
                        +
                    </span>

                </button>


                <div
                    class="command-list"
                    id="module-2">
                </div>

            </div>


            <!-- MODULE 3 -->

            <div class="module">

                <button
                    type="button"
                    class="module-header"
                    data-module="3">

                    <span>
                        03 — Branching &amp; Merging
                    </span>

                    <span class="module-arrow">
                        +
                    </span>

                </button>


                <div
                    class="command-list"
                    id="module-3">
                </div>

            </div>


            <!-- MODULE 4 -->

            <div class="module">

                <button
                    type="button"
                    class="module-header"
                    data-module="4">

                    <span>
                        04 — Remotes &amp; Undoing
                    </span>

                    <span class="module-arrow">
                        +
                    </span>

                </button>


                <div
                    class="command-list"
                    id="module-4">
                </div>

            </div>

        </div>

    </aside>


    <!-- ======================================================
         MAIN CONTENT
         ====================================================== -->

    <main class="learn-content">

        <div
            id="command-content"
            class="neo-card command-card">

            <div class="empty-state">

                <span class="empty-number">
                    01
                </span>

                <h2>
                    Select a Git command
                </h2>

                <p>
                    Choose a command from the module index
                    to see its syntax, example and workflow.
                </p>

            </div>

        </div>

    </main>

</div>


<!-- LEARN JAVASCRIPT -->

<script src="${pageContext.request.contextPath}/js/learn.js"></script>


<jsp:include page="includes/footer.jsp" />