/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Core Git Simulation Logic Engine
 * Part B & Page 3: Terminal Command Parsing & State Updaters
 * =============================================================================
 * Pure logic file with zero DOM dependencies.
 * Handles quote-aware terminal tokenization, command routing, whitelist rejection,
 * sandbox limit enforcement, and immutable simulator state transitions.
 */

// =============================================================================
// Constants & Configuration
// =============================================================================

const SANDBOX_LIMITS = {
  MAX_FILES: 10,
  MAX_FOLDER_DEPTH: 1,
  MAX_COMMITS: 15,
  MAX_BRANCHES: 5,
  MAX_FILE_CHARS: 500
};

const WHITELIST_PRIMARY = ['git', 'mkdir', 'touch', 'ls', 'clear', 'rm', 'cd', 'cat'];

const WHITELIST_GIT_SUBCOMMANDS = [
  'init',
  'status',
  'add',
  'commit',
  'log',
  'branch',
  'switch',
  'checkout',
  'merge',
  'remote',
  'push',
  'fetch',
  'pull',
  'clone',
  'restore'
];

const REJECTION_MESSAGE = "Command not supported in this simulation. Try 'git log' or 'git status'.";

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
 * Calculates folder depth of a path string relative to root.
 * Root-level directories (e.g. "my-folder") have depth 1.
 * Subdirectories (e.g. "a/b") have depth 2.
 *
 * @param {string} pathStr
 * @returns {number} Depth
 */
function getFolderDepth(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') return 0;
  const normalized = pathStr.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized) return 0;
  const parts = normalized.split('/').filter(p => p !== '.' && p !== '');
  return parts.length;
}

/**
 * Resolves a target path against the current working directory (cwd).
 * Returns a normalized path relative to root without leading or trailing slashes.
 * e.g. cwd='/src/', target='app.js' => 'src/app.js'
 *      cwd='/', target='app.js' => 'app.js'
 *      cwd='/src/', target='/app.js' => 'app.js'
 *
 * @param {string} cwd
 * @param {string} targetPath
 * @returns {string}
 */
function resolvePath(cwd, targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return '';
  let p = targetPath.replace(/\\/g, '/').trim();
  let baseParts = [];
  if (!p.startsWith('/')) {
    const cleanCwd = (cwd || '/').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (cleanCwd) {
      baseParts = cleanCwd.split('/').filter(Boolean);
    }
  }
  const rawParts = p.split('/').filter(part => part !== '' && part !== '.');
  for (const part of rawParts) {
    if (part === '..') {
      if (baseParts.length > 0) {
        baseParts.pop();
      }
    } else {
      baseParts.push(part);
    }
  }
  return baseParts.join('/');
}

/**
 * Counts total non-directory files in state.fileSystem.
 *
 * @param {Array<Object>} fileSystem
 * @returns {number}
 */
function countFiles(fileSystem) {
  if (!Array.isArray(fileSystem)) return 0;
  return fileSystem.filter(item => item && item.type !== 'directory').length;
}

/**
 * Core Command Execution and State Updater.
 * Takes the current simulatorState and raw user input, parses it,
 * checks sandbox limits, rejects non-whitelisted commands, routes the action,
 * and returns an updated state copy with execution result. Dispatches
 * 'stateChanged' CustomEvent on window if available.
 *
 * @param {Object} state - Current simulator state
 * @param {string} commandString - Raw input command string
 * @returns {{ newState: Object, outputMessage: string, success: boolean }} Execution result
 */
function executeCommand(state, commandString) {
  // Deep copy the incoming state to maintain strict immutability
  const newState = safeCloneState(state || {});

  // Ensure baseline state structure
  if (!newState.cwd || typeof newState.cwd !== 'string') {
    newState.cwd = '/';
  }
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
    return finishExecution(newState, '', true);
  }

  const primaryCmd = args[0];

  // 1. Whitelist Check (primary command)
  if (!WHITELIST_PRIMARY.includes(primaryCmd)) {
    return finishExecution(newState, REJECTION_MESSAGE, false);
  }

  // Whitelist Check (git subcommands)
  if (primaryCmd === 'git') {
    if (args.length < 2 || !WHITELIST_GIT_SUBCOMMANDS.includes(args[1])) {
      return finishExecution(newState, REJECTION_MESSAGE, false);
    }
  }

  // 2. Sandbox Limits Check (enforced before processing)
  const limitCheckResult = checkSandboxLimitsBefore(newState, primaryCmd, args);
  if (limitCheckResult) {
    return finishExecution(newState, limitCheckResult.message, false);
  }

  // 3. Route commands
  let result;
  switch (primaryCmd) {
    case 'mkdir':
      result = handleMkdir(newState, args);
      break;

    case 'touch':
      result = handleTouch(newState, args);
      break;

    case 'git':
      result = handleGit(newState, args);
      break;

    case 'ls':
      result = handleLs(newState, args);
      break;

    case 'rm':
      result = handleRm(newState, args);
      break;

    case 'cd':
      result = handleCd(newState, args);
      break;

    case 'cat':
      result = handleCat(newState, args);
      break;

    case 'clear':
      result = {
        newState,
        outputMessage: '',
        success: true
      };
      break;

    // Defensive: should never reach here due to whitelist check above
    default:
      result = {
        newState,
        outputMessage: REJECTION_MESSAGE,
        success: false
      };
      break;
  }

  // Invariant limit safeguard
  if (result.success) {
    if (countFiles(result.newState.fileSystem) > SANDBOX_LIMITS.MAX_FILES) {
      return finishExecution(newState, `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_FILES} files allowed.`, false);
    }
    if ((result.newState.git.commits || []).length > SANDBOX_LIMITS.MAX_COMMITS) {
      return finishExecution(newState, `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_COMMITS} commits allowed.`, false);
    }
    if (Object.keys(result.newState.git.branches || {}).length > SANDBOX_LIMITS.MAX_BRANCHES) {
      return finishExecution(newState, `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_BRANCHES} branches allowed.`, false);
    }
  }

  return finishExecution(result.newState, result.outputMessage, result.success);
}

/**
 * Finalizes execution by dispatching 'stateChanged' CustomEvent on window (if present)
 * and returning the final result object.
 *
 * @param {Object} newState
 * @param {string} outputMessage
 * @param {boolean} success
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
/**
 * Shared helper: dispatches the 'stateChanged' CustomEvent on window with newState as detail.
 * Falls back to the IE11-compatible document.createEvent path if CustomEvent constructor throws.
 *
 * @param {Object} state - The updated simulator state to broadcast
 */
function dispatchStateChanged(state) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const event = new CustomEvent('stateChanged', {
        detail: state
      });
      window.dispatchEvent(event);
    } catch (e) {
      if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('stateChanged', false, false, state);
        window.dispatchEvent(evt);
      }
    }
  }
}

function finishExecution(newState, outputMessage, success) {
  const finalResult = {
    newState,
    outputMessage,
    success
  };

  dispatchStateChanged(newState);

  return finalResult;
}

/**
 * Validates sandbox limits before command execution.
 *
 * @param {Object} state
 * @param {string} primaryCmd
 * @param {Array<string>} args
 * @returns {{ message: string } | null}
 */
function checkSandboxLimitsBefore(state, primaryCmd, args) {
  // Max folder depth check for mkdir
  if (primaryCmd === 'mkdir') {
    const targets = args.slice(1).filter(a => !a.startsWith('-'));
    for (const dirName of targets) {
      const fullPath = resolvePath(state.cwd, dirName);
      if (getFolderDepth(fullPath) > SANDBOX_LIMITS.MAX_FOLDER_DEPTH) {
        return { message: `Sandbox limit reached: Maximum folder depth is ${SANDBOX_LIMITS.MAX_FOLDER_DEPTH}.` };
      }
    }
  }

  // Max folder depth & Max files check for touch
  if (primaryCmd === 'touch') {
    const targets = args.slice(1).filter(a => !a.startsWith('-'));
    for (const fileName of targets) {
      const fullPath = resolvePath(state.cwd, fileName);
      const parts = fullPath.split('/').filter(Boolean);
      // Folder depth for a file is parts.length - 1
      if (parts.length - 1 > SANDBOX_LIMITS.MAX_FOLDER_DEPTH) {
        return { message: `Sandbox limit reached: Maximum folder depth is ${SANDBOX_LIMITS.MAX_FOLDER_DEPTH}.` };
      }
    }

    const currentFileCount = countFiles(state.fileSystem);
    let newFilesCount = 0;
    const existingNames = new Set(state.fileSystem.map(f => f.name));
    for (const fileName of targets) {
      const fullPath = resolvePath(state.cwd, fileName);
      if (!existingNames.has(fullPath)) {
        newFilesCount++;
        existingNames.add(fullPath);
      }
    }
    if (currentFileCount + newFilesCount > SANDBOX_LIMITS.MAX_FILES) {
      return { message: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_FILES} files allowed.` };
    }
  }

  // Max commits check for git commit
  if (primaryCmd === 'git' && args[1] === 'commit') {
    const currentCommits = (state.git && Array.isArray(state.git.commits)) ? state.git.commits.length : 0;
    if (currentCommits >= SANDBOX_LIMITS.MAX_COMMITS) {
      return { message: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_COMMITS} commits allowed.` };
    }
  }

  // Max branches check for git branch <name>
  if (primaryCmd === 'git' && args[1] === 'branch') {
    if (args.length >= 3 && !args[2].startsWith('-')) {
      const branchName = args[2];
      const branches = (state.git && state.git.branches) ? state.git.branches : {};
      if (branches[branchName] === undefined && Object.keys(branches).length >= SANDBOX_LIMITS.MAX_BRANCHES) {
        return { message: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_BRANCHES} branches allowed.` };
      }
    }
  }

  // Max branches check for git switch -c <name> or git checkout -b <name>
  if (primaryCmd === 'git' && (args[1] === 'switch' || args[1] === 'checkout')) {
    if ((args[2] === '-c' || args[2] === '-b') && args[3]) {
      const branchName = args[3];
      const branches = (state.git && state.git.branches) ? state.git.branches : {};
      if (branches[branchName] === undefined && Object.keys(branches).length >= SANDBOX_LIMITS.MAX_BRANCHES) {
        return { message: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_BRANCHES} branches allowed.` };
      }
    }
  }

  return null;
}

// =============================================================================
// File System Handlers
// =============================================================================

/**
 * Handler for 'mkdir <dir>'.
 * Adds one or more directories to state.fileSystem.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleMkdir(newState, args) {
  const targets = args.slice(1).filter(a => !a.startsWith('-'));
  if (targets.length === 0) {
    return {
      newState,
      outputMessage: 'mkdir: missing operand',
      success: false
    };
  }

  for (const dirName of targets) {
    const fullPath = resolvePath(newState.cwd, dirName);
    const existing = newState.fileSystem.find(item => item.name === fullPath);
    if (existing) {
      return {
        newState,
        outputMessage: `mkdir: cannot create directory '${dirName}': File exists`,
        success: false
      };
    }
  }

  for (const dirName of targets) {
    const fullPath = resolvePath(newState.cwd, dirName);
    newState.fileSystem.push({
      name: fullPath,
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
  const targets = args.slice(1).filter(a => !a.startsWith('-'));
  if (targets.length === 0) {
    return {
      newState,
      outputMessage: 'touch: missing file operand',
      success: false
    };
  }

  for (const fileName of targets) {
    const fullPath = resolvePath(newState.cwd, fileName);
    const existing = newState.fileSystem.find(item => item.name === fullPath);
    if (!existing) {
      newState.fileSystem.push({
        name: fullPath,
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
 * Handler for 'ls'.
 * Lists items currently in state.fileSystem that are direct children of cwd.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleLs(newState, args) {
  const cwd = newState.cwd || '/';
  const cleanCwd = cwd.replace(/^\/+|\/+$/g, '');
  const prefix = cleanCwd ? cleanCwd + '/' : '';

  const directChildren = newState.fileSystem.filter(item => {
    if (!item || !item.name) return false;
    if (prefix) {
      if (!item.name.startsWith(prefix)) return false;
      const remainder = item.name.slice(prefix.length);
      return remainder.length > 0 && !remainder.includes('/');
    } else {
      return !item.name.includes('/');
    }
  });

  const names = directChildren.map(item => {
    const parts = item.name.split('/');
    return parts[parts.length - 1];
  });

  return {
    newState,
    outputMessage: names.join('  '),
    success: true
  };
}

/**
 * Handler for 'rm <file>'.
 * Removes file(s) from state.fileSystem and stagingArea.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleRm(newState, args) {
  const targets = args.slice(1).filter(a => !a.startsWith('-'));
  if (targets.length === 0) {
    return {
      newState,
      outputMessage: 'rm: missing operand',
      success: false
    };
  }

  for (const target of targets) {
    const resolvedPath = resolvePath(newState.cwd, target);
    const idx = newState.fileSystem.findIndex(item => item.name === resolvedPath);
    if (idx === -1) {
      return {
        newState,
        outputMessage: `rm: cannot remove '${target}': No such file or directory`,
        success: false
      };
    }
    newState.fileSystem.splice(idx, 1);
    if (Array.isArray(newState.git.stagingArea)) {
      const sIdx = newState.git.stagingArea.indexOf(resolvedPath);
      if (sIdx !== -1) {
        newState.git.stagingArea.splice(sIdx, 1);
      }
    }
  }

  return {
    newState,
    outputMessage: '',
    success: true
  };
}

/**
 * Handler for 'cd <dir>'.
 * Navigates directories.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleCd(newState, args) {
  // If no directory specified, or '~' or '/' -> return to root '/'
  if (args.length < 2 || args[1] === '~' || args[1] === '/') {
    newState.cwd = '/';
    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  const target = args[1];

  // Current directory '.'
  if (target === '.') {
    if (!newState.cwd) {
      newState.cwd = '/';
    }
    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  // Parent directory '..'
  if (target === '..') {
    const cleanCwd = (newState.cwd || '/').replace(/^\/+|\/+$/g, '');
    if (!cleanCwd) {
      newState.cwd = '/';
    } else {
      const parts = cleanCwd.split('/').filter(Boolean);
      parts.pop();
      newState.cwd = parts.length === 0 ? '/' : '/' + parts.join('/') + '/';
    }
    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  // Target directory path relative to cwd or root
  const resolvedTarget = resolvePath(newState.cwd, target);
  const dir = newState.fileSystem.find(item => item.name === resolvedTarget && item.type === 'directory');
  if (!dir) {
    return {
      newState,
      outputMessage: `cd: no such file or directory: ${target}`,
      success: false
    };
  }

  newState.cwd = '/' + resolvedTarget + '/';
  return {
    newState,
    outputMessage: '',
    success: true
  };
}

/**
 * Handler for 'cat <file>'.
 * Prints the content of one or more files in state.fileSystem.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleCat(newState, args) {
  const targets = args.slice(1).filter(a => !a.startsWith('-'));
  if (targets.length === 0) {
    return {
      newState,
      outputMessage: 'cat: missing operand',
      success: false
    };
  }

  const outputParts = [];
  let allSuccess = true;

  for (const target of targets) {
    const resolvedPath = resolvePath(newState.cwd, target);
    const item = newState.fileSystem.find(f => f.name === resolvedPath) ||
                 newState.fileSystem.find(f => f.name === target);

    if (!item) {
      outputParts.push(`cat: ${target}: No such file or directory`);
      allSuccess = false;
    } else if (item.type === 'directory') {
      outputParts.push(`cat: ${target}: Is a directory`);
      allSuccess = false;
    } else {
      outputParts.push(item.content !== undefined && item.content !== null ? item.content : '');
    }
  }

  return {
    newState,
    outputMessage: outputParts.join('\n'),
    success: allSuccess
  };
}

/**
 * Programmatically edits the content of an existing file in simulatorState.
 * Enforces a 500-character sandbox limit and updates git tracking status
 * from 'tracked_unmodified' to 'modified'.
 *
 * @param {Object} state - Current simulator state
 * @param {string} fileName - File path/name to edit
 * @param {string} newContent - New string content to store in file
 * @returns {{ newState: Object, success: boolean, outputMessage?: string }}
 */
function editFileContent(state, fileName, newContent) {
  const contentStr = newContent !== undefined && newContent !== null ? String(newContent) : '';

  // Enforce strict sandbox limit: 500 characters
  if (contentStr.length > SANDBOX_LIMITS.MAX_FILE_CHARS) {
    return {
      newState: state,
      success: false,
      outputMessage: 'Sandbox limit reached: File content cannot exceed 500 characters.'
    };
  }

  // Deep clone to guarantee immutability
  const newState = safeCloneState(state || {});
  if (!newState.cwd) {
    newState.cwd = '/';
  }
  if (!Array.isArray(newState.fileSystem)) {
    newState.fileSystem = [];
  }

  const resolvedPath = resolvePath(newState.cwd, fileName);
  let file = newState.fileSystem.find(item => item.name === resolvedPath && item.type !== 'directory');
  if (!file) {
    file = newState.fileSystem.find(item => item.name === fileName && item.type !== 'directory');
  }

  if (!file) {
    return {
      newState: state,
      success: false,
      outputMessage: `File not found: ${fileName}`
    };
  }

  file.content = contentStr;

  // CRITICAL GIT LOGIC: If the file's current status is tracked_unmodified, change its status to modified
  if (file.status === 'tracked_unmodified') {
    file.status = 'modified';
  }

  dispatchStateChanged(newState);

  return {
    newState,
    success: true
  };
}

// =============================================================================
// Git Subcommand Dispatcher & Handlers
// =============================================================================

/**
 * Handler for 'git <subcommand>'.
 * Routes to individual git subcommands.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGit(newState, args) {
  if (args.length < 2) {
    return {
      newState,
      outputMessage: REJECTION_MESSAGE,
      success: false
    };
  }

  const subCmd = args[1];

  switch (subCmd) {
    case 'init':
      return handleGitInit(newState, args);

    case 'status':
      return handleGitStatus(newState, args);

    case 'add':
      return handleGitAdd(newState, args);

    case 'commit':
      return handleGitCommit(newState, args);

    case 'log':
      return handleGitLog(newState, args);

    case 'branch':
      return handleGitBranch(newState, args);

    case 'switch':
    case 'checkout':
      return handleGitSwitch(newState, args);

    case 'merge':
      return handleGitMerge(newState, args);

    case 'remote':
      return handleGitRemote(newState, args);

    case 'push':
      return handleGitPush(newState, args);

    case 'fetch':
      return handleGitFetch(newState, args);

    case 'pull':
      return handleGitPull(newState, args);

    case 'clone':
      return handleGitClone(newState, args);

    case 'restore':
      return handleGitRestore(newState, args);

    // Defensive: should never reach here due to whitelist check above
    default:
      return {
        newState,
        outputMessage: REJECTION_MESSAGE,
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
  if (!newState.git.remote) {
    newState.git.remote = {
      url: null,
      branches: {},
      aheadBehind: { ahead: 0, behind: 0 }
    };
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
 * Handler for 'git status'.
 * Returns text summarizing untracked, modified, and staged files.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitStatus(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  const branch = newState.git.head || 'main';
  const headCommitId = newState.git.branches ? newState.git.branches[branch] : null;
  const headCommit = (newState.git.commits || []).find(c => c.id === headCommitId);
  const committedFiles = headCommit && Array.isArray(headCommit.files) ? headCommit.files : [];
  const staged = newState.git.stagingArea || [];
  const stagedNames = staged.map(f => typeof f === 'string' ? f : f.name);

  const files = (newState.fileSystem || []).filter(item => item.type !== 'directory');

  // Staged files
  const stagedNew = [];
  const stagedModified = [];
  for (const name of stagedNames) {
    if (committedFiles.includes(name)) {
      stagedModified.push(name);
    } else {
      stagedNew.push(name);
    }
  }

  // Changes not staged for commit
  const unstagedModified = [];
  for (const file of files) {
    if (committedFiles.includes(file.name) && file.status === 'modified' && !stagedNames.includes(file.name)) {
      unstagedModified.push(file.name);
    }
  }

  // Untracked files
  const untracked = [];
  for (const file of files) {
    if (!committedFiles.includes(file.name) && !stagedNames.includes(file.name)) {
      untracked.push(file.name);
    }
  }

  const lines = [`On branch ${branch}`];

  if (!headCommit) {
    lines.push('No commits yet\n');
  }

  if (stagedNew.length > 0 || stagedModified.length > 0) {
    lines.push('Changes to be committed:');
    lines.push('  (use "git restore --staged <file>..." to unstage)');
    for (const name of stagedNew) {
      lines.push(`\tnew file:   ${name}`);
    }
    for (const name of stagedModified) {
      lines.push(`\tmodified:   ${name}`);
    }
    lines.push('');
  }

  if (unstagedModified.length > 0) {
    lines.push('Changes not staged for commit:');
    lines.push('  (use "git add <file>..." to update what will be committed)');
    lines.push('  (use "git restore <file>..." to discard changes in working directory)');
    for (const name of unstagedModified) {
      lines.push(`\tmodified:   ${name}`);
    }
    lines.push('');
  }

  if (untracked.length > 0) {
    lines.push('Untracked files:');
    lines.push('  (use "git add <file>..." to include in what will be committed)');
    for (const name of untracked) {
      lines.push(`\t${name}`);
    }
    lines.push('');
  }

  if (stagedNew.length === 0 && stagedModified.length === 0 && unstagedModified.length === 0 && untracked.length === 0) {
    lines.push('nothing to commit, working tree clean');
  } else if (stagedNew.length === 0 && stagedModified.length === 0 && untracked.length > 0 && unstagedModified.length === 0) {
    lines.push('nothing added to commit but untracked files present (use "git add" to track)');
  }

  return {
    newState,
    outputMessage: lines.join('\n').trim(),
    success: true
  };
}

/**
 * Handler for 'git add <file>' / 'git add .'.
 * Moves specified files to state.git.stagingArea.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitAdd(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (args.length < 3) {
    return {
      newState,
      outputMessage: "fatal: nothing specified, run again with '.' or a path",
      success: false
    };
  }

  if (!Array.isArray(newState.git.stagingArea)) {
    newState.git.stagingArea = [];
  }

  const targets = args.slice(2);
  const isAll = targets.includes('.') || targets.includes('-A') || targets.includes('--all');

  if (isAll) {
    const files = (newState.fileSystem || []).filter(item => item.type !== 'directory');
    if (files.length === 0) {
      return {
        newState,
        outputMessage: '',
        success: true
      };
    }
    for (const file of files) {
      if (!newState.git.stagingArea.includes(file.name)) {
        newState.git.stagingArea.push(file.name);
      }
      file.status = 'staged';
    }
    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  for (const target of targets) {
    const resolvedPath = resolvePath(newState.cwd, target);
    const file = (newState.fileSystem || []).find(item => item.name === resolvedPath && item.type !== 'directory');
    if (!file) {
      return {
        newState,
        outputMessage: `fatal: pathspec '${target}' did not match any files`,
        success: false
      };
    }
    if (!newState.git.stagingArea.includes(file.name)) {
      newState.git.stagingArea.push(file.name);
    }
    file.status = 'staged';
  }

  return {
    newState,
    outputMessage: '',
    success: true
  };
}

/**
 * Handler for 'git commit -m "..."'.
 * Creates a new commit object (id, parent, message, files), advances HEAD
 * and branch pointer, and clears staging area.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitCommit(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  let message = null;
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '-m' || args[i] === '-am') {
      if (i + 1 < args.length) {
        message = args[i + 1];
      }
      break;
    }
  }

  if (message === null || message === undefined || message.trim() === '') {
    return {
      newState,
      outputMessage: "error: switch 'm' requires a value\nAborting commit due to empty commit message.",
      success: false
    };
  }

  // Handle -a / -am flag: auto-stage all tracked, modified files
  const isAutoStage = args.includes('-a') || args.includes('-am') || args.includes('-ma');
  if (isAutoStage) {
    if (!Array.isArray(newState.git.stagingArea)) {
      newState.git.stagingArea = [];
    }
    const branch = newState.git.head || 'main';
    const headCommitId = newState.git.branches ? newState.git.branches[branch] : null;
    const headCommit = (newState.git.commits || []).find(c => c.id === headCommitId);
    const committedFiles = headCommit && Array.isArray(headCommit.files) ? headCommit.files : [];

    for (const file of (newState.fileSystem || [])) {
      if (file.type !== 'directory' && committedFiles.includes(file.name) && file.status === 'modified') {
        if (!newState.git.stagingArea.includes(file.name)) {
          newState.git.stagingArea.push(file.name);
        }
        file.status = 'staged';
      }
    }
  }

  if (!Array.isArray(newState.git.stagingArea) || newState.git.stagingArea.length === 0) {
    const branch = newState.git.head || 'main';
    return {
      newState,
      outputMessage: `On branch ${branch}\nnothing to commit, working tree clean`,
      success: false
    };
  }

  if (!Array.isArray(newState.git.commits)) {
    newState.git.commits = [];
  }

  const branch = newState.git.head || 'main';
  const parentId = newState.git.branches ? newState.git.branches[branch] : null;
  const parentCommit = newState.git.commits.find(c => c.id === parentId);
  const parentFiles = parentCommit && Array.isArray(parentCommit.files) ? parentCommit.files : [];

  const stagedFiles = newState.git.stagingArea.map(f => typeof f === 'string' ? f : f.name);
  const commitFiles = Array.from(new Set([...parentFiles, ...stagedFiles]));

  let idNumber = newState.git.commits.length + 1;
  let commitId = `c${idNumber}`;
  while (newState.git.commits.some(c => c.id === commitId)) {
    idNumber++;
    commitId = `c${idNumber}`;
  }

  const newCommit = {
    id: commitId,
    parent: parentId,
    message: message,
    files: commitFiles,
    timestamp: new Date().toISOString()
  };

  newState.git.commits.push(newCommit);

  if (!newState.git.branches) {
    newState.git.branches = {};
  }
  newState.git.branches[branch] = commitId;

  // Mark files in fileSystem as tracked_unmodified
  for (const item of newState.fileSystem) {
    if (stagedFiles.includes(item.name)) {
      item.status = 'tracked_unmodified';
    }
  }

  // Clear staging area
  newState.git.stagingArea = [];

  // Update ahead count only when a remote URL is actually configured
  if (newState.git.remote && typeof newState.git.remote === 'object' && newState.git.remote.url) {
    if (!newState.git.remote.aheadBehind) {
      newState.git.remote.aheadBehind = { ahead: 0, behind: 0 };
    }
    newState.git.remote.aheadBehind.ahead = (newState.git.remote.aheadBehind.ahead || 0) + 1;
  }

  return {
    newState,
    outputMessage: `[${branch} ${commitId}] ${message}\n ${stagedFiles.length} file(s) changed`,
    success: true
  };
}

/**
 * Handler for 'git log'.
 * Returns text listing commit history for the current branch.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitLog(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  const branch = newState.git.head || 'main';
  const headCommitId = newState.git.branches ? newState.git.branches[branch] : null;

  if (!headCommitId || !Array.isArray(newState.git.commits) || newState.git.commits.length === 0) {
    return {
      newState,
      outputMessage: `fatal: your current branch '${branch}' does not have any commits yet`,
      success: false
    };
  }

  const commitMap = new Map(newState.git.commits.map(c => [c.id, c]));
  let history = [];
  let curr = commitMap.get(headCommitId);
  const visited = new Set();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    history.push(curr);
    curr = curr.parent ? commitMap.get(curr.parent) : null;
  }

  if (history.length === 0) {
    return {
      newState,
      outputMessage: `fatal: your current branch '${branch}' does not have any commits yet`,
      success: false
    };
  }

  // Support -n <number> or -n<number> flag to limit output to most recent N commits
  let limit = null;
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '-n') {
      if (i + 1 < args.length) {
        const val = parseInt(args[i + 1], 10);
        if (!isNaN(val) && val >= 0) {
          limit = val;
        }
      }
    } else if (args[i].startsWith('-n') && args[i].length > 2) {
      const val = parseInt(args[i].slice(2), 10);
      if (!isNaN(val) && val >= 0) {
        limit = val;
      }
    }
  }

  if (limit !== null) {
    history = history.slice(0, limit);
  }

  const isOneLine = args.includes('--oneline');

  if (isOneLine) {
    const lines = history.map((c, idx) => {
      const headTag = idx === 0 ? ` (HEAD -> ${branch})` : '';
      return `${c.id}${headTag} ${c.message}`;
    });
    return {
      newState,
      outputMessage: lines.join('\n'),
      success: true
    };
  }

  const entries = history.map((c, idx) => {
    const headTag = idx === 0 ? ` (HEAD -> ${branch})` : '';
    return `commit ${c.id}${headTag}\nDate: ${c.timestamp || 'Sun Sep 28 2026'}\n\n    ${c.message}`;
  });

  return {
    newState,
    outputMessage: entries.join('\n\n'),
    success: true
  };
}

/**
 * Handler for 'git branch <name>'.
 * Creates a new branch pointing to the current commit or lists branches.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitBranch(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (!newState.git.branches) {
    newState.git.branches = { main: null };
  }

  // Listing branches: git branch
  if (args.length === 2) {
    const names = Object.keys(newState.git.branches);
    const lines = names.map(name => {
      return name === newState.git.head ? `* ${name}` : `  ${name}`;
    });
    return {
      newState,
      outputMessage: lines.join('\n'),
      success: true
    };
  }

  // Branch deletion: git branch -d <name> or -D <name>
  if (args[2] === '-d' || args[2] === '-D') {
    const target = args[3];
    if (!target) {
      return {
        newState,
        outputMessage: 'fatal: branch name required',
        success: false
      };
    }
    if (!newState.git.branches[target]) {
      return {
        newState,
        outputMessage: `error: branch '${target}' not found.`,
        success: false
      };
    }
    if (target === newState.git.head) {
      return {
        newState,
        outputMessage: `error: cannot delete branch '${target}' used by worktree`,
        success: false
      };
    }
    delete newState.git.branches[target];
    return {
      newState,
      outputMessage: `Deleted branch ${target}.`,
      success: true
    };
  }

  // Branch creation: git branch <name>
  const branchName = args[2];
  if (!branchName) {
    return {
      newState,
      outputMessage: 'fatal: branch name required',
      success: false
    };
  }

  if (newState.git.branches[branchName] !== undefined) {
    return {
      newState,
      outputMessage: `fatal: a branch named '${branchName}' already exists`,
      success: false
    };
  }

  const currentCommitId = newState.git.branches[newState.git.head] || null;
  newState.git.branches[branchName] = currentCommitId;

  return {
    newState,
    outputMessage: '',
    success: true
  };
}

/**
 * Handler for 'git switch <name>' and 'git checkout <name>'.
 * Changes state.git.head to the target branch or creates a branch with -c.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitSwitch(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (!newState.git.branches) {
    newState.git.branches = { main: null };
  }

  if (args.length < 3) {
    return {
      newState,
      outputMessage: 'fatal: missing branch name',
      success: false
    };
  }

  // Handle git switch -c <name> or git checkout -b <name>
  if (args[2] === '-c' || args[2] === '-b') {
    const newBranch = args[3];
    if (!newBranch) {
      return {
        newState,
        outputMessage: 'fatal: missing branch name',
        success: false
      };
    }
    if (newState.git.branches[newBranch] !== undefined) {
      return {
        newState,
        outputMessage: `fatal: a branch named '${newBranch}' already exists`,
        success: false
      };
    }
    const currentCommitId = newState.git.branches[newState.git.head] || null;
    newState.git.branches[newBranch] = currentCommitId;
    newState.git.head = newBranch;
    return {
      newState,
      outputMessage: `Switched to a new branch '${newBranch}'`,
      success: true
    };
  }

  const target = args[2];
  if (newState.git.branches[target] === undefined) {
    return {
      newState,
      outputMessage: `fatal: invalid reference: ${target}`,
      success: false
    };
  }

  if (newState.git.head === target) {
    return {
      newState,
      outputMessage: `Already on '${target}'`,
      success: true
    };
  }

  newState.git.head = target;
  return {
    newState,
    outputMessage: `Switched to branch '${target}'`,
    success: true
  };
}

/**
 * Adds any files listed in a commit's files array that are not yet present
 * in the working fileSystem. Used by both fast-forward merge and git pull.
 *
 * @param {Object} newState  - Mutable cloned state
 * @param {string} commitId  - ID of the commit whose files should be synced
 */
function syncFilesFromCommit(newState, commitId) {
  const commit = (newState.git.commits || []).find(c => c.id === commitId);
  if (!commit || !Array.isArray(commit.files)) return;
  for (const fileName of commit.files) {
    const existing = newState.fileSystem.find(f => f.name === fileName);
    if (!existing) {
      newState.fileSystem.push({
        name: fileName,
        type: 'file',
        status: 'tracked_unmodified',
        content: ''
      });
    }
  }
}

/**
 * Handler for 'git merge <branch>'.
 * Simulates a merge (fast-forward or basic merge commit).
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitMerge(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (args.length < 3) {
    return {
      newState,
      outputMessage: 'fatal: No commit specified and merge.default unspecified.',
      success: false
    };
  }

  const targetBranch = args[2];
  if (!newState.git.branches || newState.git.branches[targetBranch] === undefined) {
    return {
      newState,
      outputMessage: `merge: ${targetBranch} - not something we can merge`,
      success: false
    };
  }

  const currentBranch = newState.git.head || 'main';
  if (targetBranch === currentBranch) {
    return {
      newState,
      outputMessage: 'Already up to date.',
      success: true
    };
  }

  const targetCommitId = newState.git.branches[targetBranch];
  const currentCommitId = newState.git.branches[currentBranch];

  if (!targetCommitId) {
    return {
      newState,
      outputMessage: 'Already up to date.',
      success: true
    };
  }

  if (targetCommitId === currentCommitId) {
    return {
      newState,
      outputMessage: 'Already up to date.',
      success: true
    };
  }

  // Fast-forward check: is currentCommitId an ancestor of targetCommitId or null?
  const commitMap = new Map((newState.git.commits || []).map(c => [c.id, c]));
  let isFastForward = !currentCommitId;
  if (currentCommitId) {
    let curr = commitMap.get(targetCommitId);
    while (curr) {
      if (curr.parent === currentCommitId) {
        isFastForward = true;
        break;
      }
      curr = curr.parent ? commitMap.get(curr.parent) : null;
    }
  }

  const targetCommit = commitMap.get(targetCommitId);

  if (isFastForward) {
    newState.git.branches[currentBranch] = targetCommitId;
    syncFilesFromCommit(newState, targetCommitId);
    return {
      newState,
      outputMessage: `Updating ${currentCommitId || '0000000'}..${targetCommitId}\nFast-forward`,
      success: true
    };
  }

  // 3-way Merge Commit
  if (newState.git.commits.length >= SANDBOX_LIMITS.MAX_COMMITS) {
    return {
      newState,
      outputMessage: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_COMMITS} commits allowed.`,
      success: false
    };
  }

  const currentCommit = commitMap.get(currentCommitId);
  const currentFiles = currentCommit && Array.isArray(currentCommit.files) ? currentCommit.files : [];
  const targetFiles = targetCommit && Array.isArray(targetCommit.files) ? targetCommit.files : [];
  const mergedFiles = Array.from(new Set([...currentFiles, ...targetFiles]));

  let idNumber = newState.git.commits.length + 1;
  let mergeId = `c${idNumber}`;
  while (newState.git.commits.some(c => c.id === mergeId)) {
    idNumber++;
    mergeId = `c${idNumber}`;
  }

  const mergeCommit = {
    id: mergeId,
    parent: currentCommitId,
    message: `Merge branch '${targetBranch}' into ${currentBranch}`,
    files: mergedFiles,
    timestamp: new Date().toISOString()
  };

  newState.git.commits.push(mergeCommit);
  newState.git.branches[currentBranch] = mergeId;

  // Add merged files to working directory if not present
  for (const fileName of mergedFiles) {
    const existing = newState.fileSystem.find(f => f.name === fileName);
    if (!existing) {
      newState.fileSystem.push({
        name: fileName,
        type: 'file',
        status: 'tracked_unmodified',
        content: ''
      });
    }
  }

  return {
    newState,
    outputMessage: "Merge made by the 'ort' strategy.",
    success: true
  };
}

/**
 * Handler for 'git remote add <name> <url>' and 'git remote [-v]'.
 * Sets state.git.remote.url.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitRemote(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (!newState.git.remote) {
    newState.git.remote = {
      url: null,
      branches: {},
      aheadBehind: { ahead: 0, behind: 0 }
    };
  }

  // git remote
  if (args.length === 2) {
    return {
      newState,
      outputMessage: newState.git.remote.url ? (newState.git.remote.name || 'origin') : '',
      success: true
    };
  }

  // git remote -v
  if (args[2] === '-v') {
    if (!newState.git.remote.url) {
      return {
        newState,
        outputMessage: '',
        success: true
      };
    }
    const rName = newState.git.remote.name || 'origin';
    const rUrl = newState.git.remote.url;
    return {
      newState,
      outputMessage: `${rName}\t${rUrl} (fetch)\n${rName}\t${rUrl} (push)`,
      success: true
    };
  }

  // git remote add <name> <url>
  if (args[2] === 'add') {
    const name = args[3];
    const url = args[4];
    if (!name || !url) {
      return {
        newState,
        outputMessage: 'usage: git remote add <name> <url>',
        success: false
      };
    }
    if (newState.git.remote.url && (newState.git.remote.name === name || !newState.git.remote.name)) {
      return {
        newState,
        outputMessage: `error: remote ${name} already exists.`,
        success: false
      };
    }
    newState.git.remote.name = name;
    newState.git.remote.url = url;
    if (!newState.git.remote.branches) {
      newState.git.remote.branches = {};
    }
    if (!newState.git.remote.aheadBehind) {
      newState.git.remote.aheadBehind = { ahead: 0, behind: 0 };
    }
    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  return {
    newState,
    outputMessage: 'usage: git remote [-v | add <name> <url>]',
    success: false
  };
}

/**
 * Handler for 'git push'.
 * Copies local HEAD commit to state.git.remote.branches and clears ahead count.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitPush(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (!newState.git.remote || !newState.git.remote.url) {
    return {
      newState,
      outputMessage: 'fatal: No configured push destination. Either specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>',
      success: false
    };
  }

  const branch = newState.git.head || 'main';
  const headCommitId = newState.git.branches ? newState.git.branches[branch] : null;

  if (!headCommitId) {
    return {
      newState,
      outputMessage: `error: src refspec ${branch} does not match any`,
      success: false
    };
  }

  if (!newState.git.remote.branches) {
    newState.git.remote.branches = {};
  }
  newState.git.remote.branches[branch] = headCommitId;

  if (!newState.git.remote.aheadBehind) {
    newState.git.remote.aheadBehind = { ahead: 0, behind: 0 };
  }
  newState.git.remote.aheadBehind.ahead = 0;

  return {
    newState,
    outputMessage: `To ${newState.git.remote.url}\n   ${branch} -> ${branch}`,
    success: true
  };
}

/**
 * Handler for 'git fetch'.
 * Simulates updating remote tracking (adjusts aheadBehind).
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitFetch(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (!newState.git.remote || !newState.git.remote.url) {
    return {
      newState,
      outputMessage: "fatal: 'origin' does not appear to be a git repository",
      success: false
    };
  }

  const branch = newState.git.head || 'main';
  const rUrl = newState.git.remote.url;

  return {
    newState,
    outputMessage: `From ${rUrl}\n * [new branch]      ${branch}     -> origin/${branch}`,
    success: true
  };
}

/**
 * Handler for 'git pull'.
 * Simulates fetch + merge into local active branch.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitPull(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (!newState.git.remote || !newState.git.remote.url) {
    return {
      newState,
      outputMessage: 'fatal: No remote repository specified.',
      success: false
    };
  }

  const branch = newState.git.head || 'main';
  const localCommitId = newState.git.branches ? newState.git.branches[branch] : null;
  const remoteCommitId = newState.git.remote.branches ? newState.git.remote.branches[branch] : null;

  if (!newState.git.remote.aheadBehind) {
    newState.git.remote.aheadBehind = { ahead: 0, behind: 0 };
  }

  if (remoteCommitId && remoteCommitId !== localCommitId) {
    if (!newState.git.branches) {
      newState.git.branches = {};
    }
    newState.git.branches[branch] = remoteCommitId;
    newState.git.remote.aheadBehind.ahead = 0;
    newState.git.remote.aheadBehind.behind = 0;

    // Sync fileSystem: add any files from the pulled commit that are missing locally
    syncFilesFromCommit(newState, remoteCommitId);

    return {
      newState,
      outputMessage: `Updating ${localCommitId || '0000000'}..${remoteCommitId}\nFast-forward`,
      success: true
    };
  }

  newState.git.remote.aheadBehind.behind = 0;
  return {
    newState,
    outputMessage: 'Already up to date.',
    success: true
  };
}

/**
 * Handler for 'git clone <url>'.
 * Initializes a fresh simulated state as if pulled from a remote.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitClone(newState, args) {
  if (args.length < 3) {
    return {
      newState,
      outputMessage: 'fatal: You must specify a repository to clone.',
      success: false
    };
  }

  const url = args[2];
  const repoName = url.split('/').pop().replace(/\.git$/, '') || 'repo';

  const clonedState = {
    cwd: '/',
    fileSystem: [
      { name: "index.html", type: "file", status: "tracked_unmodified", content: "<h1>Welcome to My Website</h1>" },
      { name: "style.css", type: "file", status: "tracked_unmodified", content: "body { font-family: sans-serif; margin: 0; }" },
      { name: "app.js", type: "file", status: "tracked_unmodified", content: "console.log('App ready');" }
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
        url: url,
        name: "origin",
        branches: { main: "c1" },
        aheadBehind: { ahead: 0, behind: 0 }
      }
    }
  };

  return {
    newState: clonedState,
    outputMessage: `Cloning into '${repoName}'...\nremote: Enumerating objects: 3, done.\nremote: Total 3 (delta 0), reused 0 (delta 0)\nReceiving objects: 100% (3/3), done.`,
    success: true
  };
}

/**
 * Handler for 'git restore <file>' and 'git restore --staged <file>'.
 * Reverts file in working directory or removes file from staging area.
 *
 * @param {Object} newState
 * @param {Array<string>} args
 * @returns {{ newState: Object, outputMessage: string, success: boolean }}
 */
function handleGitRestore(newState, args) {
  if (!newState.git.initialized) {
    return {
      newState,
      outputMessage: 'fatal: not a git repository (or any of the parent directories): .git',
      success: false
    };
  }

  if (args.length < 3) {
    return {
      newState,
      outputMessage: 'fatal: you must specify path(s) to restore',
      success: false
    };
  }

  const branch = newState.git.head || 'main';
  const headCommitId = newState.git.branches ? newState.git.branches[branch] : null;
  const headCommit = (newState.git.commits || []).find(c => c.id === headCommitId);
  const committedFiles = headCommit && Array.isArray(headCommit.files) ? headCommit.files : [];

  // git restore --staged <file>
  if (args[2] === '--staged' || args[2] === '-S') {
    const targets = args.slice(3);
    if (targets.length === 0) {
      return {
        newState,
        outputMessage: 'fatal: you must specify path(s) to restore',
        success: false
      };
    }

    if (!Array.isArray(newState.git.stagingArea)) {
      newState.git.stagingArea = [];
    }

    if (targets.includes('.')) {
      const unstageList = [...newState.git.stagingArea];
      newState.git.stagingArea = [];
      for (const file of newState.fileSystem) {
        if (unstageList.includes(file.name)) {
          file.status = committedFiles.includes(file.name) ? 'modified' : 'untracked';
        }
      }
      return {
        newState,
        outputMessage: '',
        success: true
      };
    }

    for (const target of targets) {
      const index = newState.git.stagingArea.indexOf(target);
      if (index === -1) {
        return {
          newState,
          outputMessage: `error: pathspec '${target}' did not match any file(s) known to git`,
          success: false
        };
      }
      newState.git.stagingArea.splice(index, 1);
      const file = newState.fileSystem.find(f => f.name === target);
      if (file) {
        file.status = committedFiles.includes(file.name) ? 'modified' : 'untracked';
      }
    }

    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  // git restore <file>
  const targets = args.slice(2);
  if (targets.includes('.')) {
    for (const file of newState.fileSystem) {
      if (committedFiles.includes(file.name)) {
        file.status = 'tracked_unmodified';
      }
    }
    return {
      newState,
      outputMessage: '',
      success: true
    };
  }

  for (const target of targets) {
    const file = newState.fileSystem.find(f => f.name === target);
    if (!file || !committedFiles.includes(target)) {
      return {
        newState,
        outputMessage: `error: pathspec '${target}' did not match any file(s) known to git`,
        success: false
      };
    }
    file.status = 'tracked_unmodified';
  }

  return {
    newState,
    outputMessage: '',
    success: true
  };
}

// =============================================================================
// Global & Module Exports
// =============================================================================

// Single consolidated export object for both browser and CommonJS environments
const _GitEngineExports = {
  parseCommand,
  executeCommand,
  editFileContent,
  handleCat,
  SANDBOX_LIMITS,
  WHITELIST_PRIMARY,
  WHITELIST_GIT_SUBCOMMANDS,
  REJECTION_MESSAGE
};

// Attach to browser global scope
if (typeof window !== 'undefined') {
  window.GitEngine = _GitEngineExports;
  // Convenience aliases so lab.js can call window.executeCommand / window.editFileContent directly
  window.parseCommand = parseCommand;
  window.executeCommand = executeCommand;
  window.editFileContent = editFileContent;
  window.handleCat = handleCat;
}

// Support CommonJS/Node modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = _GitEngineExports;
  module.exports.GitEngine = _GitEngineExports;
}


