/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Practical Lab Frontend Controller
 * Phase 3, Step 4 & 5: DOM Reactivity, Terminal Wiring & Guided Mission Logic
 * =============================================================================
 * Connects the Interactive Terminal to the Git Simulation Engine,
 * listens for simulator state transitions, fetches and tracks guided missions,
 * and dynamically re-renders:
 * - Mission Control Top Banner (Step counter, Objective, Expected command hint)
 * - File Tree (Left Column - Top)
 * - Working Directory & Staging Area (Left Column - Bottom)
 * - Commit Graph & History Nodes (Middle Column)
 * - Terminal Screen Output Buffer (Right Column)
 */

// =============================================================================
// Mission State & Configuration
// =============================================================================

const MISSION_TITLES = {
  1: "Mission 1: Workspace Setup",
  2: "Mission 2: First Snapshot",
  3: "Mission 3: Parallel Universe",
  4: "Mission 4: Connecting & Undoing"
};

/**
 * Parses the ?mission=X URL parameter, defaulting to mission 1 if absent or invalid.
 *
 * @returns {number} Active mission number
 */
function getActiveMissionFromUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    const urlParams = new URLSearchParams(window.location.search);
    const m = parseInt(urlParams.get('mission'), 10);
    if (!isNaN(m) && m >= 1) {
      return m;
    }
  }
  return 1;
}

let activeMission = getActiveMissionFromUrl();
let currentMissionSteps = [];
let currentStepIndex = 0;

// =============================================================================
// Simulator State & Terminal History
// =============================================================================

let currentState = (typeof window !== 'undefined' && typeof window.getInitialState === 'function')
  ? window.getInitialState()
  : ((typeof window !== 'undefined' && typeof window.initialSimulatorState === 'object' && window.initialSimulatorState !== null)
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

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Simulator UI Render
    renderUI(currentState);

    // 2. Wire up Terminal Input Field
    setupTerminalInput();

    // 3. Wire up Reset Lab Button
    setupResetButton();

    // 4. Wire up Mission Navigation Buttons (Prev / Next)
    setupMissionNavButtons();

    // 5. Fetch and initialize Active Guided Mission
    loadMission();

    // 6. Wire up Terminal Screen click-to-focus
    const terminalScreen = document.getElementById('terminal-screen');
    const terminalInput = document.getElementById('terminal-input');
    if (terminalScreen && terminalInput) {
      terminalScreen.addEventListener('click', () => {
        terminalInput.focus();
      });
    }
  });
}

/**
 * Global Reactivity Listener:
 * Fires whenever executeCommand dispatches the CustomEvent 'stateChanged' on window.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('stateChanged', (event) => {
    const newState = (event && event.detail) ? event.detail : currentState;
    currentState = newState;
    renderUI(newState);
  });
}

// =============================================================================
// Guided Mission Data Fetching & Banner Updates
// =============================================================================

/**
 * Asynchronously fetches mission steps for the active mission from the backend API.
 * Falls back to static api-contracts/missions.json if the servlet is unavailable.
 */
async function loadMission() {
  activeMission = getActiveMissionFromUrl();
  if (typeof window !== 'undefined') {
    window.activeMission = activeMission;
  }
  try {
    let response = await fetch(`/api/missions?mission=${activeMission}`);
    if (!response.ok) {
      response = await fetch(`api/missions?mission=${activeMission}`);
    }

    if (response.ok) {
      currentMissionSteps = await response.json();
    } else {
      console.warn(`API returned HTTP ${response.status} for mission ${activeMission}. Attempting fallback contract.`);
      const fallback = await fetch('api-contracts/missions.json');
      if (fallback.ok) {
        const allSteps = await fallback.json();
        currentMissionSteps = allSteps.filter(s => s.missionNo === activeMission);
      } else {
        currentMissionSteps = [];
      }
    }
  } catch (err) {
    console.warn(`Network error loading mission ${activeMission}, attempting fallback contract:`, err);
    try {
      const fallback = await fetch('api-contracts/missions.json');
      if (fallback.ok) {
        const allSteps = await fallback.json();
        currentMissionSteps = allSteps.filter(s => s.missionNo === activeMission);
      } else {
        currentMissionSteps = [];
      }
    } catch (fallbackErr) {
      console.error('All fetch attempts for mission steps failed:', fallbackErr);
      currentMissionSteps = [];
    }
  }

  currentStepIndex = 0;
  if (typeof window !== 'undefined') {
    window.currentMissionSteps = currentMissionSteps;
    window.currentStepIndex = currentStepIndex;
  }
  updateMissionBanner();
}

/**
 * Updates the Mission Control top banner with current step progress,
 * objective instructions, and expected command hint.
 */
function updateMissionBanner() {
  const stepIndicatorEl = document.getElementById('mission-step-indicator');
  const missionTitleEl = document.getElementById('mission-title');
  const instructionEl = document.getElementById('mission-instruction');
  const hintEl = document.getElementById('mission-hint');
  const badgeEl = document.getElementById('mission-badge');

  // 1. Mission Title
  if (missionTitleEl) {
    missionTitleEl.textContent = MISSION_TITLES[activeMission] || `Mission ${activeMission}`;
  }

  // Handle empty or loading state
  if (!Array.isArray(currentMissionSteps) || currentMissionSteps.length === 0) {
    if (stepIndicatorEl) stepIndicatorEl.textContent = 'Loading...';
    if (instructionEl) instructionEl.textContent = 'Loading mission instructions...';
    if (hintEl) hintEl.innerHTML = '<span>Expected:</span> <strong>...</strong>';
    return;
  }

  const totalSteps = currentMissionSteps.length;
  const isComplete = currentStepIndex >= totalSteps;

  if (isComplete) {
    // Mission Complete Banner State
    if (stepIndicatorEl) {
      stepIndicatorEl.textContent = `Completed (${totalSteps}/${totalSteps})`;
      stepIndicatorEl.style.backgroundColor = 'var(--success, #00FF00)';
      stepIndicatorEl.style.color = '#000000';
    }
    if (badgeEl) {
      badgeEl.textContent = 'Mission Accomplished';
    }
    if (instructionEl) {
      instructionEl.textContent = 'Congratulations! You have completed all objectives for this mission.';
    }
    if (hintEl) {
      hintEl.innerHTML = '<span>Status:</span> <strong style="color: var(--success, #00FF00)">MISSION COMPLETE!</strong>';
    }
  } else {
    // Active Step Banner State
    const currentStep = currentMissionSteps[currentStepIndex] || {};
    const stepNo = currentStepIndex + 1;

    if (stepIndicatorEl) {
      stepIndicatorEl.textContent = `Step ${stepNo} of ${totalSteps}`;
      stepIndicatorEl.style.backgroundColor = '';
      stepIndicatorEl.style.color = '';
    }
    if (badgeEl) {
      badgeEl.textContent = 'Mission Control';
    }
    if (instructionEl) {
      instructionEl.textContent = currentStep.instruction || 'Follow the expected command below to advance.';
    }
    if (hintEl) {
      const expectedCmd = (Array.isArray(currentStep.expectedCommands) && currentStep.expectedCommands.length > 0)
        ? currentStep.expectedCommands[0]
        : '';
      hintEl.innerHTML = `<span>Expected:</span> <strong>${escapeHtml(expectedCmd)}</strong>`;
    }
  }

  // Update navigation button states
  const btnPrev = document.getElementById('btn-prev-step');
  const btnNext = document.getElementById('btn-next-step');
  if (btnPrev) {
    btnPrev.disabled = (currentStepIndex <= 0);
    btnPrev.style.opacity = (currentStepIndex <= 0) ? '0.5' : '1';
    btnPrev.style.cursor = (currentStepIndex <= 0) ? 'not-allowed' : 'pointer';
  }
  if (btnNext) {
    btnNext.disabled = (currentStepIndex >= totalSteps - 1);
    btnNext.style.opacity = (currentStepIndex >= totalSteps - 1) ? '0.5' : '1';
    btnNext.style.cursor = (currentStepIndex >= totalSteps - 1) ? 'not-allowed' : 'pointer';
  }
}

/**
 * Escapes HTML characters in strings for safe innerHTML injection.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wires previous and next step manual navigation buttons in the top banner.
 */
function setupMissionNavButtons() {
  const btnPrev = document.getElementById('btn-prev-step');
  const btnNext = document.getElementById('btn-next-step');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        if (typeof window !== 'undefined') {
          window.currentStepIndex = currentStepIndex;
        }
        updateMissionBanner();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentMissionSteps && currentStepIndex < currentMissionSteps.length - 1) {
        currentStepIndex++;
        if (typeof window !== 'undefined') {
          window.currentStepIndex = currentStepIndex;
        }
        updateMissionBanner();
      }
    });
  }
}

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
      const isClearCmd = (trimmedInput === 'clear');

      // Call Git Engine executeCommand
      let result;
      if (typeof window !== 'undefined' && typeof window.executeCommand === 'function') {
        result = window.executeCommand(currentState, rawInput);
      } else {
        result = {
          newState: currentState,
          outputMessage: 'Git Engine not loaded. Check script imports.',
          success: false
        };
      }

      // If clear command, wipe buffer, otherwise print outputMessage
      if (isClearCmd) {
        clearTerminalScreen();
      } else {
        // Print outputMessage with semantic styling
        if (result.outputMessage && result.outputMessage.trim().length > 0) {
          printTerminalOutput(result.outputMessage, result.success);
        }
      }

      // Update local state copy
      currentState = result.newState;

      // Command Interception & Progress Validation
      if (trimmedInput.length > 0) {
        validateMissionStep(trimmedInput, rawInput, result);
      }

      // Auto-scroll terminal buffer to bottom
      terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }
  });
}

/**
 * Evaluates whether the user's input matches the expected command(s) for the current step.
 * Supports exact matches, quote variations (single vs double quotes), and whitespace collapsing.
 *
 * @param {string} input - User command string
 * @param {Array<string>} expectedList - List of expected command strings
 * @returns {boolean} True if matching
 */
function isCommandMatchingExpected(input, expectedList) {
  if (!Array.isArray(expectedList) || expectedList.length === 0) {
    return false;
  }
  const trimmed = input.trim();

  // 1. Strict exact match
  if (expectedList.includes(trimmed)) {
    return true;
  }

  // 2. Quote normalization match (single vs double quotes)
  const normalizedInput = trimmed.replace(/'/g, '"');
  if (expectedList.some(cmd => cmd.replace(/'/g, '"') === normalizedInput)) {
    return true;
  }

  // 3. Normalized whitespace collapsing
  const collapsedInput = trimmed.replace(/\s+/g, ' ');
  return expectedList.some(cmd => {
    return cmd.trim().replace(/\s+/g, ' ').replace(/'/g, '"') === collapsedInput.replace(/'/g, '"');
  });
}

/**
 * Validates command against active mission objective and advances progress.
 *
 * @param {string} trimmedInput - Cleaned command input
 * @param {string} rawInput - Raw input string
 * @param {Object} result - Execution result { newState, outputMessage, success }
 */
function validateMissionStep(trimmedInput, rawInput, result) {
  // If no mission is loaded or mission is already completed, do nothing
  if (!Array.isArray(currentMissionSteps) || currentMissionSteps.length === 0) {
    return;
  }
  if (currentStepIndex >= currentMissionSteps.length) {
    return;
  }

  const currentStep = currentMissionSteps[currentStepIndex];
  const expectedCommands = Array.isArray(currentStep.expectedCommands) ? currentStep.expectedCommands : [];
  const isMatch = isCommandMatchingExpected(trimmedInput, expectedCommands);

  if (isMatch && result.success) {
    // Advance step
    currentStepIndex++;
    if (typeof window !== 'undefined') {
      window.currentStepIndex = currentStepIndex;
    }

    if (currentStepIndex < currentMissionSteps.length) {
      // More steps remain in this mission
      updateMissionBanner();
    } else {
      // Mission is complete!
      // 1. Print bright success message in terminal buffer
      printTerminalOutput("MISSION COMPLETE!", true);
      printTerminalHighlight(`★ Congratulations! You successfully completed Mission ${activeMission}! ★`);

      // 2. Use window.saveProgress (from progress.js) to mark mission complete
      if (typeof window !== 'undefined') {
        if (typeof window.getProgress === 'function' && typeof window.saveProgress === 'function') {
          const progress = window.getProgress();
          if (!progress.missionsCompleted.includes(activeMission)) {
            progress.missionsCompleted.push(activeMission);
          }
          if (progress.currentMission <= activeMission) {
            progress.currentMission = Math.min(activeMission + 1, 4);
          }
          window.saveProgress(progress);
        } else if (typeof window.saveProgress === 'function') {
          window.saveProgress({
            missionsCompleted: [activeMission],
            currentMission: Math.min(activeMission + 1, 4)
          });
        }

        // Also call recordMissionCompleted if available
        if (typeof window.recordMissionCompleted === 'function') {
          window.recordMissionCompleted(activeMission);
        }
      }

      // 3. Update top banner to show completion
      updateMissionBanner();
    }
  } else if (!isMatch && result.success) {
    // Did NOT match, but command itself succeeded in simulator -> print subtle hint
    const expectedCmd = (expectedCommands.length > 0) ? expectedCommands[0] : '';
    printTerminalHint(`Hint: The mission expects you to run: ${expectedCmd}`);
  }
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
 * Appends standard output text to the terminal buffer.
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
 * Appends a bright celebratory gold highlight message to the terminal screen.
 *
 * @param {string} message
 */
function printTerminalHighlight(message) {
  const terminalScreen = document.getElementById('terminal-screen');
  if (!terminalScreen) return;

  const highlightLine = document.createElement('div');
  highlightLine.className = 'terminal-line success mission-complete-highlight';
  highlightLine.style.color = 'var(--cta, #FFD700)';
  highlightLine.style.fontWeight = 'bold';
  highlightLine.textContent = message;
  terminalScreen.appendChild(highlightLine);
  terminalScreen.scrollTop = terminalScreen.scrollHeight;
}

/**
 * Appends a subtle gray italic hint line to the terminal screen.
 *
 * @param {string} message
 */
function printTerminalHint(message) {
  const terminalScreen = document.getElementById('terminal-screen');
  if (!terminalScreen) return;

  const hintLine = document.createElement('div');
  hintLine.className = 'terminal-line hint';
  hintLine.style.color = 'var(--text-muted, #94A3B8)';
  hintLine.style.fontStyle = 'italic';
  hintLine.textContent = message;
  terminalScreen.appendChild(hintLine);
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
 * Wires the Reset Lab button in Mission Control to restore pristine initial state
 * and restart current mission step progress.
 */
function setupResetButton() {
  const btnReset = document.getElementById('btn-reset-lab');
  if (!btnReset) return;

  btnReset.addEventListener('click', () => {
    if (typeof window !== 'undefined' && typeof window.getInitialState === 'function') {
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

    // Reset mission progress for current session
    currentStepIndex = 0;
    if (typeof window !== 'undefined') {
      window.currentStepIndex = currentStepIndex;
    }
    updateMissionBanner();

    // Dispatch stateChanged so all subscribers react
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
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

// =============================================================================
// Window & Module Exports
// =============================================================================

if (typeof window !== 'undefined') {
  window.activeMission = activeMission;
  window.currentMissionSteps = currentMissionSteps;
  window.currentStepIndex = currentStepIndex;
  window.loadMission = loadMission;
  window.updateMissionBanner = updateMissionBanner;
  window.validateMissionStep = validateMissionStep;
  window.isCommandMatchingExpected = isCommandMatchingExpected;
  window.LabController = {
    getCurrentState: () => currentState,
    setCurrentState: (s) => {
      currentState = s;
      renderUI(s);
    },
    renderUI,
    getActiveMission: () => activeMission,
    setActiveMission: (m) => {
      activeMission = m;
      loadMission();
    },
    getMissionSteps: () => currentMissionSteps,
    setMissionSteps: (steps) => {
      currentMissionSteps = steps;
      updateMissionBanner();
    },
    getCurrentStepIndex: () => currentStepIndex,
    setCurrentStepIndex: (idx) => {
      currentStepIndex = idx;
      updateMissionBanner();
    },
    loadMission,
    updateMissionBanner
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getActiveMissionFromUrl,
    isCommandMatchingExpected,
    validateMissionStep,
    loadMission,
    updateMissionBanner,
    MISSION_TITLES
  };
}
