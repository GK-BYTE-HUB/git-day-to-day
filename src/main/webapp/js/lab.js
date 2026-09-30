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

/**
 * Checks whether the current URL specifies sandbox mode (?mode=sandbox).
 *
 * @returns {boolean} True if in sandbox mode
 */
function isSandboxMode() {
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mode') === 'sandbox';
  }
  return false;
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
          cwd: '/',
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

    // 4. Wire up Persistent Mode Controls (Guided vs Practice Sandbox)
    setupModeControls();

    // 5. Wire up Notepad Modal for In-Browser File Editing
    setupNotepadModal();

    // 6. Sandbox Mode check vs Guided Mission mode
    if (isSandboxMode()) {
      // Entirely hide the top banner in sandbox mode
      const banner = document.querySelector('.mission-control-banner');
      if (banner) {
        banner.style.display = 'none';
      }
    } else {
      // Wire up Mission Navigation Buttons (Prev / Next)
      setupMissionNavButtons();

      // Wire up Hint Toggle Button (Bug 6)
      setupHintToggle();

      // Fetch and initialize Active Guided Mission (Bug 2)
      loadMission();
    }

    // 7. Wire up Terminal Screen click-to-focus
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
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
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
  if (isSandboxMode()) {
    return;
  }
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
      if (window.DEBUG) { console.warn(`API returned HTTP ${response.status} for mission ${activeMission}. Attempting fallback contract.`); }
      const fallback = await fetch('api-contracts/missions.json');
      if (fallback.ok) {
        const allSteps = await fallback.json();
        currentMissionSteps = allSteps.filter(s => s.missionNo === activeMission);
      } else {
        currentMissionSteps = [];
      }
    }
  } catch (err) {
    if (window.DEBUG) { console.warn(`Network error loading mission ${activeMission}, attempting fallback contract:`, err); }
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
  if (isSandboxMode()) {
    return;
  }

  const stepIndicatorEl = document.getElementById('mission-step-indicator');
  const missionTitleEl = document.getElementById('mission-title');
  const instructionEl = document.getElementById('mission-instruction');
  const badgeEl = document.getElementById('mission-badge');
  const hintBtnEl = document.getElementById('btn-show-hint');
  const hintTextEl = document.getElementById('mission-hint-text');

  // 1. Mission Title
  if (missionTitleEl) {
    missionTitleEl.textContent = MISSION_TITLES[activeMission] || `Mission ${activeMission}`;
  }

  // Handle empty or loading state
  if (!Array.isArray(currentMissionSteps) || currentMissionSteps.length === 0) {
    if (stepIndicatorEl) stepIndicatorEl.textContent = 'Loading...';
    if (instructionEl) instructionEl.textContent = 'Loading mission instructions...';
    if (hintBtnEl) {
      hintBtnEl.textContent = 'Show Hint';
      hintBtnEl.style.display = 'none';
    }
    if (hintTextEl) {
      hintTextEl.textContent = '';
      hintTextEl.style.display = 'none';
    }
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
    if (hintBtnEl) {
      hintBtnEl.style.display = 'none';
    }
    if (hintTextEl) {
      hintTextEl.textContent = 'MISSION COMPLETE!';
      hintTextEl.style.display = 'inline-block';
      hintTextEl.style.color = 'var(--success, #00FF00)';
    }

    // Next Mission Redirect: Enable #btn-next-step and update button UI
    const btnNext = document.getElementById('btn-next-step');
    if (btnNext) {
      btnNext.textContent = 'Next Mission →';
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
      btnNext.style.cursor = 'pointer';
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

    const expectedCmd = (Array.isArray(currentStep.expectedCommands) && currentStep.expectedCommands.length > 0)
      ? currentStep.expectedCommands[0]
      : '';

    // Reset hint to hidden and update expected command text for the step
    if (hintBtnEl) {
      hintBtnEl.style.display = '';
      hintBtnEl.textContent = 'Show Hint';
    }
    if (hintTextEl) {
      hintTextEl.textContent = expectedCmd;
      hintTextEl.style.display = 'none';
      hintTextEl.style.color = '';
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
  if (btnNext && !isComplete) {
    btnNext.textContent = 'Next →';
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
 * Handles Prev Step button click.
 */
function handlePrevStepClick() {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    if (typeof window !== 'undefined') {
      window.currentStepIndex = currentStepIndex;
    }
    updateMissionBanner();
  }
}

/**
 * Handles Next Step button click during active mission steps.
 */
function handleNextStepClick() {
  if (currentMissionSteps && currentStepIndex < currentMissionSteps.length - 1) {
    currentStepIndex++;
    if (typeof window !== 'undefined') {
      window.currentStepIndex = currentStepIndex;
    }
    updateMissionBanner();
  }
}

/**
 * Handles Next Mission button click on mission completion: redirects to the next mission.
 */
function handleNextMissionRedirect() {
  const next = activeMission + 1;
  if (typeof window !== 'undefined' && window.location) {
    window.location.href = '?mode=guided&mission=' + next;
  }
}

/**
 * Unified Next button click handler.
 * Reads module-level state at call-time: if the mission is complete, redirects
 * to the next mission; otherwise advances to the next step.
 * Wired once by setupMissionNavButtons — never swapped.
 */
function handleNextClick() {
  const totalSteps = Array.isArray(currentMissionSteps) ? currentMissionSteps.length : 0;
  const isComplete = totalSteps > 0 && currentStepIndex >= totalSteps;
  if (isComplete) {
    handleNextMissionRedirect();
  } else {
    handleNextStepClick();
  }
}

/**
 * Wires previous and next step manual navigation buttons in the top banner.
 * Each button's listener is attached exactly once here.
 */
function setupMissionNavButtons() {
  const btnPrev = document.getElementById('btn-prev-step');
  const btnNext = document.getElementById('btn-next-step');

  if (btnPrev) {
    if (typeof btnPrev.removeEventListener === 'function') {
      btnPrev.removeEventListener('click', handlePrevStepClick);
    }
    if (typeof btnPrev.addEventListener === 'function') {
      btnPrev.addEventListener('click', handlePrevStepClick);
    }
  }

  if (btnNext) {
    if (typeof btnNext.removeEventListener === 'function') {
      btnNext.removeEventListener('click', handleNextClick);
    }
    if (typeof btnNext.addEventListener === 'function') {
      btnNext.addEventListener('click', handleNextClick);
    }
  }
}

/**
 * Configures persistent mode switching buttons (Guided Missions vs Practice Sandbox).
 * Reflects active state visually on page load and redirects on click.
 */
function setupModeControls() {
  const btnGuided = document.getElementById('btn-mode-guided');
  const btnPractice = document.getElementById('btn-mode-practice');
  const sandbox = isSandboxMode();

  if (btnGuided) {
    if (!sandbox) {
      btnGuided.classList.add('active');
      btnGuided.setAttribute('aria-pressed', 'true');
    } else {
      btnGuided.classList.remove('active');
      btnGuided.setAttribute('aria-pressed', 'false');
    }
    btnGuided.addEventListener('click', () => {
      if (typeof localStorage !== 'undefined' && localStorage) {
        try {
          localStorage.removeItem('git_lab_state');
        } catch (e) {
          if (window.DEBUG) { console.warn('Failed to clear git_lab_state from localStorage:', e); }
        }
      }
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '?mode=guided&mission=1';
      }
    });
  }

  if (btnPractice) {
    if (sandbox) {
      btnPractice.classList.add('active');
      btnPractice.setAttribute('aria-pressed', 'true');
    } else {
      btnPractice.classList.remove('active');
      btnPractice.setAttribute('aria-pressed', 'false');
    }
    btnPractice.addEventListener('click', () => {
      if (typeof localStorage !== 'undefined' && localStorage) {
        try {
          localStorage.removeItem('git_lab_state');
        } catch (e) {
          if (window.DEBUG) { console.warn('Failed to clear git_lab_state from localStorage:', e); }
        }
      }
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '?mode=sandbox';
      }
    });
  }
}

/**
 * Configures the Hint Toggle button to reveal or hide the expected command text.
 */
function setupHintToggle() {
  const btn = document.getElementById('btn-show-hint');
  const hintText = document.getElementById('mission-hint-text');
  if (!btn || !hintText) return;

  btn.addEventListener('click', () => {
    const isHidden = (hintText.style.display === 'none' || getComputedStyle(hintText).display === 'none');
    if (isHidden) {
      hintText.style.display = 'inline-block';
      btn.textContent = 'Hide Hint';
    } else {
      hintText.style.display = 'none';
      btn.textContent = 'Show Hint';
    }
  });
}

// =============================================================================
// Notepad Modal & File Editing (Phase 4 Add-on 1)
// =============================================================================

let currentEditingFilePath = null;
let notepadModalInitialized = false;

/**
 * Opens the Notepad modal for editing the specified file.
 * Populates textarea with current content and updates character count.
 *
 * @param {string} filePath - Target file path
 */
function openNotepad(filePath) {
  if (!filePath) return;
  currentEditingFilePath = filePath;

  const modal = document.getElementById('notepad-modal');
  const filenameEl = document.getElementById('notepad-filename');
  const textarea = document.getElementById('notepad-textarea');
  const charCountEl = document.getElementById('notepad-char-count');
  if (!modal || !textarea) return;

  // Find file in currentState.fileSystem
  const fileSystem = (currentState && Array.isArray(currentState.fileSystem)) ? currentState.fileSystem : [];
  let file = fileSystem.find(f => f.name === filePath && f.type !== 'directory');
  if (!file) {
    const cwd = (currentState && currentState.cwd) ? currentState.cwd : '/';
    const cleanCwd = cwd.replace(/^\/+|\/+$/g, '');
    const prefix = cleanCwd ? cleanCwd + '/' : '';
    file = fileSystem.find(f => (f.name === prefix + filePath || f.name === filePath) && f.type !== 'directory');
  }

  const content = (file && file.content !== undefined && file.content !== null) ? file.content : '';

  if (filenameEl) {
    filenameEl.textContent = filePath;
  }
  textarea.value = content;
  if (charCountEl) {
    charCountEl.textContent = `${content.length} / 500 chars`;
    charCountEl.style.color = content.length >= 500 ? 'var(--error, #FF0000)' : '';
    charCountEl.style.fontWeight = content.length >= 500 ? 'bold' : '';
  }

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  textarea.focus();
}

/**
 * Closes the Notepad modal and clears its text area.
 */
function closeNotepad() {
  const modal = document.getElementById('notepad-modal');
  const textarea = document.getElementById('notepad-textarea');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  if (textarea) {
    textarea.value = '';
  }
  currentEditingFilePath = null;
}

/**
 * Wires the Notepad modal event handlers (input counting, Cancel, and Save).
 */
function setupNotepadModal() {
  if (notepadModalInitialized) return;
  notepadModalInitialized = true;

  const modal = document.getElementById('notepad-modal');
  const textarea = document.getElementById('notepad-textarea');
  const charCount = document.getElementById('notepad-char-count');
  const btnCancel = document.getElementById('btn-notepad-cancel');
  const btnSave = document.getElementById('btn-notepad-save');

  // Real-time character count on input
  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len} / 500 chars`;
      if (len >= 500) {
        charCount.style.color = 'var(--error, #FF0000)';
        charCount.style.fontWeight = 'bold';
      } else {
        charCount.style.color = '';
        charCount.style.fontWeight = '';
      }
    });
  }

  // Cancel button
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      closeNotepad();
    });
  }

  // Backdrop click to cancel
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeNotepad();
      }
    });
  }

  // Escape key to cancel
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
        closeNotepad();
      }
    });
  }

  // Save button
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (!currentEditingFilePath || !textarea) return;
      const newContent = textarea.value;

      let result;
      if (typeof window !== 'undefined' && window.GitEngine && typeof window.GitEngine.editFileContent === 'function') {
        result = window.GitEngine.editFileContent(currentState, currentEditingFilePath, newContent);
      } else {
        result = {
          newState: currentState,
          success: false,
          outputMessage: 'GitEngine.editFileContent is not available.'
        };
      }

      if (!result.success) {
        alert(result.outputMessage || 'Sandbox limit reached: File content cannot exceed 500 characters.');
        return;
      }

      currentState = result.newState;

      if (!isSandboxMode() && typeof localStorage !== 'undefined' && localStorage) {
        try {
          localStorage.setItem('git_lab_state', JSON.stringify(currentState));
        } catch (storageErr) {
          if (window.DEBUG) { console.warn('Failed to save git_lab_state to localStorage:', storageErr); }
        }
      }

      renderUI(currentState);
      closeNotepad();
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

      // Persist simulator state to localStorage after every command (guided mode only, sandbox is ephemeral)
      if (!isSandboxMode() && typeof localStorage !== 'undefined' && localStorage) {
        try {
          localStorage.setItem('git_lab_state', JSON.stringify(currentState));
        } catch (storageErr) {
          if (window.DEBUG) { console.warn('Failed to save git_lab_state to localStorage:', storageErr); }
        }
      }

      // Command Interception & Progress Validation (bypassed in sandbox mode)
      if (!isSandboxMode() && trimmedInput.length > 0) {
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
  // If in sandbox mode, bypass all command interception/validation
  if (isSandboxMode()) {
    return;
  }
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
  // Reflect the current cwd in echoed command prompts too
  const cwd = (currentState && currentState.cwd) ? currentState.cwd : '/';
  const cleanCwd = cwd.replace(/^\/+|\/+$/g, '');
  const promptPath = cleanCwd ? `~/${cleanCwd}` : '~';
  promptSpan.textContent = `git-user@lab:${promptPath}$ `;

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
    // Clear persisted simulator state from localStorage so user starts completely fresh
    if (typeof localStorage !== 'undefined' && localStorage) {
      try {
        localStorage.removeItem('git_lab_state');
      } catch (storageErr) {
        if (window.DEBUG) { console.warn('Failed to remove git_lab_state from localStorage:', storageErr); }
      }
    }

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

    // Reset mission progress for current session (guided mode only)
    if (!isSandboxMode()) {
      currentStepIndex = 0;
      if (typeof window !== 'undefined') {
        window.currentStepIndex = currentStepIndex;
      }
      updateMissionBanner();
    }

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

  // 0. Update terminal prompt label to reflect current working directory
  const promptEl = document.getElementById('term-prompt-string');
  if (promptEl) {
    const cwd = state.cwd || '/';
    // Map '/' to '~', '/src/' to '~/src', etc.
    const cleanCwd = cwd.replace(/^\/+|\/+$/g, '');
    const promptPath = cleanCwd ? `~/${cleanCwd}` : '~';
    promptEl.textContent = `git-user@lab:${promptPath}$`;
  }

  // 1. Render Left Column: File Tree (Top Half)
  renderFileTree(state);

  // 2. Render Left Column: Working Directory & Staging Area (Bottom Half)
  renderWorkingAndStaging(state);

  // 3. Render Middle Column: Commit Graph
  renderCommitGraph(state);

  // 4. Render Middle Column: Remote Server (GitHub)
  renderRemoteServer(state);
}

/**
 * Renders the File Tree list in the left column as a hierarchical nested tree.
 * Items with paths like "src/app.js" are indented under their parent directory.
 *
 * @param {Object} state - The full simulator state
 */
function renderFileTree(state) {
  const fileSystem = Array.isArray(state.fileSystem) ? state.fileSystem : [];
  const listEl = document.getElementById('file-tree-list');
  const emptyEl = document.getElementById('file-tree-empty-msg');
  const countBadge = document.getElementById('file-count-badge');
  if (!listEl) return;

  if (countBadge) {
    countBadge.textContent = `${fileSystem.length} item${fileSystem.length === 1 ? '' : 's'}`;
  }

  if (fileSystem.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    listEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  listEl.style.display = 'flex';
  listEl.innerHTML = '';

  // Sort: directories first, then files; both sorted alphabetically by name
  const sorted = [...fileSystem].sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach(item => {
    // Calculate depth from path separators
    // e.g. 'src' -> depth 0, 'src/app.js' -> depth 1
    const pathParts = item.name.split('/').filter(Boolean);
    const depth = pathParts.length - 1;
    const displayName = pathParts[pathParts.length - 1];

    const li = document.createElement('li');
    li.className = `file-tree-item ${item.type === 'directory' ? 'directory' : 'file-clickable'}`;
    // Indent by depth: 20px per level beyond root
    li.style.paddingLeft = `${8 + depth * 20}px`;

    // Attach click event to file items (excluding directories) to open Notepad
    if (item.type !== 'directory') {
      li.title = `Click to edit ${item.name}`;
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        openNotepad(item.name);
      });
    }

    // Tree connector prefix for nested items
    if (depth > 0) {
      li.classList.add('file-tree-nested');
    }

    const nameGroup = document.createElement('div');
    nameGroup.className = 'file-name-group';

    // Tree prefix connector for nested items
    if (depth > 0) {
      const connector = document.createElement('span');
      connector.className = 'file-tree-connector';
      connector.textContent = '└─ ';
      connector.setAttribute('aria-hidden', 'true');
      nameGroup.appendChild(connector);
    }

    // File/Folder icon
    const iconSpan = document.createElement('span');
    if (item.type === 'directory') {
      iconSpan.textContent = '📁';
    } else if (displayName.endsWith('.html')) {
      iconSpan.textContent = '🌐';
    } else if (displayName.endsWith('.css')) {
      iconSpan.textContent = '🎨';
    } else if (displayName.endsWith('.js')) {
      iconSpan.textContent = '⚡';
    } else {
      iconSpan.textContent = '📄';
    }
    iconSpan.className = 'file-tree-icon';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = displayName;
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
 * Uses compact circular nodes positioned on a vertical rail with branch labels
 * mounted cleanly to the right of each node.
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

    // Outer wrapper: holds rail line + the row content
    const wrapper = document.createElement('div');
    wrapper.className = 'graph-node-wrapper';

    // Vertical rail connector line drawn between nodes (hidden on last)
    const line = document.createElement('div');
    line.className = 'graph-connector-line';
    wrapper.appendChild(line);

    // --- Row: [circle][meta column] ---
    const row = document.createElement('div');
    row.className = 'graph-node-row';

    // Circular commit dot
    const circle = document.createElement('div');
    circle.className = `graph-node-circle ${isHead ? 'graph-node-circle--head' : 'graph-node-circle--default'}`;
    row.appendChild(circle);

    // Right-side meta column
    const meta = document.createElement('div');
    meta.className = 'graph-node-meta';

    // Top line: commit ID badge + branch tags + timestamp
    const topLine = document.createElement('div');
    topLine.className = 'graph-node-topline';

    const idBadge = document.createElement('span');
    idBadge.className = 'graph-node-id';
    idBadge.textContent = commit.id;
    topLine.appendChild(idBadge);

    // Branch tags that point to this commit
    const pointingBranches = Object.keys(branches).filter(b => branches[b] === commit.id);
    pointingBranches.forEach(bName => {
      const bTag = document.createElement('span');
      const isActiveBranch = bName === currentBranch;
      bTag.className = `graph-branch-tag${isActiveBranch ? ' head' : ''}`;
      bTag.textContent = isActiveBranch ? `HEAD → ${bName}` : bName;
      topLine.appendChild(bTag);
    });

    const timeSpan = document.createElement('span');
    timeSpan.className = 'graph-node-timestamp';
    timeSpan.textContent = formatTimestamp(commit.timestamp);
    topLine.appendChild(timeSpan);

    meta.appendChild(topLine);

    // Commit message
    const msgDiv = document.createElement('div');
    msgDiv.className = 'graph-node-msg';
    msgDiv.textContent = commit.message || 'No commit message';
    meta.appendChild(msgDiv);

    // Files summary
    const filesDiv = document.createElement('div');
    filesDiv.className = 'graph-node-files';
    const fileCount = Array.isArray(commit.files) ? commit.files.length : 0;
    const filesList = Array.isArray(commit.files) ? commit.files.join(', ') : '';
    filesDiv.textContent = `📦 ${fileCount} file${fileCount === 1 ? '' : 's'}${filesList ? ': ' + filesList : ''}`;
    meta.appendChild(filesDiv);

    row.appendChild(meta);
    wrapper.appendChild(row);
    timelineEl.appendChild(wrapper);
  });
}

/**
 * Renders the Remote Server panel (GitHub simulation).
 * Displays remote repository URL, remote branches, and commit pointers.
 *
 * @param {Object} state - The full simulator state
 */
function renderRemoteServer(state) {
  const panel = document.getElementById('remote-server-panel');
  if (!panel) return;

  const statusTag = document.getElementById('remote-status-tag');
  const repoBar = document.getElementById('remote-repo-bar');
  const urlEl = document.getElementById('remote-repo-url');
  const emptyEl = document.getElementById('remote-empty-placeholder');
  const listEl = document.getElementById('remote-branches-list');

  const remote = (state && state.git && state.git.remote) ? state.git.remote : null;
  const hasRemoteUrl = remote && typeof remote.url === 'string' && remote.url.trim().length > 0;

  if (!hasRemoteUrl) {
    if (statusTag) {
      statusTag.textContent = 'NO REMOTE';
      statusTag.className = 'remote-status-badge disconnected';
    }
    if (repoBar) {
      repoBar.style.display = 'none';
    }
    if (emptyEl) {
      emptyEl.style.display = 'flex';
      emptyEl.innerHTML = `
        <span class="remote-cloud-icon">&#9729;</span>
        <p>No remote repository connected. Use <code>git remote add origin &lt;url&gt;</code></p>
      `;
    }
    if (listEl) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
    }
    return;
  }

  // Remote URL is configured
  const remoteName = remote.name || 'origin';
  const remoteUrl = remote.url;
  const branches = (remote.branches && typeof remote.branches === 'object') ? remote.branches : {};
  const branchNames = Object.keys(branches);

  if (statusTag) {
    statusTag.textContent = 'CONNECTED';
    statusTag.className = 'remote-status-badge connected';
  }

  if (repoBar && urlEl) {
    repoBar.style.display = 'flex';
    urlEl.textContent = `${remoteName} (${remoteUrl})`;
  }

  if (branchNames.length === 0) {
    if (emptyEl) {
      emptyEl.style.display = 'flex';
      emptyEl.innerHTML = `
        <span class="remote-cloud-icon">&#9729;</span>
        <p>Remote connected! No branches pushed yet.<br>Use <code>git push ${remoteName} &lt;branch&gt;</code></p>
      `;
    }
    if (listEl) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
    }
    return;
  }

  // Remote has branches
  if (emptyEl) {
    emptyEl.style.display = 'none';
  }

  if (listEl) {
    listEl.style.display = 'flex';
    listEl.innerHTML = '';

    const commits = (state && state.git && Array.isArray(state.git.commits)) ? state.git.commits : [];

    branchNames.forEach(bName => {
      const commitId = branches[bName];
      const commit = commits.find(c => c.id === commitId);
      const commitMsg = commit ? commit.message : '';

      const li = document.createElement('li');
      li.className = 'remote-branch-item';

      const meta = document.createElement('div');
      meta.className = 'remote-branch-meta';

      const tag = document.createElement('span');
      tag.className = 'remote-branch-tag';
      tag.textContent = `${remoteName}/${bName}`;

      const pointer = document.createElement('span');
      pointer.className = 'remote-branch-pointer';
      pointer.textContent = '→';

      const badge = document.createElement('span');
      badge.className = 'remote-commit-badge';
      badge.textContent = commitId || 'none';

      meta.appendChild(tag);
      meta.appendChild(pointer);
      meta.appendChild(badge);
      li.appendChild(meta);

      if (commitMsg) {
        const msg = document.createElement('span');
        msg.className = 'remote-commit-msg';
        msg.title = commitMsg;
        msg.textContent = `"${commitMsg}"`;
        li.appendChild(msg);
      }

      listEl.appendChild(li);
    });
  }
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
    updateMissionBanner,
    openNotepad,
    closeNotepad,
    setupNotepadModal,
    renderRemoteServer,
    // Convenience: expose individual functions at top-level so that
    // internal lab.js calls (window.activeMission, window.currentStepIndex, etc.)
    // and any legacy callers that relied on flat window.* still work.
    isSandboxMode,
    loadMission,
    updateMissionBanner,
    setupTerminalInput,
    setupResetButton,
    setupMissionNavButtons,
    setupHintToggle,
    setupModeControls,
    handleNextMissionRedirect,
    handleNextStepClick,
    handlePrevStepClick,
    validateMissionStep,
    isCommandMatchingExpected
  };
  // Mirror mutable state variables to window so that inline reads
  // (window.activeMission, window.currentStepIndex, etc.) still resolve.
  window.activeMission = activeMission;
  window.currentMissionSteps = currentMissionSteps;
  window.currentStepIndex = currentStepIndex;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getActiveMissionFromUrl,
    isSandboxMode,
    isCommandMatchingExpected,
    validateMissionStep,
    loadMission,
    updateMissionBanner,
    setupTerminalInput,
    setupResetButton,
    setupMissionNavButtons,
    setupHintToggle,
    setupModeControls,
    handleNextMissionRedirect,
    handleNextStepClick,
    handlePrevStepClick,
    openNotepad,
    closeNotepad,
    setupNotepadModal,
    renderRemoteServer,
    MISSION_TITLES
  };
}
