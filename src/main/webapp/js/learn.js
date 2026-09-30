/**
 * Git Day-to-Day
 * Learn Module
 *
 * Commands are loaded from:
 * GET /api/commands?module=N
 */

const modules = [1, 2, 3, 4];

const moduleCache = {};

let currentModule = null;
let currentCommand = null;


/* ============================================================
   LOAD MODULE
   ============================================================ */

async function loadModule(moduleNo) {

    const list = document.getElementById(`module-${moduleNo}`);

    if (!list) {
        return;
    }

    /* Use cached data if already loaded */
    if (moduleCache[moduleNo]) {
        renderCommandList(moduleNo, moduleCache[moduleNo]);
        return;
    }

    list.innerHTML = `
        <div class="command-item loading-item">
            Loading...
        </div>
    `;

    try {

        /*
         * APP_CONTEXT is defined in learning.jsp.
         *
         * Example:
         * /git-day-to-day
         *
         * Therefore the final API URL becomes:
         * /git-day-to-day/api/commands?module=1
         */
        const response = await fetch(
            `${APP_CONTEXT}/api/commands?module=${moduleNo}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const commands = await response.json();

        if (!Array.isArray(commands)) {
            throw new Error('Invalid API response');
        }

        moduleCache[moduleNo] = commands;

        renderCommandList(moduleNo, commands);

    } catch (error) {

        console.error(
            '[GitD2D] Failed to load commands:',
            error
        );

        list.innerHTML = `
            <div class="command-item error-item">
                Failed to load commands.
            </div>
        `;
    }
}


/* ============================================================
   SIDEBAR COMMAND LIST
   ============================================================ */

function renderCommandList(moduleNo, commands) {

    const list = document.getElementById(`module-${moduleNo}`);

    if (!list) {
        return;
    }

    list.innerHTML = '';

    if (commands.length === 0) {

        list.innerHTML = `
            <div class="command-item">
                No commands found.
            </div>
        `;

        return;
    }

    commands.forEach((command) => {

        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'command-item';

        button.textContent = command.name;

        button.dataset.commandId = command.id;

        button.addEventListener('click', () => {

            selectCommand(
                moduleNo,
                command
            );

        });

        list.appendChild(button);
    });


    /*
     * If the currently selected command belongs to this module,
     * restore the active state after rendering.
     */
    if (
        currentCommand &&
        Number(currentModule) === Number(moduleNo)
    ) {

        const selected = list.querySelector(
            `[data-command-id="${currentCommand.id}"]`
        );

        if (selected) {
            selected.classList.add('active');
        }
    }
}


/* ============================================================
   SELECT COMMAND
   ============================================================ */

function selectCommand(moduleNo, command) {

    currentModule = Number(moduleNo);
    currentCommand = command;

    /*
     * Remove active state from every sidebar command.
     */
    document
        .querySelectorAll('.command-item')
        .forEach((item) => {

            item.classList.remove('active');

        });


    /*
     * Highlight selected command.
     */
    const selected = document.querySelector(
        `.command-item[data-command-id="${command.id}"]`
    );

    if (selected) {
        selected.classList.add('active');
    }


    /*
     * Render command content.
     */
    renderCommand(command);


    /*
     * Smoothly move the content area into view.
     */
    const content =
        document.getElementById('command-content');

    if (content) {

        content.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}


/* ============================================================
   RENDER COMMAND
   ============================================================ */

function renderCommand(command) {

    const content =
        document.getElementById('command-content');

    if (!content) {
        return;
    }


    /*
     * Restart the CSS animation.
     */
    content.classList.remove('command-card');

    void content.offsetWidth;

    content.classList.add('command-card');


    /* Safely prepare values */

    const name =
        command.name || 'Unknown command';

    const tldr =
        command.tldr || 'No description available.';

    const syntax =
        command.syntax || 'No syntax available.';

    const example =
        command.example || 'No example available.';

    const after =
        command.usedAfter || '—';

    const before =
        command.usedBefore || '—';


    /*
     * Current project has four guided missions.
     *
     * Module 1 → Mission 1
     * Module 2 → Mission 2
     * Module 3 → Mission 3
     * Module 4 → Mission 4
     */
    const mission =
        Math.min(
            Math.max(Number(currentModule), 1),
            4
        );


    content.innerHTML = `

        <!-- COMMAND HEADER -->

        <div class="command-header">

            <span class="command-tag">
                MODULE ${currentModule}
            </span>

            <h1 class="command-title">
                ${escapeHtml(name)}
            </h1>

        </div>


        <!-- Description -->

        <section class="command-section">

            <span class="section-label">
                Description
            </span>

            <p class="command-tldr">
                ${escapeHtml(tldr)}
            </p>

        </section>


        <!-- SYNTAX -->

        <section class="command-section code-section">

            <span class="section-label">
                COMMON SYNTAX
            </span>

            <div class="code-wrapper">

                <pre class="code-block">${escapeHtml(syntax)}</pre>

                <button
                    type="button"
                    class="copy-btn"
                    data-copy="${escapeAttribute(syntax)}"
                    aria-label="Copy syntax">
                    COPY
                </button>

            </div>

        </section>


        <!-- REAL WORLD EXAMPLE -->

        <section class="command-section code-section">

            <span class="section-label">
                REAL-WORLD EXAMPLE
            </span>

            <div class="code-wrapper">

                <pre class="code-block">${escapeHtml(example)}</pre>

                <button
                    type="button"
                    class="copy-btn"
                    data-copy="${escapeAttribute(example)}"
                    aria-label="Copy example">
                    COPY
                </button>

            </div>

        </section>


        <!-- WORKFLOW -->

        <section class="command-section">

            <span class="section-label">
                WORKFLOW
            </span>

            <div class="workflow">

                <div class="workflow-item">

                    <span class="workflow-label">
                        Usually used AFTER
                    </span>

                    <code class="workflow-command">
                        ${escapeHtml(after)}
                    </code>

                </div>


                <span class="workflow-arrow">
                    →
                </span>


                <div class="workflow-item">

                    <span class="workflow-label">
                        BEFORE
                    </span>

                    <code class="workflow-command">
                        ${escapeHtml(before)}
                    </code>

                </div>

            </div>

        </section>


        <!-- LAB BUTTON -->

        <div class="try-lab">

            <a
                class="neo-btn"
                href="${APP_CONTEXT}/lab.jsp?mode=guided&mission=${mission}">
                TRY IT IN THE LAB →
            </a>

        </div>

    `;


    /*
     * Activate copy buttons after inserting HTML.
     */
    attachCopyButtons();
}


/* ============================================================
   COPY BUTTONS
   ============================================================ */

function attachCopyButtons() {

    document
        .querySelectorAll('.copy-btn')
        .forEach((button) => {

            button.addEventListener(
                'click',
                async () => {

                    const text =
                        button.dataset.copy || '';

                    try {

                        /*
                         * Modern browser clipboard API.
                         */
                        await navigator.clipboard.writeText(text);


                        const oldText =
                            button.textContent;


                        button.textContent =
                            'COPIED!';


                        button.classList.add('copied');


                        setTimeout(() => {

                            button.textContent =
                                oldText;

                            button.classList.remove(
                                'copied'
                            );

                        }, 1200);


                    } catch (error) {

                        console.error(
                            '[GitD2D] Copy failed:',
                            error
                        );


                        /*
                         * Fallback for environments where
                         * navigator.clipboard is unavailable.
                         */
                        fallbackCopy(text, button);
                    }

                }
            );

        });
}


/* ============================================================
   COPY FALLBACK
   ============================================================ */

function fallbackCopy(text, button) {

    const textarea =
        document.createElement('textarea');

    textarea.value = text;

    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    try {

        document.execCommand('copy');

        const oldText =
            button.textContent;

        button.textContent =
            'COPIED!';

        button.classList.add('copied');

        setTimeout(() => {

            button.textContent =
                oldText;

            button.classList.remove(
                'copied'
            );

        }, 1200);

    } catch (error) {

        console.error(
            '[GitD2D] Fallback copy failed:',
            error
        );

    }

    document.body.removeChild(textarea);
}


/* ============================================================
   MODULE COLLAPSIBLE SIDEBAR
   ============================================================ */

function setupModules() {

    document
        .querySelectorAll('.module-header')
        .forEach((header) => {

            header.addEventListener(
                'click',
                async () => {

                    const moduleNo =
                        Number(header.dataset.module);

                    const list =
                        document.getElementById(
                            `module-${moduleNo}`
                        );

                    const arrow =
                        header.querySelector(
                            '.module-arrow'
                        );

                    if (!list) {
                        return;
                    }


                    const isOpen =
                        list.classList.contains('open');


                    /*
                     * Close module.
                     */
                    if (isOpen) {

                        list.classList.remove(
                            'open'
                        );

                        header.classList.remove(
                            'active'
                        );

                        if (arrow) {
                            arrow.textContent = '+';
                        }

                        return;
                    }


                    /*
                     * Open module.
                     */
                    list.classList.add('open');

                    header.classList.add('active');


                    if (arrow) {
                        arrow.textContent = '−';
                    }


                    /*
                     * Load commands from database.
                     */
                    await loadModule(moduleNo);

                }
            );

        });
}


/* ============================================================
   OPEN FIRST MODULE
   ============================================================ */

async function openFirstModule() {

    const firstHeader =
        document.querySelector(
            '.module-header[data-module="1"]'
        );

    if (!firstHeader) {
        return;
    }


    /*
     * Open Module 1.
     */
    const moduleNo = 1;

    const list =
        document.getElementById(
            `module-${moduleNo}`
        );

    const arrow =
        firstHeader.querySelector(
            '.module-arrow'
        );


    if (list) {
        list.classList.add('open');
    }


    firstHeader.classList.add('active');


    if (arrow) {
        arrow.textContent = '−';
    }


    await loadModule(moduleNo);
}


/* ============================================================
   HTML ESCAPING
   ============================================================ */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* ============================================================
   ATTRIBUTE ESCAPING
   ============================================================ */

function escapeAttribute(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '&#10;')
        .replace(/\r/g, '&#13;');
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        /*
         * Check that JSP provided the application context.
         */
        if (typeof APP_CONTEXT === 'undefined') {

            console.error(
                '[GitD2D] APP_CONTEXT is not defined.'
            );

            return;
        }


        setupModules();

        await openFirstModule();

    }
);