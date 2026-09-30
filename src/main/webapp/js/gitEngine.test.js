/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Git Engine Test Suite
 * Extracted from gitEngine.js (item 7 cleanup).
 * Run with: node gitEngine.test.js
 * =============================================================================
 */

'use strict';

const {
  executeCommand,
  editFileContent,
  safeCloneState,
  SANDBOX_LIMITS,
  REJECTION_MESSAGE
} = (() => {
  // gitEngine.js exports via module.exports = _GitEngineExports
  const engine = require('./gitEngine');
  // safeCloneState is an internal helper; expose it via a thin wrapper here
  // since the engine already uses JSON-clone internally, replicate that.
  return {
    executeCommand: engine.executeCommand,
    editFileContent: engine.editFileContent,
    SANDBOX_LIMITS: engine.SANDBOX_LIMITS,
    REJECTION_MESSAGE: engine.REJECTION_MESSAGE,
    safeCloneState: (s) => JSON.parse(JSON.stringify(s || {}))
  };
})();

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

  // 21. cat Command
  const rCatSimple = executeCommand(state, 'cat index.html');
  assert('cat outputs file content', rCatSimple.success);

  state = executeCommand(state, 'touch empty.txt').newState;
  const rCatEmpty = executeCommand(state, 'cat empty.txt');
  assert('cat on empty file returns blank string', rCatEmpty.success && rCatEmpty.outputMessage === '');

  const rCatDir = executeCommand(dirState, 'cat src');
  assert('cat on directory returns Is a directory error', !rCatDir.success && rCatDir.outputMessage === 'cat: src: Is a directory');

  const rCatMissing = executeCommand(state, 'cat nonexistent.txt');
  assert('cat on missing file returns No such file or directory error', !rCatMissing.success && rCatMissing.outputMessage === 'cat: nonexistent.txt: No such file or directory');

  // 22. editFileContent & Sandbox Limit
  const originalStateSnap = JSON.stringify(state);
  const rEditSuccess = editFileContent(state, 'index.html', '<h1>Hello World</h1>');
  assert('editFileContent succeeds and preserves immutability', rEditSuccess.success && JSON.stringify(state) === originalStateSnap);
  assert('editFileContent updates file content', rEditSuccess.newState.fileSystem.find(f => f.name === 'index.html').content === '<h1>Hello World</h1>');
  assert('editFileContent changes tracked_unmodified status to modified', rEditSuccess.newState.fileSystem.find(f => f.name === 'index.html').status === 'modified');

  // Test editing untracked file does not change to modified
  const rEditUntracked = editFileContent(state, 'empty.txt', 'some content');
  assert('editFileContent on untracked file keeps status untracked', rEditUntracked.success && rEditUntracked.newState.fileSystem.find(f => f.name === 'empty.txt').status === 'untracked');

  // Test sandbox limit > 500 characters
  const longContent = 'a'.repeat(501);
  const rEditOverLimit = editFileContent(state, 'index.html', longContent);
  assert('editFileContent enforces 500-char sandbox limit', !rEditOverLimit.success && rEditOverLimit.outputMessage === 'Sandbox limit reached: File content cannot exceed 500 characters.' && rEditOverLimit.newState === state);

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;

  return {
    total: tests.length,
    passed,
    failed,
    results: tests
  };
}

// Entry point: run tests when executed directly with Node
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

module.exports = { runTests };
