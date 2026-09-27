/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Core Git Simulation Logic Engine
 * Part B: Terminal Command Parsing & State Updaters
 * =============================================================================
 * Pure logic file with zero UI dependencies.
 * Handles quote-aware terminal tokenization, command routing, and
 * immutable simulator state transitions.
 */

/**
 * Quote-Aware Terminal Command Parser.
 * Safely splits a terminal input string into an array of arguments,
 * keeping text inside double or single quotes together.
 *
 * Example:
 *   parseCommand('git commit -m "my code"')
 *   => ["git", "commit", "-m", "my code"]
 *
 * @param {string} input - Raw command line string entered by the user
 * @returns {Array<string>} Array of parsed argument tokens
 */
function parseCommand(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const args = [];
  let currentToken = '';
  let inQuotes = false;
  let quoteChar = '';
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // Handle escaped characters inside quotes (e.g. \" or \')
    if (inQuotes && char === '\\' && i + 1 < input.length) {
      const nextChar = input[i + 1];
      if (nextChar === quoteChar || nextChar === '\\') {
        currentToken += nextChar;
        i++;
        continue;
      }
    }

    if (inQuotes) {
      if (char === quoteChar) {
        // Closing quote encountered
        inQuotes = false;
        quoteChar = '';
      } else {
        currentToken += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuotes = true;
        quoteChar = char;
        hasToken = true;
      } else if (/\s/.test(char)) {
        if (hasToken) {
          args.push(currentToken);
          currentToken = '';
          hasToken = false;
        }
      } else {
        currentToken += char;
        hasToken = true;
      }
    }
  }

  // Push final token if present (including empty strings inside quotes like `""`)
  if (hasToken) {
    args.push(currentToken);
  }

  return args;
}

/**
 * Deep-clones a simulator state object to guarantee immutability.
 * Uses global cloneState from simulatorState.js if available, otherwise falls back to JSON clone.
 *
 * @param {Object} state - State to copy
 * @returns {Object} Deep copy of state
 */
function safeCloneState(state) {
  if (typeof cloneState === 'function') {
    return cloneState(state);
  }
  return JSON.parse(JSON.stringify(state || {}));
}

/**
 * Core Command Execution and State Updater.
 * Takes the current simulatorState and raw user input, parses it,
 * routes the action, and returns an updated state copy with execution result.
 *
 * @param {Object} state - Current simulator state
 * @param {string} commandString - Raw input command string
 * @returns {{ newState: Object, outputMessage: string, success: boolean }} Execution result
 */
function executeCommand(state, commandString) {
  // Deep copy the incoming state to maintain strict immutability
  const newState = safeCloneState(state || {});

  // Ensure baseline state structure
  if (!Array.isArray(newState.fileSystem)) {
    newState.fileSystem = [];
  }
  if (!newState.git || typeof newState.git !== 'object') {
    newState.git = {
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
    };
  }

  // Parse command into arguments
  const args = parseCommand(commandString);

  // If blank/whitespace input, return clean state with no-op
  if (args.length === 0) {
    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  const primaryCmd = args[0];

  switch (primaryCmd) {
    case 'mkdir':
      return handleMkdir(newState, args);

    case 'touch':
      return handleTouch(newState, args);

    case 'git':
      return handleGit(newState, args);

    case 'ls':
      return handleLs(newState, args);

    case 'clear':
      return {
        newState,
        outputMessage: '',
        success: true
      };

    default:
      return {
        newState,
        outputMessage: primaryCmd + ': command not found',
        success: false
      };
  }
}

/**
 * Handler for 'mkdir <dir>'.
 * Adds one or more directories to state.fileSystem.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleMkdir(newState, args) {
  if (args.length < 2) {
    return {
      newState,
      outputMessage: 'mkdir: missing operand',
      success: false
    };
  }

  const targets = args.slice(1);
  for (const dirName of targets) {
    const existing = newState.fileSystem.find(item => item.name === dirName);
    if (existing) {
      return {
        newState,
        outputMessage: `mkdir: cannot create directory '${dirName}': File exists`,
        success: false
      };
    }
  }

  for (const dirName of targets) {
    newState.fileSystem.push({
      name: dirName,
      type: 'directory'
    });
  }

  return {
    newState,
    outputMessage: '',
    success: true
  };
}

/**
 * Handler for 'touch <file>'.
 * Adds empty file(s) to state.fileSystem with status 'untracked'.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleTouch(newState, args) {
  if (args.length < 2) {
    return {
      newState,
      outputMessage: 'touch: missing file operand',
      success: false
    };
  }

  const targets = args.slice(1);
  for (const fileName of targets) {
    const existing = newState.fileSystem.find(item => item.name === fileName);
    if (!existing) {
      newState.fileSystem.push({
        name: fileName,
        type: 'file',
        status: 'untracked',
        content: ''
      });
    }
  }

  return {
    newState,
    outputMessage: '',
    success: true
  };
}

/**
 * Handler for 'git <subcommand>'.
 * Routes to subcommands such as 'git init'.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGit(newState, args) {
  if (args.length < 2) {
    return {
      newState,
      outputMessage: 'usage: git [--version] [--help] <command> [<args>]',
      success: false
    };
  }

  const subCmd = args[1];

  switch (subCmd) {
    case 'init':
      return handleGitInit(newState, args);

    default:
      return {
        newState,
        outputMessage: `git: '${subCmd}' is not a git command. See 'git --help'.`,
        success: false
      };
  }
}

/**
 * Handler for 'git init'.
 * Changes state.git.initialized to true.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitInit(newState, args) {
  const wasInitialized = !!newState.git.initialized;
  newState.git.initialized = true;

  if (!newState.git.branches) {
    newState.git.branches = { main: null };
  }
  if (!newState.git.head) {
    newState.git.head = 'main';
  }
  if (!Array.isArray(newState.git.stagingArea)) {
    newState.git.stagingArea = [];
  }
  if (!Array.isArray(newState.git.commits)) {
    newState.git.commits = [];
  }

  const outputMessage = wasInitialized
    ? 'Reinitialized existing Git repository in .git/'
    : 'Initialized empty Git repository in .git/';

  return {
    newState,
    outputMessage,
    success: true
  };
}

/**
 * Handler for 'ls'.
 * Lists items currently in state.fileSystem.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleLs(newState, args) {
  const fileNames = newState.fileSystem.map(item => item.name);
  return {
    newState,
    outputMessage: fileNames.join('  '),
    success: true
  };
}

// Expose functions globally for browser JSP usage
if (typeof window !== 'undefined') {
  window.parseCommand = parseCommand;
  window.executeCommand = executeCommand;
  window.GitEngine = {
    parseCommand,
    executeCommand
  };
}

// Support CommonJS/Node modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCommand,
    executeCommand,
    GitEngine: {
      parseCommand,
      executeCommand
    }
  };
}
