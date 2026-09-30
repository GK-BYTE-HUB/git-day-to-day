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
  MAX_BRANCHES: 5
};

const WHITELIST_PRIMARY = ['git', 'mkdir', 'touch', 'ls', 'clear', 'rm', 'cd'];

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

    case 'clear':
      result = {
        newState,
        outputMessage: '',
        success: true
      };
      break;

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
function finishExecution(newState, outputMessage, success) {
  const finalResult = {
    newState,
    outputMessage,
    success
  };

  // Reactivity: dispatch stateChanged on window if in browser environment
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const event = new CustomEvent('stateChanged', {
        detail: newState
      });
      window.dispatchEvent(event);
    } catch (e) {
      if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('stateChanged', false, false, newState);
        window.dispatchEvent(evt);
      }
    }
  }

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
    const idx = newState.fileSystem.findIndex(item => item.name === target);
    if (idx === -1) {
      return {
        newState,
        outputMessage: `rm: cannot remove '${target}': No such file or directory`,
        success: false
      };
    }
    newState.fileSystem.splice(idx, 1);
    if (Array.isArray(newState.git.stagingArea)) {
      const sIdx = newState.git.stagingArea.indexOf(target);
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
    const file = (newState.fileSystem || []).find(item => item.name === target && item.type !== 'directory');
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

  if (newState.git.commits.length >= SANDBOX_LIMITS.MAX_COMMITS) {
    return {
      newState,
      outputMessage: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_COMMITS} commits allowed.`,
      success: false
    };
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

  // Update ahead count if remote configured
  if (newState.git.remote && typeof newState.git.remote === 'object') {
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
  const history = [];
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

  if (Object.keys(newState.git.branches).length >= SANDBOX_LIMITS.MAX_BRANCHES) {
    return {
      newState,
      outputMessage: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_BRANCHES} branches allowed.`,
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
    if (Object.keys(newState.git.branches).length >= SANDBOX_LIMITS.MAX_BRANCHES) {
      return {
        newState,
        outputMessage: `Sandbox limit reached: Maximum of ${SANDBOX_LIMITS.MAX_BRANCHES} branches allowed.`,
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
    if (targetCommit && Array.isArray(targetCommit.files)) {
      for (const fileName of targetCommit.files) {
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
// Test Suite Block
// =============================================================================

/**
 * Runs automated verification tests against the Git Engine commands and limits.
 *
 * @returns {{ total: number, passed: number, failed: number, results: Array<{ name: string, passed: boolean, error?: string }> }}
 */
function runTests() {
  const tests = [];

  function assert(name, condition, message) {
    if (!condition) {
      tests.push({ name, passed: false, error: message || 'Assertion failed' });
    } else {
      tests.push({ name, passed: true });
    }
  }

  let state = {
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

  // 1. Whitelist Rejection
  const rReject = executeCommand(state, 'npm install express');
  assert('Whitelist Rejection for unknown command', !rReject.success && rReject.outputMessage === REJECTION_MESSAGE);

  const rGitReject = executeCommand(state, 'git rebase main');
  assert('Whitelist Rejection for unsupported git subcommand', !rGitReject.success && rGitReject.outputMessage === REJECTION_MESSAGE);

  // 2. Max folder depth limit
  const rDepth = executeCommand(state, 'mkdir dir1/dir2');
  assert('Max folder depth limit 1 on mkdir', !rDepth.success && rDepth.outputMessage.includes('Maximum folder depth is 1'));

  const rDepthTouch = executeCommand(state, 'touch dir1/dir2/file.txt');
  assert('Max folder depth limit 1 on touch', !rDepthTouch.success && rDepthTouch.outputMessage.includes('Maximum folder depth is 1'));

  // 3. git init
  const rInit = executeCommand(state, 'git init');
  assert('git init creates repository', rInit.success && rInit.newState.git.initialized);
  state = rInit.newState;

  // 4. Max 10 files limit
  let tempState = safeCloneState(state);
  for (let i = 1; i <= 10; i++) {
    tempState = executeCommand(tempState, `touch file${i}.txt`).newState;
  }
  const rOverFiles = executeCommand(tempState, 'touch file11.txt');
  assert('Max 10 files limit enforced', !rOverFiles.success && rOverFiles.outputMessage.includes('Maximum of 10 files allowed'));

  // 5. touch & git status
  const rTouch = executeCommand(state, 'touch index.html style.css');
  state = rTouch.newState;
  const rStatus1 = executeCommand(state, 'git status');
  assert('git status reports untracked files', rStatus1.success && rStatus1.outputMessage.includes('index.html') && rStatus1.outputMessage.includes('Untracked files'));

  // 6. git add
  const rAdd = executeCommand(state, 'git add index.html');
  state = rAdd.newState;
  assert('git add moves file to stagingArea', state.git.stagingArea.includes('index.html'));

  const rStatus2 = executeCommand(state, 'git status');
  assert('git status reports staged files', rStatus2.outputMessage.includes('Changes to be committed') && rStatus2.outputMessage.includes('index.html'));

  // 7. git restore --staged
  const rUnstage = executeCommand(state, 'git restore --staged index.html');
  assert('git restore --staged unstages file', rUnstage.success && rUnstage.newState.git.stagingArea.length === 0);

  // Re-stage both files
  state = executeCommand(state, 'git add .').newState;
  assert('git add . stages all files', state.git.stagingArea.length === 2);

  // 8. git commit
  const rCommit = executeCommand(state, 'git commit -m "Initial commit"');
  assert('git commit creates commit and clears stagingArea', rCommit.success && rCommit.newState.git.commits.length === 1 && rCommit.newState.git.stagingArea.length === 0);
  state = rCommit.newState;

  // 9. git log
  const rLog = executeCommand(state, 'git log');
  assert('git log outputs commit history', rLog.success && rLog.outputMessage.includes('Initial commit'));

  const rLogOne = executeCommand(state, 'git log --oneline');
  assert('git log --oneline outputs compact commit', rLogOne.success && rLogOne.outputMessage.includes('Initial commit'));

  // 10. git branch
  const rBranch = executeCommand(state, 'git branch feature');
  assert('git branch creates new branch', rBranch.success && rBranch.newState.git.branches.feature === 'c1');
  state = rBranch.newState;

  // Max 5 branches limit
  let branchState = safeCloneState(state);
  branchState = executeCommand(branchState, 'git branch b1').newState;
  branchState = executeCommand(branchState, 'git branch b2').newState;
  branchState = executeCommand(branchState, 'git branch b3').newState;
  const rOverBranch = executeCommand(branchState, 'git branch b4');
  assert('Max 5 branches limit enforced', !rOverBranch.success && rOverBranch.outputMessage.includes('Maximum of 5 branches allowed'));

  // 11. git switch
  const rSwitch = executeCommand(state, 'git switch feature');
  assert('git switch changes head branch', rSwitch.success && rSwitch.newState.git.head === 'feature');
  state = rSwitch.newState;

  // Add commit on feature branch
  state = executeCommand(state, 'touch feature.js').newState;
  state = executeCommand(state, 'git add feature.js').newState;
  state = executeCommand(state, 'git commit -m "Feature commit"').newState;

  // 12. git merge
  state = executeCommand(state, 'git switch main').newState;
  const rMerge = executeCommand(state, 'git merge feature');
  assert('git merge fast-forwards feature into main', rMerge.success && rMerge.newState.git.branches.main === 'c2');
  state = rMerge.newState;

  // 13. Max 15 commits limit
  let commitState = safeCloneState(state);
  for (let i = commitState.git.commits.length + 1; i <= 15; i++) {
    commitState.git.stagingArea = ['index.html'];
    commitState = executeCommand(commitState, `git commit -m "Commit ${i}"`).newState;
  }
  commitState.git.stagingArea = ['index.html'];
  const rOverCommit = executeCommand(commitState, 'git commit -m "Commit 16"');
  assert('Max 15 commits limit enforced', !rOverCommit.success && rOverCommit.outputMessage.includes('Maximum of 15 commits allowed'));

  // 14. git remote add & git push
  const rRemote = executeCommand(state, 'git remote add origin https://github.com/example/repo.git');
  assert('git remote add sets remote url', rRemote.success && rRemote.newState.git.remote.url === 'https://github.com/example/repo.git');
  state = rRemote.newState;

  const rPush = executeCommand(state, 'git push');
  assert('git push copies HEAD to remote branches', rPush.success && rPush.newState.git.remote.branches.main === 'c2');
  state = rPush.newState;

  // 15. git fetch & git pull
  const rFetch = executeCommand(state, 'git fetch');
  assert('git fetch completes successfully', rFetch.success);

  const rPull = executeCommand(state, 'git pull');
  assert('git pull completes successfully', rPull.success);

  // 16. git restore
  const fileToMod = state.fileSystem.find(f => f.name === 'index.html');
  if (fileToMod) fileToMod.status = 'modified';
  const rRestore = executeCommand(state, 'git restore index.html');
  assert('git restore reverts file status to tracked_unmodified', rRestore.success && rRestore.newState.fileSystem.find(f => f.name === 'index.html').status === 'tracked_unmodified');

  // 17. git clone
  const rClone = executeCommand(state, 'git clone https://github.com/example/demo.git');
  assert('git clone returns fresh cloned state', rClone.success && rClone.newState.git.remote.url === 'https://github.com/example/demo.git' && rClone.newState.fileSystem.length === 3);

  // 18. Immutability
  const freezeCheckState = { fileSystem: [{ name: 'test.txt', type: 'file', status: 'untracked' }], git: { initialized: true, stagingArea: [], branches: { main: null }, head: 'main', commits: [] } };
  const snapshotBefore = JSON.stringify(freezeCheckState);
  executeCommand(freezeCheckState, 'git add test.txt');
  assert('State immutability strictly preserved', JSON.stringify(freezeCheckState) === snapshotBefore);

  // 19. Reactivity (CustomEvent stateChanged dispatch)
  let eventDispatched = false;
  let receivedDetail = null;
  const mockWindow = {
    dispatchEvent: function(event) {
      if (event && event.type === 'stateChanged') {
        eventDispatched = true;
        receivedDetail = event.detail;
      }
    }
  };
  const originalWindow = typeof global !== 'undefined' ? global.window : undefined;
  const originalCustomEvent = typeof global !== 'undefined' ? global.CustomEvent : undefined;
  try {
    if (typeof global !== 'undefined') {
      global.window = mockWindow;
      global.CustomEvent = class {
        constructor(type, options) {
          this.type = type;
          this.detail = options ? options.detail : null;
        }
      };
    }
    const rEvent = executeCommand(state, 'ls');
    assert('Reactivity dispatches stateChanged CustomEvent with newState', eventDispatched && receivedDetail === rEvent.newState);
  } finally {
    if (typeof global !== 'undefined') {
      global.window = originalWindow;
      global.CustomEvent = originalCustomEvent;
    }
  }

  // 20. Directory Traversal & Hierarchical File Operations
  let dirState = { cwd: '/', fileSystem: [], git: { initialized: true, stagingArea: [], branches: { main: null }, head: 'main', commits: [] } };
  dirState = executeCommand(dirState, 'mkdir src').newState;
  assert('mkdir src creates directory', dirState.fileSystem.some(f => f.name === 'src' && f.type === 'directory'));
  dirState = executeCommand(dirState, 'cd src').newState;
  assert('cd src updates cwd to /src/', dirState.cwd === '/src/');
  dirState = executeCommand(dirState, 'touch app.js').newState;
  assert('touch app.js inside /src/ prefixes path as src/app.js', dirState.fileSystem.some(f => f.name === 'src/app.js'));
  const rLsSub = executeCommand(dirState, 'ls');
  assert('ls inside /src/ only lists direct child app.js', rLsSub.outputMessage === 'app.js');
  dirState = executeCommand(dirState, 'cd ..').newState;
  assert('cd .. returns to root /', dirState.cwd === '/');
  const rLsRoot = executeCommand(dirState, 'ls');
  assert('ls at root only lists direct child src', rLsRoot.outputMessage === 'src');

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;

  return {
    total: tests.length,
    passed,
    failed,
    results: tests
  };
}

// =============================================================================
// Global & Module Exports
// =============================================================================

// Attach to browser global scope
if (typeof window !== 'undefined') {
  window.parseCommand = parseCommand;
  window.executeCommand = executeCommand;
  window.GitEngine = {
    parseCommand,
    executeCommand,
    runTests,
    SANDBOX_LIMITS,
    WHITELIST_PRIMARY,
    WHITELIST_GIT_SUBCOMMANDS,
    REJECTION_MESSAGE
  };
}

// Support CommonJS/Node modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCommand,
    executeCommand,
    runTests,
    SANDBOX_LIMITS,
    WHITELIST_PRIMARY,
    WHITELIST_GIT_SUBCOMMANDS,
    REJECTION_MESSAGE,
    GitEngine: {
      parseCommand,
      executeCommand,
      runTests,
      SANDBOX_LIMITS,
      WHITELIST_PRIMARY,
      WHITELIST_GIT_SUBCOMMANDS,
      REJECTION_MESSAGE
    }
  };
}

// If executed directly with Node, run the test suite and output summary
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const testResults = runTests();
  console.log(`Git Engine Test Suite: ${testResults.passed}/${testResults.total} passed, ${testResults.failed} failed.`);
  for (const res of testResults.results) {
    if (res.passed) {
      console.log(`  PASS: ${res.name}`);
    } else {
      console.error(`  FAIL: ${res.name} -> ${res.error}`);
    }
  }
  if (testResults.failed > 0) {
    process.exit(1);
  }
}
