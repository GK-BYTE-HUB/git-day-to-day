/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Simulator State Model & Helpers
 * Phase 4, Step 8: Canonical in-memory state skeleton for the Git engine
 * =============================================================================
 */

const initialSimulatorState = {
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
 * Returns a fresh, pristine deep clone of the canonical initialSimulatorState.
 *
 * @returns {Object} Fresh initial simulator state
 */
function getInitialState() {
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
          timestamp: new Date().toISOString()
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
