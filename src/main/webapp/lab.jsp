<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<jsp:include page="includes/header.jsp">
    <jsp:param name="title" value="The Practical Lab | Git Day to Day" />
</jsp:include>

<!-- Page-Specific Stylesheet for Practical Lab -->
<link rel="stylesheet" href="${pageContext.request.contextPath}/css/lab.css">

<div class="lab-page-container">

    <!-- =========================================================================
         Top Banner: Mission Control
         ========================================================================= -->
    <section class="mission-control-banner neo-card" aria-label="Mission Control Banner">
        <div class="mission-control-top">
            <div class="mission-meta-group">
                <span class="mission-badge-pill" id="mission-badge">Mission Control</span>
                <span class="mission-step-tag" id="mission-step-indicator">Step 1 of 6</span>
                <h1 class="mission-title-text" id="mission-title">Mission 1: Workspace Setup</h1>
            </div>
            <div class="mission-actions">
                <button type="button" class="mission-btn-sm" id="btn-prev-step" title="Go to previous step">&larr; Prev</button>
                <button type="button" class="mission-btn-sm" id="btn-next-step" title="Go to next step">Next &rarr;</button>
                <button type="button" class="mission-btn-sm" id="btn-reset-lab" title="Reset current mission sandbox state">Reset Lab</button>
            </div>
        </div>

        <div class="mission-instruction-box">
            <div class="instruction-content">
                <span class="instruction-label">Active Objective</span>
                <div class="instruction-text" id="mission-instruction">
                    Create a new directory called "my-website" for your project.
                </div>
            </div>
            <div class="instruction-hint" id="mission-hint-container">
                <button type="button" id="btn-show-hint" class="neo-btn">Show Hint</button>
                <span id="mission-hint-text" style="display: none;"></span>
            </div>
        </div>
    </section>

    <!-- =========================================================================
         Persistent Mode Toggle UI (Guided vs Practice Sandbox)
         ========================================================================= -->
    <div class="lab-mode-controls" aria-label="Simulator Mode Controls">
        <button type="button" id="btn-mode-guided" class="neo-btn mode-btn">Guided Missions</button>
        <button type="button" id="btn-mode-practice" class="neo-btn mode-btn">Practice (Sandbox)</button>
    </div>

    <!-- =========================================================================
         Main 3-Column Grid: Left (30%) | Middle (40%) | Right (30%)
         ========================================================================= -->
    <div class="lab-columns-grid">

        <!-- ---------------------------------------------------------------------
             Column 1 (Left 30%): File Tree & Working Dir / Staging Area
             --------------------------------------------------------------------- -->
        <aside class="lab-col-card neo-card" aria-label="File System and Tracking Areas">
            <div class="lab-col-header">
                <h2 class="lab-col-title">
                    <span>&#128193;</span> File System
                </h2>
                <span class="lab-col-tag" id="file-count-badge">0 files</span>
            </div>

            <div class="left-col-split">
                <!-- Top Half: File Tree -->
                <div class="file-tree-section">
                    <div class="sub-section-header">
                        <span>File Tree</span>
                        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: #64748B;">root/</span>
                    </div>
                    <div class="file-tree-body" id="file-tree-container">
                        <div class="file-tree-empty" id="file-tree-empty-msg">
                            No files created yet. Try 'touch' or 'mkdir'.
                        </div>
                        <ul class="file-tree-list" id="file-tree-list" style="display: none;">
                            <!-- Dynamically populated by lab.js -->
                        </ul>
                    </div>
                </div>

                <!-- Bottom Half: Working Directory & Staging Area -->
                <div class="working-staging-section">
                    <div class="sub-section-header">
                        <span>Status &amp; Staging Areas</span>
                        <span class="file-status-tag tracked" id="git-init-status-tag">.git not initialized</span>
                    </div>
                    <div class="status-boxes-grid">
                        <!-- Working Directory Box -->
                        <div class="status-box">
                            <div class="status-box-header">
                                <span>Working Directory</span>
                                <span class="file-status-tag untracked" id="working-dir-count">0</span>
                            </div>
                            <div class="status-box-body" id="working-dir-container">
                                <div class="status-box-empty" id="working-dir-empty-msg">
                                    Working tree clean
                                </div>
                                <ul class="file-tree-list" id="working-dir-list" style="display: none;">
                                    <!-- Dynamically populated by lab.js -->
                                </ul>
                            </div>
                        </div>

                        <!-- Staging Area Box -->
                        <div class="status-box">
                            <div class="status-box-header">
                                <span>Staging Area</span>
                                <span class="file-status-tag staged" id="staging-area-count">0</span>
                            </div>
                            <div class="status-box-body" id="staging-area-container">
                                <div class="status-box-empty" id="staging-area-empty-msg">
                                    Staging area empty
                                </div>
                                <ul class="file-tree-list" id="staging-area-list" style="display: none;">
                                    <!-- Dynamically populated by lab.js -->
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- ---------------------------------------------------------------------
             Column 2 (Middle 40%): Commit Graph (Top) & Remote Server (Bottom)
             --------------------------------------------------------------------- -->
        <div class="middle-col-split">
            <!-- Commit Graph Card -->
            <section class="lab-col-card neo-card commit-graph-card" aria-label="Git Commit Graph and History">
                <div class="lab-col-header">
                    <h2 class="lab-col-title">
                        <span>&#128392;</span> Commit Graph
                    </h2>
                    <div class="graph-branch-bar">
                        <span>HEAD &rarr;</span>
                        <span class="graph-head-badge" id="graph-head-branch">main</span>
                    </div>
                </div>

                <div class="commit-graph-body" id="commit-graph-scroll-area">
                    <div class="graph-canvas-placeholder" id="graph-empty-placeholder">
                        <div style="font-size: 2.2rem; margin-bottom: 8px;">&#9741;</div>
                        <h3 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">
                            No Commits Yet
                        </h3>
                        <p style="font-family: var(--font-mono); font-size: 0.8rem; color: #64748B; max-width: 320px; margin: 0 auto;">
                            Initialize Git with <code>git init</code>, stage files with <code>git add</code>, and create snapshots with <code>git commit</code>.
                        </p>
                    </div>

                    <div class="graph-timeline" id="graph-timeline" style="display: none;">
                        <!-- Dynamically populated commit nodes -->
                    </div>
                </div>
            </section>

            <!-- Remote Server (GitHub) Panel -->
            <section class="lab-col-card neo-card remote-server-card" id="remote-server-panel" aria-label="Remote Git Server">
                <div class="lab-col-header remote-header">
                    <h2 class="lab-col-title">
                        <span>&#9729;</span> REMOTE SERVER (GitHub)
                    </h2>
                    <span class="remote-status-badge disconnected" id="remote-status-tag">NO REMOTE</span>
                </div>

                <div class="remote-server-body" id="remote-server-body">
                    <div class="remote-repo-bar" id="remote-repo-bar" style="display: none;">
                        <span class="remote-repo-label">Remote:</span>
                        <code class="remote-repo-url" id="remote-repo-url"></code>
                    </div>

                    <div class="remote-branches-container">
                        <div class="remote-empty-placeholder" id="remote-empty-placeholder">
                            <span class="remote-cloud-icon">&#9729;</span>
                            <p>No remote repository connected. Use <code>git remote add origin &lt;url&gt;</code></p>
                        </div>
                        <ul class="remote-branches-list" id="remote-branches-list" style="display: none;">
                            <!-- Dynamically populated by lab.js -->
                        </ul>
                    </div>
                </div>
            </section>
        </div>

        <!-- ---------------------------------------------------------------------
             Column 3 (Right 30%): Terminal (Dark Background & CLI Prompt)
             --------------------------------------------------------------------- -->
        <section class="terminal-col-card neo-card" aria-label="Interactive Command Line Terminal">
            <div class="terminal-header">
                <div class="terminal-dots">
                    <span class="terminal-dot red"></span>
                    <span class="terminal-dot yellow"></span>
                    <span class="terminal-dot green"></span>
                </div>
                <span class="terminal-title">bash &bull; simulator</span>
                <span style="font-family: var(--font-mono); font-size: 0.7rem; color: #4ADE80;">ACTIVE</span>
            </div>

            <!-- Scrollable Terminal Output Screen -->
            <div class="terminal-screen" id="terminal-screen" role="log" aria-live="polite">
                <div class="terminal-line output">Git Day-to-Day Practical Lab Terminal v1.0.0</div>
                <div class="terminal-line output">Type commands below. Supported: git, mkdir, touch, ls, clear, rm, cd.</div>
                <div class="terminal-line output" style="color: #64748B;">------------------------------------------------------</div>
                <!-- Dynamic command output history inserted here -->
            </div>

            <!-- Terminal Command Prompt Input Bar -->
            <form id="terminal-form" class="terminal-input-bar" onsubmit="return false;">
                <label for="terminal-input" class="term-prompt-label" id="term-prompt-string">git-user@lab:~$</label>
                <input
                    type="text"
                    id="terminal-input"
                    class="term-input-field"
                    placeholder="Type a command (e.g. mkdir my-website)..."
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                />
            </form>
        </section>

    </div>
</div>

<!-- =========================================================================
     Notepad Modal for In-Browser File Editing
     ========================================================================= -->
<div id="notepad-modal" class="notepad-modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="notepad-filename">
    <div class="notepad-modal-card neo-card">
        <div class="notepad-modal-header">
            <div class="notepad-title-group">
                <span class="notepad-file-icon" aria-hidden="true">&#9998;</span>
                <span class="notepad-title-prefix">Editing:</span>
                <h3 id="notepad-filename" class="notepad-filename-title">file.txt</h3>
            </div>
            <span id="notepad-char-count" class="notepad-char-count">0 / 500 chars</span>
        </div>
        <div class="notepad-modal-body">
            <textarea
                id="notepad-textarea"
                class="notepad-textarea"
                maxlength="500"
                placeholder="Type file contents here (max 500 characters)..."
                spellcheck="false"
            ></textarea>
        </div>
        <div class="notepad-modal-footer">
            <button type="button" id="btn-notepad-cancel" class="neo-btn notepad-btn-cancel">Cancel</button>
            <button type="button" id="btn-notepad-save" class="neo-btn notepad-btn-save">Save</button>
        </div>
    </div>
</div>

<!-- Git Engine & State Model Scripts -->
<script src="${pageContext.request.contextPath}/js/progress.js"></script>
<script src="${pageContext.request.contextPath}/js/simulatorState.js"></script>
<script src="${pageContext.request.contextPath}/js/gitEngine.js"></script>
<script src="${pageContext.request.contextPath}/js/lab.js"></script>

<jsp:include page="includes/footer.jsp" />
