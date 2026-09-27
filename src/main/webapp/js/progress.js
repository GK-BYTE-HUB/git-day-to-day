/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Centralized Progress Manager
 * Phase 4, Step 7: Progress Tracking via localStorage
 * =============================================================================
 */

const DEFAULT_PROGRESS = {
  gitProgress: {
    commandsPracticed: [],
    missionsCompleted: [],
    currentMission: 1,
    scenariosViewed: []
  }
};

/**
 * Creates a clean deep copy of a JavaScript object.
 * @param {*} obj
 * @returns {*}
 */
function cloneProgress(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Retrieves the current gitProgress object from localStorage.
 * If null, corrupted, or missing keys, initializes and stores DEFAULT_PROGRESS.gitProgress.
 *
 * @returns {Object} The user's active progress object
 */
function getProgress() {
  try {
    const raw = localStorage.getItem('gitProgress');
    if (!raw) {
      const defaultState = cloneProgress(DEFAULT_PROGRESS.gitProgress);
      localStorage.setItem('gitProgress', JSON.stringify(defaultState));
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      const defaultState = cloneProgress(DEFAULT_PROGRESS.gitProgress);
      localStorage.setItem('gitProgress', JSON.stringify(defaultState));
      return defaultState;
    }

    // Ensure all required fields exist
    const sanitized = {
      commandsPracticed: Array.isArray(parsed.commandsPracticed) ? parsed.commandsPracticed : [],
      missionsCompleted: Array.isArray(parsed.missionsCompleted) ? parsed.missionsCompleted : [],
      currentMission: typeof parsed.currentMission === 'number' ? parsed.currentMission : 1,
      scenariosViewed: Array.isArray(parsed.scenariosViewed) ? parsed.scenariosViewed : []
    };

    return sanitized;
  } catch (err) {
    console.warn('Failed to read gitProgress from localStorage, resetting to default:', err);
    const defaultState = cloneProgress(DEFAULT_PROGRESS.gitProgress);
    try {
      localStorage.setItem('gitProgress', JSON.stringify(defaultState));
    } catch (e) {
      console.error('localStorage is not writable:', e);
    }
    return defaultState;
  }
}

/**
 * Validates and serializes the given progress object into localStorage.
 * Dispatches a 'progressChanged' CustomEvent for real-time UI synchronization.
 *
 * @param {Object} updatedObj The updated progress object
 * @returns {Object} The saved progress object
 */
function saveProgress(updatedObj) {
  if (!updatedObj || typeof updatedObj !== 'object') {
    throw new Error('saveProgress requires a valid progress object');
  }

  // Handle case where caller passes { gitProgress: { ... } } instead of inner object
  const target = updatedObj.gitProgress ? updatedObj.gitProgress : updatedObj;

  const sanitized = {
    commandsPracticed: Array.isArray(target.commandsPracticed) ? Array.from(new Set(target.commandsPracticed)) : [],
    missionsCompleted: Array.isArray(target.missionsCompleted) ? Array.from(new Set(target.missionsCompleted)) : [],
    currentMission: typeof target.currentMission === 'number' ? target.currentMission : 1,
    scenariosViewed: Array.isArray(target.scenariosViewed) ? Array.from(new Set(target.scenariosViewed)) : []
  };

  try {
    localStorage.setItem('gitProgress', JSON.stringify(sanitized));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('progressChanged', { detail: sanitized }));
    }
  } catch (err) {
    console.error('Failed to write gitProgress to localStorage:', err);
  }

  return sanitized;
}

/**
 * Convenience helper to record a practiced command without duplicates.
 * @param {string} commandName
 * @returns {Object} Updated progress
 */
function recordCommandPracticed(commandName) {
  if (!commandName || typeof commandName !== 'string') return getProgress();
  const current = getProgress();
  const normalized = commandName.trim();
  if (!current.commandsPracticed.includes(normalized)) {
    current.commandsPracticed.push(normalized);
    return saveProgress(current);
  }
  return current;
}

/**
 * Convenience helper to mark a mission as completed.
 * @param {number} missionNo
 * @returns {Object} Updated progress
 */
function recordMissionCompleted(missionNo) {
  const current = getProgress();
  const no = Number(missionNo);
  if (!current.missionsCompleted.includes(no)) {
    current.missionsCompleted.push(no);
  }
  if (current.currentMission <= no) {
    current.currentMission = Math.min(no + 1, 4);
  }
  return saveProgress(current);
}

/**
 * Convenience helper to record a viewed scenario.
 * @param {number} scenarioId
 * @returns {Object} Updated progress
 */
function recordScenarioViewed(scenarioId) {
  const current = getProgress();
  const id = Number(scenarioId);
  if (!current.scenariosViewed.includes(id)) {
    current.scenariosViewed.push(id);
    return saveProgress(current);
  }
  return current;
}

/**
 * Resets progress in localStorage back to DEFAULT_PROGRESS.
 * @returns {Object} Default progress
 */
function resetProgress() {
  const defaultState = cloneProgress(DEFAULT_PROGRESS.gitProgress);
  localStorage.setItem('gitProgress', JSON.stringify(defaultState));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('progressChanged', { detail: defaultState }));
  }
  return defaultState;
}

// Export for browser global context
if (typeof window !== 'undefined') {
  window.DEFAULT_PROGRESS = DEFAULT_PROGRESS;
  window.getProgress = getProgress;
  window.saveProgress = saveProgress;
  window.recordCommandPracticed = recordCommandPracticed;
  window.recordMissionCompleted = recordMissionCompleted;
  window.recordScenarioViewed = recordScenarioViewed;
  window.resetProgress = resetProgress;
  window.ProgressManager = {
    DEFAULT_PROGRESS,
    getProgress,
    saveProgress,
    recordCommandPracticed,
    recordMissionCompleted,
    recordScenarioViewed,
    resetProgress
  };
}

// Export for Node/CommonJS test runners if applicable
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PROGRESS,
    getProgress,
    saveProgress,
    recordCommandPracticed,
    recordMissionCompleted,
    recordScenarioViewed,
    resetProgress
  };
}
