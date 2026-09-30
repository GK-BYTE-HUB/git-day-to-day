/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Simulator State Model & Helpers
 * Phase 4, Step 8: Canonical in-memory state skeleton for the Git engine
 * =============================================================================
 */

// Single shared debug flag for all GitD2D scripts (set on window to avoid
// re-declaration errors across multiple <script> tags on the same page).
window.DEBUG = false;

const SANDBOX_INITIAL_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const initialSimulatorState = {
  cwd: '/',
  fileSystem: [],
  git: {
    initialized: false,
    stagingArea: [],
    branches: { main: null },
    head: "main",
    commits: [],
    remote: {
      url: null,
      branches: {},
      aheadBehind: { ahead: 0, behind: 0 }
    }
  }
};

/**
 * Safely creates a deep copy of any simulator state object.
 *
 * @param {Object} state - The state object to clone
 * @returns {Object} Deep-cloned copy of the state
 */
function cloneState(state) {
  if (!state || typeof state !== 'object') {
    return null;
  }
  return JSON.parse(JSON.stringify(state));
}

/**
 * Returns the initial simulator state.
 * Checks localStorage for persisted 'git_lab_state' first;
 * if found, safely parses and returns it; otherwise returns fresh initialSimulatorState.
 *
 * @returns {Object} Fresh or persisted simulator state
 */
function getInitialState() {
  // If in sandbox mode (?mode=sandbox), bypass localStorage entirely and return sandbox state
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'sandbox') {
        return getSandboxInitialState();
      }
    } catch (e) {
      if (window.location.search.indexOf('mode=sandbox') !== -1) {
        return getSandboxInitialState();
      }
    }
  }

  if (typeof localStorage !== 'undefined' && localStorage) {
    try {
      const saved = localStorage.getItem('git_lab_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Schema validation: discard and purge corrupted state
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray(parsed.fileSystem) &&
          parsed.git !== null &&
          typeof parsed.git === 'object'
        ) {
          return parsed;
        }
        // Invalid schema — remove the corrupted key and fall through to fresh state
        localStorage.removeItem('git_lab_state');
      }
    } catch (e) {
      if (window.DEBUG) { console.warn('Failed to parse git_lab_state from localStorage:', e); }
    }
  }
  return cloneState(initialSimulatorState);
}

/**
 * Returns the pre-populated sandbox initial state:
 * Contains index.html, style.css, app.js and an initialized .git repository.
 *
 * @returns {Object} Pre-populated sandbox state
 */
function getSandboxInitialState() {
  return {
    cwd: '/',
    fileSystem: [
      { name: "index.html", status: "tracked_unmodified", content: "<h1>Welcome to My Website</h1>" },
      { name: "style.css", status: "tracked_unmodified", content: "body { font-family: sans-serif; margin: 0; }" },
      { name: "app.js", status: "tracked_unmodified", content: "console.log('App ready');" }
    ],
    git: {
      initialized: true,
      stagingArea: [],
      branches: { main: "c1" },
      head: "main",
      commits: [
        {
          id: "c1",
          parent: null,
          message: "Initial commit",
          files: ["index.html", "style.css", "app.js"],
          timestamp: SANDBOX_INITIAL_TIMESTAMP
        }
      ],
      remote: {
        url: "https://github.com/example/repo.git",
        branches: { main: "c1" },
        aheadBehind: { ahead: 0, behind: 0 }
      }
    }
  };
}

// Attach to browser global scope
if (typeof window !== 'undefined') {
  window.initialSimulatorState = initialSimulatorState;
  window.getInitialState = getInitialState;
  window.cloneState = cloneState;
  window.getSandboxInitialState = getSandboxInitialState;
  window.SimulatorStateManager = {
    initialSimulatorState,
    getInitialState,
    cloneState,
    getSandboxInitialState
  };
}

// Support CommonJS/Node modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initialSimulatorState,
    getInitialState,
    cloneState,
    getSandboxInitialState
  };
}
