/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Practical Lab Frontend Controller
 * Phase 3, Step 4: DOM Reactivity & Terminal Wiring
 * =============================================================================
 * Connects the Interactive Terminal to the Git Simulation Engine,
 * listens for simulator state transitions, and dynamically re-renders:
 * - File Tree (Left Column - Top)
 * - Working Directory & Staging Area (Left Column - Bottom)
 * - Commit Graph & History Nodes (Middle Column)
 * - Terminal Screen Output Buffer (Right Column)
 */

// Initialize simulator state
let currentState = (typeof window.getInitialState === 'function')
  ? window.getInitialState()
  : ((typeof window.initialSimulatorState === 'object' && window.initialSimulatorState !== null)
      ? JSON.parse(JSON.stringify(window.initialSimulatorState))
      : {
          fileSystem: [],
          git: {
            initialized: false,
            stagingArea: [],
            branches: { main: null },
            head: "main",
            commits: [],
            remote: { url: null, branches: {}, aheadBehind: { ahead: 0, behind: 0 } }
          }
        });

// Terminal command history for Up/Down arrow navigation
const commandHistory = [];
let historyIndex = -1;

// =============================================================================
// DOM Ready Lifecycle & Event Listeners
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initial UI Render
  renderUI(currentState);

  // Wire up Terminal Input
  setupTerminalInput();

  // Wire up Reset Lab Button
  setupResetButton();

  // Wire up Terminal Screen click-to-focus
  const terminalScreen = document.getElementById('terminal-screen');
  const terminalInput = document.getElementById('terminal-input');
  if (terminalScreen && terminalInput) {
    terminalScreen.addEventListener('click', () => {
      terminalInput.focus();
    });
  }
});

/**
 * Global Reactivity Listener:
 * Fires whenever executeCommand dispatches the CustomEvent 'stateChanged' on window.
 */
window.addEventListener('stateChanged', (event) => {
  const newState = (event && event.detail) ? event.detail : currentState;
  currentState = newState;
  renderUI(newState);
});

// =============================================================================
// Terminal Wiring & Command Dispatcher
// =============================================================================

/**
 * Configures the Terminal input field listener for 'Enter' key submission
 * and Up/Down arrow command history navigation.
 */
function setupTerminalInput() {
  const terminalInput = document.getElementById('terminal-input');
  const terminalScreen = document.getElementById('terminal-screen');

  if (!terminalInput || !terminalScreen) {
    return;
  }

  terminalInput.addEventListener('keydown', (e) => {
    // 1. Up Arrow: Navigate previous commands
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        if (historyIndex === -1) {
          historyIndex = commandHistory.length - 1;
        } else if (historyIndex > 0) {
          historyIndex--;
        }
        terminalInput.value = commandHistory[historyIndex] || '';
      }
      return;
    }

    // 2. Down Arrow: Navigate forward in command history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          terminalInput.value = commandHistory[historyIndex] || '';
        } else {
          historyIndex = -1;
          terminalInput.value = '';
        }
      }
      return;
    }

    // 3. Enter Key: Execute command
    if (e.key === 'Enter') {
      e.preventDefault();

      const rawInput = terminalInput.value;
      const trimmedInput = rawInput.trim();

      // Clear input field immediately
      terminalInput.value = '';
      historyIndex = -1;

      // Track in history if non-empty
      if (trimmedInput.length > 0) {
        commandHistory.push(trimmedInput);
      }

      // Echo user's command to the terminal screen buffer
      echoTerminalCommand(rawInput);

      // Handle 'clear' command specifically for clean screen buffer
      if (trimmedInput === 'clear') {
        const result = window.executeCommand
          ? window.executeCommand(currentState, rawInput)
          : { newState: currentState, outputMessage: '', success: true };
        currentState = result.newState;
        clearTerminalScreen();
        return;
      }

      // Call Git Engine executeCommand
      let result;
      if (typeof window.executeCommand === 'function') {
        result = window.executeCommand(currentState, rawInput);
      } else {
        result = {
          newState: currentState,
          outputMessage: 'Git Engine not loaded. Check script imports.',
          success: false
        };
      }

      // Print outputMessage with semantic styling
      if (result.outputMessage && result.outputMessage.trim().length > 0) {
        printTerminalOutput(result.outputMessage, result.success);
      }

      // Update local state copy
      currentState = result.newState;

      // Auto-scroll terminal buffer to bottom
      terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }
  });
}

/**
 * Appends the user's entered command line with prompt prefix to terminal screen.
 *
 * @param {string} commandText
 */
function echoTerminalCommand(commandText) {
  const terminalScreen = document.getElementById('terminal-screen');
  if (!terminalScreen) return;

  const cmdLine = document.createElement('div');
  cmdLine.className = 'terminal-line command';

  const promptSpan = document.createElement('span');
  promptSpan.className = 'terminal-prompt-inline';
  promptSpan.textContent = 'git-user@lab:~$ ';

  const textNode = document.createTextNode(commandText);

  cmdLine.appendChild(promptSpan);
  cmdLine.appendChild(textNode);
  terminalScreen.appendChild(cmdLine);
  terminalScreen.scrollTop = terminalScreen.scrollHeight;
}

/**
 * Appends output text to the terminal buffer.
 * Colors with --success (green) if success is true, or --error (red) if false.
 *
 * @param {string} message
 * @param {boolean} success
 */
function printTerminalOutput(message, success) {
  const terminalScreen = document.getElementById('terminal-screen');
  if (!terminalScreen) return;

  const outLine = document.createElement('div');
  outLine.className = success ? 'terminal-line success' : 'terminal-line error';

  // Apply colors as instructed
  outLine.style.color = success
    ? 'var(--success, #00FF00)'
    : 'var(--error, #FF0000)';

  outLine.textContent = message;
  terminalScreen.appendChild(outLine);
  terminalScreen.scrollTop = terminalScreen.scrollHeight;
}

/**
 * Clears terminal output screen and restores standard header.
 */
function clearTerminalScreen() {
  const terminalScreen = document.getElementById('terminal-screen');
  if (!terminalScreen) return;

  terminalScreen.innerHTML = '';
  const headerLine = document.createElement('div');
  headerLine.className = 'terminal-line output';
  headerLine.textContent = 'Terminal screen cleared.';
  terminalScreen.appendChild(headerLine);
  terminalScreen.scrollTop = terminalScreen.scrollHeight;
}

/**
 * Wires the Reset Lab button in Mission Control to restore pristine initial state.
 */
function setupResetButton() {
  const btnReset = document.getElementById('btn-reset-lab');
  if (!btnReset) return;

  btnReset.addEventListener('click', () => {
    if (typeof window.getInitialState === 'function') {
      currentState = window.getInitialState();
    } else {
      currentState = {
        fileSystem: [],
        git: {
          initialized: false,
          stagingArea: [],
          branches: { main: null },
          head: "main",
          commits: [],
          remote: { url: null, branches: {}, aheadBehind: { ahead: 0, behind: 0 } }
        }
      };
    }

    // Dispatch stateChanged so all subscribers react
    if (typeof window.dispatchEvent === 'function') {
      const evt = new CustomEvent('stateChanged', { detail: currentState });
      window.dispatchEvent(evt);
    } else {
      renderUI(currentState);
    }

    const terminalScreen = document.getElementById('terminal-screen');
    if (terminalScreen) {
      const resetLine = document.createElement('div');
      resetLine.className = 'terminal-line output';
      resetLine.style.color = 'var(--cta, #FFD700)';
      resetLine.textContent = '[Simulator state reset to pristine initial state]';
      terminalScreen.appendChild(resetLine);
      terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }
  });
}

// =============================================================================
// UI Rendering Engine (DOM Reactivity)
// =============================================================================

/**
 * Master render function called on stateChanged event.
 * Synchronizes the entire UI with the latest state object.
 *
 * @param {Object} state - The active simulatorState
 */
function renderUI(state) {
  if (!state || typeof state !== 'object') {
    return;
  }

  // 1. Render Left Column: File Tree (Top Half)
  renderFileTree(state.fileSystem);

  // 2. Render Left Column: Working Directory & Staging Area (Bottom Half)
  renderWorkingAndStaging(state);

  // 3. Render Middle Column: Commit Graph
  renderCommitGraph(state);
}

/**
 * Renders the File Tree list in the left column.
 *
 * @param {Array<Object>} fileSystem
 */
function renderFileTree(fileSystem) {
  const listEl = document.getElementById('file-tree-list');
  const emptyEl = document.getElementById('file-tree-empty-msg');
  const countBadge = document.getElementById('file-count-badge');
  if (!listEl) return;

  const items = Array.isArray(fileSystem) ? fileSystem : [];

  if (countBadge) {
    countBadge.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
  }

  if (items.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    listEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  listEl.style.display = 'flex';
  listEl.innerHTML = '';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = `file-tree-item ${item.type === 'directory' ? 'directory' : ''}`;

    const nameGroup = document.createElement('div');
    nameGroup.className = 'file-name-group';

    // File/Folder icon
    const iconSpan = document.createElement('span');
    if (item.type === 'directory') {
      iconSpan.textContent = '📁 ';
    } else if (item.name.endsWith('.html')) {
      iconSpan.textContent = '🌐 ';
    } else if (item.name.endsWith('.css')) {
      iconSpan.textContent = '🎨 ';
    } else if (item.name.endsWith('.js')) {
      iconSpan.textContent = '⚡ ';
    } else {
      iconSpan.textContent = '📄 ';
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = item.name;
    nameSpan.style.fontFamily = 'var(--font-mono)';
    nameSpan.style.fontWeight = item.type === 'directory' ? '700' : '500';

    nameGroup.appendChild(iconSpan);
    nameGroup.appendChild(nameSpan);

    // Status tag
    const tagSpan = document.createElement('span');
    if (item.type === 'directory') {
      tagSpan.className = 'file-status-tag tracked';
      tagSpan.textContent = 'DIR';
    } else {
      const status = item.status || 'untracked';
      let tagClass = 'untracked';
      if (status === 'staged') {
        tagClass = 'staged';
      } else if (status === 'modified') {
        tagClass = 'modified';
      } else if (status === 'tracked_unmodified') {
        tagClass = 'tracked';
      }
      tagSpan.className = `file-status-tag ${tagClass}`;
      tagSpan.textContent = status === 'tracked_unmodified' ? 'tracked' : status;
    }

    li.appendChild(nameGroup);
    li.appendChild(tagSpan);
    listEl.appendChild(li);
  });
}

/**
 * Renders the Working Directory and Staging Area sub-boxes in the left column.
 *
 * @param {Object} state
 */
function renderWorkingAndStaging(state) {
  const initTag = document.getElementById('git-init-status-tag');
  const workingList = document.getElementById('working-dir-list');
  const workingEmpty = document.getElementById('working-dir-empty-msg');
  const workingCount = document.getElementById('working-dir-count');

  const stagingList = document.getElementById('staging-area-list');
  const stagingEmpty = document.getElementById('staging-area-empty-msg');
  const stagingCount = document.getElementById('staging-area-count');

  // .git initialization status badge
  const isInitialized = state.git && state.git.initialized;
  if (initTag) {
    if (isInitialized) {
      initTag.className = 'file-status-tag staged';
      initTag.textContent = '.git initialized';
    } else {
      initTag.className = 'file-status-tag tracked';
      initTag.textContent = '.git not initialized';
    }
  }

  // 1. Staging Area: items currently in state.git.stagingArea
  const staged = (state.git && Array.isArray(state.git.stagingArea)) ? state.git.stagingArea : [];
  const stagedNames = staged.map(f => (typeof f === 'string' ? f : f.name));

  if (stagingCount) {
    stagingCount.textContent = stagedNames.length;
  }

  if (stagingList) {
    stagingList.innerHTML = '';
    if (stagedNames.length === 0) {
      if (stagingEmpty) stagingEmpty.style.display = 'block';
      stagingList.style.display = 'none';
    } else {
      if (stagingEmpty) stagingEmpty.style.display = 'none';
      stagingList.style.display = 'flex';

      stagedNames.forEach(name => {
        const li = document.createElement('li');
        li.className = 'file-tree-item';

        const nameGroup = document.createElement('div');
        nameGroup.className = 'file-name-group';

        const iconSpan = document.createElement('span');
        iconSpan.textContent = '⚡ ';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.fontFamily = 'var(--font-mono)';

        nameGroup.appendChild(iconSpan);
        nameGroup.appendChild(nameSpan);

        const tag = document.createElement('span');
        tag.className = 'file-status-tag staged';
        tag.textContent = 'staged';

        li.appendChild(nameGroup);
        li.appendChild(tag);
        stagingList.appendChild(li);
      });
    }
  }

  // 2. Working Directory: files in fileSystem that are untracked or modified, and not in stagingArea
  const files = (state.fileSystem || []).filter(item => item && item.type !== 'directory');
  const workingFiles = files.filter(f => !stagedNames.includes(f.name) && (f.status === 'untracked' || f.status === 'modified'));

  if (workingCount) {
    workingCount.textContent = workingFiles.length;
  }

  if (workingList) {
    workingList.innerHTML = '';
    if (workingFiles.length === 0) {
      if (workingEmpty) workingEmpty.style.display = 'block';
      workingList.style.display = 'none';
    } else {
      if (workingEmpty) workingEmpty.style.display = 'none';
      workingList.style.display = 'flex';

      workingFiles.forEach(file => {
        const li = document.createElement('li');
        li.className = 'file-tree-item';

        const nameGroup = document.createElement('div');
        nameGroup.className = 'file-name-group';

        const iconSpan = document.createElement('span');
        iconSpan.textContent = '📄 ';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = file.name;
        nameSpan.style.fontFamily = 'var(--font-mono)';

        nameGroup.appendChild(iconSpan);
        nameGroup.appendChild(nameSpan);

        const tag = document.createElement('span');
        const isModified = file.status === 'modified';
        tag.className = `file-status-tag ${isModified ? 'modified' : 'untracked'}`;
        tag.textContent = isModified ? 'modified' : 'untracked';

        li.appendChild(nameGroup);
        li.appendChild(tag);
        workingList.appendChild(li);
      });
    }
  }
}

/**
 * Renders the Commit Graph in the middle column.
 * Displays circular commit nodes with connection lines, IDs, messages, and branch pointers.
 *
 * @param {Object} state
 */
function renderCommitGraph(state) {
  const headBranchEl = document.getElementById('graph-head-branch');
  const emptyPlaceholder = document.getElementById('graph-empty-placeholder');
  const timelineEl = document.getElementById('graph-timeline');
  if (!timelineEl) return;

  const currentBranch = (state.git && state.git.head) ? state.git.head : 'main';
  if (headBranchEl) {
    headBranchEl.textContent = currentBranch;
  }

  const commits = (state.git && Array.isArray(state.git.commits)) ? state.git.commits : [];

  if (commits.length === 0) {
    if (emptyPlaceholder) emptyPlaceholder.style.display = 'flex';
    timelineEl.style.display = 'none';
    timelineEl.innerHTML = '';
    return;
  }

  if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
  timelineEl.style.display = 'flex';
  timelineEl.innerHTML = '';

  const branches = (state.git && state.git.branches) ? state.git.branches : {};
  const headCommitId = branches[currentBranch];

  // Render commits from newest to oldest (reverse chronological)
  const sortedCommits = [...commits].reverse();

  sortedCommits.forEach((commit, idx) => {
    const isHead = commit.id === headCommitId;

    const wrapper = document.createElement('div');
    wrapper.className = 'graph-node-wrapper';

    // Vertical connector line to commit below
    if (idx < sortedCommits.length - 1) {
      const line = document.createElement('div');
      line.className = 'graph-connector-line';
      wrapper.appendChild(line);
    }

    const card = document.createElement('div');
    card.className = `graph-node-card ${isHead ? 'active-head' : ''}`;

    // Circular commit node
    const circle = document.createElement('div');
    circle.className = 'graph-node-circle';
    if (isHead) {
      circle.style.backgroundColor = 'var(--cta, #FFD700)';
    } else {
      circle.style.backgroundColor = 'var(--blue, #3B82F6)';
    }

    const content = document.createElement('div');
    content.className = 'graph-node-content';

    const header = document.createElement('div');
    header.className = 'graph-node-header';

    const idGroup = document.createElement('div');
    idGroup.style.display = 'flex';
    idGroup.style.alignItems = 'center';
    idGroup.style.gap = '6px';
    idGroup.style.flexWrap = 'wrap';

    const idBadge = document.createElement('span');
    idBadge.className = 'graph-node-id';
    idBadge.textContent = commit.id;
    idGroup.appendChild(idBadge);

    // Branch tags pointing to this commit
    Object.keys(branches).forEach(bName => {
      if (branches[bName] === commit.id) {
        const bTag = document.createElement('span');
        bTag.className = `graph-branch-tag ${bName === currentBranch ? 'head' : ''}`;
        bTag.textContent = bName === currentBranch ? `HEAD -> ${bName}` : bName;
        idGroup.appendChild(bTag);
      }
    });

    const timeSpan = document.createElement('span');
    timeSpan.style.fontFamily = 'var(--font-mono)';
    timeSpan.style.fontSize = '0.75rem';
    timeSpan.style.color = '#64748B';
    timeSpan.textContent = formatTimestamp(commit.timestamp);

    header.appendChild(idGroup);
    header.appendChild(timeSpan);

    const msgDiv = document.createElement('div');
    msgDiv.className = 'graph-node-msg';
    msgDiv.textContent = commit.message || 'No commit message';

    const filesDiv = document.createElement('div');
    filesDiv.className = 'graph-node-files';
    const fileCount = Array.isArray(commit.files) ? commit.files.length : 0;
    const filesList = Array.isArray(commit.files) ? commit.files.join(', ') : '';
    filesDiv.textContent = `📦 ${fileCount} file${fileCount === 1 ? '' : 's'}${filesList ? ': ' + filesList : ''}`;

    content.appendChild(header);
    content.appendChild(msgDiv);
    content.appendChild(filesDiv);

    card.appendChild(circle);
    card.appendChild(content);
    wrapper.appendChild(card);
    timelineEl.appendChild(wrapper);
  });
}

/**
 * Formats an ISO date string into human-friendly time.
 *
 * @param {string} isoStr
 * @returns {string}
 */
function formatTimestamp(isoStr) {
  if (!isoStr) return 'Just now';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return 'Just now';
  }
}

// Attach controller helpers to window for debugging and programmatic control
if (typeof window !== 'undefined') {
  window.LabController = {
    getCurrentState: () => currentState,
    setCurrentState: (s) => {
      currentState = s;
      renderUI(s);
    },
    renderUI
  };
}
