-- =============================================================================
-- Git Day-to-Day (GitD2D) - Database Schema and Seed Script
-- Phase 2: Schema definition and static content population
-- =============================================================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS scenarios;
DROP TABLE IF EXISTS mission_steps;
DROP TABLE IF EXISTS commands;

-- -----------------------------------------------------------------------------
-- 1. Table: commands
-- Stores definitions for the 20 whitelist commands across 4 modules.
-- -----------------------------------------------------------------------------
CREATE TABLE commands (
  id INT PRIMARY KEY AUTO_INCREMENT,
  module_no INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  tldr VARCHAR(255) NOT NULL,
  syntax TEXT NOT NULL,
  example TEXT NOT NULL,
  used_after VARCHAR(50),
  used_before VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. Table: mission_steps
-- Stores step-by-step instructions and expected terminal commands for 4 guided missions.
-- -----------------------------------------------------------------------------
CREATE TABLE mission_steps (
  id INT PRIMARY KEY AUTO_INCREMENT,
  mission_no INT NOT NULL,
  step_no INT NOT NULL,
  instruction TEXT NOT NULL,
  expected_commands TEXT NOT NULL   -- JSON array string, e.g. ["mkdir my-website"]
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. Table: scenarios
-- Stores the 6 real-world beginner troubleshooting scenarios and their initial simulator state.
-- -----------------------------------------------------------------------------
CREATE TABLE scenarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  the_mess TEXT NOT NULL,
  explanation TEXT NOT NULL,
  fix_steps TEXT NOT NULL,          -- JSON array of command strings
  lab_prefill_state TEXT NOT NULL   -- JSON snapshot loaded by the Lab sandbox
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- SEED DATA: 20 Whitelist Commands
-- =============================================================================

-- Module 1: Terminal & File Basics (6 commands)
INSERT INTO commands (module_no, name, tldr, syntax, example, used_after, used_before) VALUES
(1, 'mkdir', 'Creates a new directory (folder) in the current working location.', 'mkdir <directory_name>\nmkdir -p <path/to/directory>', 'mkdir my-website', NULL, 'cd'),
(1, 'cd', 'Changes the current working directory to navigate between folders.', 'cd <directory_path>\ncd ..\ncd ~', 'cd my-website', 'mkdir', 'touch'),
(1, 'touch', 'Creates a new empty file in the current working directory.', 'touch <file_name>\ntouch <file1> <file2>', 'touch index.html style.css', 'cd', 'ls'),
(1, 'ls', 'Lists all files and directories inside the current directory.', 'ls\nls -l\nls -a', 'ls -la', 'touch', 'clear'),
(1, 'rm', 'Deletes specified files permanently from the file system.', 'rm <file_name>\nrm -rf <directory_name>', 'rm style.css', 'ls', 'git status'),
(1, 'clear', 'Clears all prior output and commands from the active terminal screen.', 'clear', 'clear', 'ls', 'git init');

-- Module 2: Git Basics (5 commands)
INSERT INTO commands (module_no, name, tldr, syntax, example, used_after, used_before) VALUES
(2, 'git init', 'Initializes a brand new Git repository and creates the hidden .git directory.', 'git init\ngit init <directory_name>', 'git init', 'cd', 'git status'),
(2, 'git status', 'Displays the state of the working directory and the staging area.', 'git status\ngit status -s', 'git status', 'git init', 'git add'),
(2, 'git add', 'Stages file modifications from the working directory for the next commit snapshot.', 'git add <file_name>\ngit add .\ngit add -A', 'git add index.html', 'git status', 'git commit'),
(2, 'git commit', 'Takes a permanent snapshot of staged changes and records it to repository history.', 'git commit -m "<message>"\ngit commit -am "<message>"', 'git commit -m "Initial commit"', 'git add', 'git push'),
(2, 'git log', 'Displays chronological history of commits with their hashes, authors, and messages.', 'git log\ngit log --oneline\ngit log -n <limit>', 'git log --oneline', 'git commit', 'git branch');

-- Module 3: Branching & Merging (3 commands)
INSERT INTO commands (module_no, name, tldr, syntax, example, used_after, used_before) VALUES
(3, 'git branch', 'Lists, creates, or deletes branches to manage parallel development streams.', 'git branch\ngit branch <branch_name>\ngit branch -d <branch_name>', 'git branch dark-mode', 'git commit', 'git switch'),
(3, 'git switch', 'Switches between branches to work on different features (modern alternative to git checkout).', 'git switch <branch_name>\ngit switch -c <new_branch_name>', 'git switch dark-mode', 'git branch', 'git merge'),
(3, 'git merge', 'Integrates changes from a target feature branch into your active branch.', 'git merge <branch_name>\ngit merge --abort', 'git merge dark-mode', 'git switch', 'git push');

-- Module 4: Remotes & Undoing (6 commands)
INSERT INTO commands (module_no, name, tldr, syntax, example, used_after, used_before) VALUES
(4, 'git clone', 'Copies an existing remote repository onto your local machine with full commit history.', 'git clone <repository_url>\ngit clone <repository_url> <directory>', 'git clone https://github.com/example/repo.git', NULL, 'cd'),
(4, 'git remote', 'Manages tracked connections to remote repositories hosted on platforms like GitHub.', 'git remote -v\ngit remote add <name> <url>\ngit remote remove <name>', 'git remote add origin https://github.com/example/repo.git', 'git init', 'git push'),
(4, 'git push', 'Uploads local committed snapshots to a remote repository branch.', 'git push\ngit push -u <remote> <branch>\ngit push origin <branch>', 'git push -u origin main', 'git commit', 'git pull'),
(4, 'git pull', 'Fetches updates from a remote repository and merges them directly into your current branch.', 'git pull\ngit pull <remote> <branch>', 'git pull origin main', 'git remote', 'git push'),
(4, 'git fetch', 'Downloads commits and branches from the remote without merging them into your local work.', 'git fetch\ngit fetch <remote>', 'git fetch origin', 'git remote', 'git merge'),
(4, 'git restore', 'Restores working directory files from the last commit or unstages staged modifications.', 'git restore <file>\ngit restore --staged <file>', 'git restore index.html', 'git status', 'git commit');

-- =============================================================================
-- SEED DATA: 4 Guided Missions (mission_steps)
-- =============================================================================

-- Mission 1: Workspace Setup (Terminal Basics)
INSERT INTO mission_steps (mission_no, step_no, instruction, expected_commands) VALUES
(1, 1, 'Create a new directory called "my-website" for your project.', '["mkdir my-website"]'),
(1, 2, 'Move into your newly created "my-website" project directory.', '["cd my-website"]'),
(1, 3, 'Create your main webpage file named "index.html".', '["touch index.html"]'),
(1, 4, 'Create a stylesheet file named "style.css".', '["touch style.css"]'),
(1, 5, 'List the files in the directory to verify both files were created.', '["ls"]'),
(1, 6, 'Clear the terminal screen to declutter your workspace before initializing Git.', '["clear"]');

-- Mission 2: First Snapshot (Git Basics)
INSERT INTO mission_steps (mission_no, step_no, instruction, expected_commands) VALUES
(2, 1, 'Turn this directory into a Git repository by initializing it.', '["git init"]'),
(2, 2, 'Check the repository status to see which files are untracked.', '["git status"]'),
(2, 3, 'Move all files to the Staging Area so they are ready to be saved.', '["git add .", "git add -A", "git add index.html style.css"]'),
(2, 4, 'Save this state to your Git history with the message "Initial commit".', '["git commit -m \\"Initial commit\\"", "git commit -m \\"initial commit\\""]'),
(2, 5, 'View your commit history to verify your first snapshot was saved.', '["git log", "git log --oneline"]');

-- Mission 3: Parallel Universe (Branching & Merging)
INSERT INTO mission_steps (mission_no, step_no, instruction, expected_commands) VALUES
(3, 1, 'Create a new feature branch called "dark-mode" to work safely.', '["git branch dark-mode"]'),
(3, 2, 'Switch over to your newly created "dark-mode" branch.', '["git switch dark-mode", "git checkout dark-mode"]'),
(3, 3, 'Create a new JavaScript file called "dark.js" for the feature.', '["touch dark.js"]'),
(3, 4, 'Move the new "dark.js" file to the Staging Area.', '["git add dark.js", "git add ."]'),
(3, 5, 'Commit your feature changes with the message "Add dark mode script".', '["git commit -m \\"Add dark mode script\\"", "git commit -m \\"add dark mode script\\"", "git commit -m \\"add dark mode\\""]'),
(3, 6, 'Switch back to the "main" branch before integrating changes.', '["git switch main", "git checkout main"]'),
(3, 7, 'Merge the "dark-mode" branch into "main" to combine your code.', '["git merge dark-mode"]');

-- Mission 4: Connecting & Undoing (Remotes & Undoing)
INSERT INTO mission_steps (mission_no, step_no, instruction, expected_commands) VALUES
(4, 1, 'Link your local repository to a remote GitHub URL "https://github.com/example/repo.git".', '["git remote add origin https://github.com/example/repo.git"]'),
(4, 2, 'Push your local main branch commits to the remote repository.', '["git push", "git push origin main", "git push -u origin main"]'),
(4, 3, 'Clone a preview copy of the repository from the remote URL to simulate a teammate workflow.', '["git clone https://github.com/example/repo.git"]'),
(4, 4, 'Fetch remote changes to simulate inspecting new commits before merging.', '["git fetch", "git fetch origin"]'),
(4, 5, 'An accidental edit occurred! Check repository status to see modified files.', '["git status"]'),
(4, 6, 'Discard the accidental working changes and restore "index.html" back to the last commit state.', '["git restore index.html"]');

-- =============================================================================
-- SEED DATA: 6 Real-World Scenarios
-- =============================================================================

INSERT INTO scenarios (id, title, the_mess, explanation, fix_steps, lab_prefill_state) VALUES
(
  1,
  'I staged a file I didn''t mean to.',
  'You ran git add . and accidentally included a massive secret file or credential file in the staging area.',
  'Git stages files to prepare them for the next snapshot. You can safely unstage any file without losing your local hard-drive changes using git restore --staged.',
  '["git restore --staged secret.txt"]',
  '{"fileSystem":[{"name":"index.html","status":"tracked_unmodified","content":"<h1>My Portfolio</h1>"},{"name":"secret.txt","status":"staged_new","content":"API_KEY=super_secret_token_12345"}],"git":{"initialized":true,"stagingArea":["secret.txt"],"branches":{"main":"commit-1"},"head":"main","commits":[{"id":"commit-1","parent":null,"message":"Initial commit","files":["index.html"]}],"remote":{"url":"https://github.com/example/repo.git","branches":{"main":"commit-1"},"aheadBehind":{"ahead":0,"behind":0}}}}'
),
(
  2,
  'I messed up my code and want to go back to my last commit.',
  'You tried refactoring, broke working functionality, and haven''t staged or committed your changes yet.',
  'When you have not yet staged or committed messy edits, git restore allows you to discard uncommitted working directory changes and revert the file back to the clean version saved in your last commit.',
  '["git restore index.html"]',
  '{"fileSystem":[{"name":"index.html","status":"tracked_modified","content":"<h1>BROKEN SYNTAX ERROR</h1>"},{"name":"style.css","status":"tracked_unmodified","content":"body { margin: 0; }"}],"git":{"initialized":true,"stagingArea":[],"branches":{"main":"commit-1"},"head":"main","commits":[{"id":"commit-1","parent":null,"message":"Initial commit","files":["index.html","style.css"]}],"remote":{"url":"https://github.com/example/repo.git","branches":{"main":"commit-1"},"aheadBehind":{"ahead":0,"behind":0}}}}'
),
(
  3,
  'I started typing code on main, but meant to make a feature branch.',
  'You forgot to create a new branch before starting to work on a new feature, and you currently have uncommitted edits on main.',
  'As long as you have not committed your changes yet, creating and switching to a new branch will carry your uncommitted working directory modifications along with you safely.',
  '["git branch feature-login", "git switch feature-login"]',
  '{"fileSystem":[{"name":"login.js","status":"untracked","content":"function handleLogin() { console.log(\'logging in\'); }"},{"name":"index.html","status":"tracked_unmodified","content":"<h1>App</h1>"}],"git":{"initialized":true,"stagingArea":[],"branches":{"main":"commit-1"},"head":"main","commits":[{"id":"commit-1","parent":null,"message":"Initial commit","files":["index.html"]}],"remote":{"url":"https://github.com/example/repo.git","branches":{"main":"commit-1"},"aheadBehind":{"ahead":0,"behind":0}}}}'
),
(
  4,
  'I got a Merge Conflict!',
  'You ran git merge and Git halted because both the active branch and target branch modified the exact same line of code in app.js.',
  'Git cannot automatically decide which version of conflicting lines to keep. It inserts conflict markers (<<<<<<<, =======, >>>>>>>) into the file and pauses so you can manually select the correct code, stage the resolution, and commit.',
  '["git status", "resolve conflict markers manually", "git add app.js", "git commit -m \\"resolved conflict\\""]',
  '{"fileSystem":[{"name":"app.js","status":"conflicted","content":"<<<<<<< HEAD\\nconst theme = \\"dark\\";\\n=======\\nconst theme = \\"light\\";\\n>>>>>>> feature-theme"}],"git":{"initialized":true,"stagingArea":[],"branches":{"main":"commit-2","feature-theme":"commit-3"},"head":"main","commits":[{"id":"commit-1","parent":null,"message":"Initial setup","files":["app.js"]},{"id":"commit-2","parent":"commit-1","message":"Set dark theme on main","files":["app.js"]},{"id":"commit-3","parent":"commit-1","message":"Set light theme on branch","files":["app.js"]}],"remote":{"url":"https://github.com/example/repo.git","branches":{"main":"commit-2"},"aheadBehind":{"ahead":0,"behind":0}}}}'
),
(
  5,
  'My push was rejected.',
  'You ran git push and Git rejected it because the remote contains new commits that you do not yet have in your local repository.',
  'When a collaborator pushes changes to GitHub while you are working, your branch falls behind. You must fetch and integrate their commits using git pull before Git allows you to push your local snapshots.',
  '["git pull", "git push"]',
  '{"fileSystem":[{"name":"index.html","status":"tracked_unmodified","content":"<h1>Collaborative App</h1>"}],"git":{"initialized":true,"stagingArea":[],"branches":{"main":"commit-2"},"head":"main","commits":[{"id":"commit-1","parent":null,"message":"Initial commit","files":["index.html"]},{"id":"commit-2","parent":"commit-1","message":"Update landing page","files":["index.html"]}],"remote":{"url":"https://github.com/example/repo.git","branches":{"main":"commit-remote-2"},"aheadBehind":{"ahead":1,"behind":1}}}}'
),
(
  6,
  'I am completely lost.',
  'You typed a series of commands, your terminal is flooded with output, and you don''t know what files are modified, staged, or committed.',
  'When disorientation strikes, use the developer compass: clear the cluttered terminal screen, run git status to inspect your working directory and staging area, and run git log to inspect recent commit history.',
  '["clear", "git status", "git log"]',
  '{"fileSystem":[{"name":"index.html","status":"tracked_modified","content":"<h1>Work in progress...</h1>"},{"name":"style.css","status":"staged_new","content":"body { background: #f4f4f0; }"}],"git":{"initialized":true,"stagingArea":["style.css"],"branches":{"main":"commit-1"},"head":"main","commits":[{"id":"commit-1","parent":null,"message":"Initial commit","files":["index.html"]}],"remote":{"url":"https://github.com/example/repo.git","branches":{"main":"commit-1"},"aheadBehind":{"ahead":0,"behind":0}}}}'
);
