/**
 * =============================================================================
 * Git Day-to-Day (GitD2D) - Centralized Progress Manager
 * Tracks completed Learn commands and Lab missions with swappable storage adapter.
 * =============================================================================
 */

(function (global) {
  'use strict';

  // Prevent duplicate execution if included multiple times
  if (global.ProgressManager && global.ProgressManager.__initialized) {
    return;
  }

  const TOTAL_COMMANDS = 20;
  const TOTAL_MISSIONS = 4;
  const TOTAL_ITEMS = TOTAL_COMMANDS + TOTAL_MISSIONS; // 24 items in total

  const DEFAULT_PROGRESS = {
    gitProgress: {
      commandsPracticed: [],
      missionsCompleted: [],
      currentMission: 1,
      scenariosViewed: []
    }
  };

  /**
   * Data Access Adapter:
   * Abstract interface to decouple UI components from storage mechanism.
   * Currently uses LocalStorageAdapter for instant guest/client-side persistence.
   * To swap for a Java backend, assign ProgressManager.storageAdapter = ServerApiAdapter.
   */
  const LocalStorageAdapter = {
    name: 'localStorage',
    async get() {
      try {
        const raw = localStorage.getItem('gitProgress');
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        console.warn('[ProgressManager] Failed to read from localStorage:', err);
        return null;
      }
    },
    async save(data) {
      try {
        localStorage.setItem('gitProgress', JSON.stringify(data));
        return true;
      } catch (err) {
        console.error('[ProgressManager] Failed to write to localStorage:', err);
        return false;
      }
    }
  };

  /**
   * Example Server API Adapter structure for future Java Servlet backend:
   *
   * const ServerApiAdapter = {
   *   name: 'serverServlet',
   *   async get() {
   *     const res = await fetch('/api/progress', { method: 'GET', headers: { 'Accept': 'application/json' } });
   *     if (!res.ok) throw new Error(`HTTP ${res.status}`);
   *     return await res.json();
   *   },
   *   async save(data) {
   *     const res = await fetch('/api/progress', {
   *       method: 'POST',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify(data)
   *     });
   *     if (!res.ok) throw new Error(`HTTP ${res.status}`);
   *     return await res.json();
   *   }
   * };
   */

  function cloneProgress(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Synchronously retrieves the current gitProgress object.
   * @returns {Object} Active progress state
   */
  function getProgress() {
    try {
      if (typeof localStorage === 'undefined') {
        return cloneProgress(DEFAULT_PROGRESS.gitProgress);
      }
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

      const target = parsed.gitProgress ? parsed.gitProgress : parsed;
      return {
        commandsPracticed: Array.isArray(target.commandsPracticed) ? target.commandsPracticed : [],
        missionsCompleted: Array.isArray(target.missionsCompleted) ? target.missionsCompleted : [],
        currentMission: typeof target.currentMission === 'number' ? target.currentMission : 1,
        scenariosViewed: Array.isArray(target.scenariosViewed) ? target.scenariosViewed : []
      };
    } catch (err) {
      console.warn('Failed to read gitProgress, resetting to default:', err);
      return cloneProgress(DEFAULT_PROGRESS.gitProgress);
    }
  }

  /**
   * Validates and persists progress, dispatching 'progressChanged' event.
   * @param {Object} updatedObj
   * @returns {Object}
   */
  function saveProgress(updatedObj) {
    if (!updatedObj || typeof updatedObj !== 'object') {
      throw new Error('saveProgress requires a valid progress object');
    }

    const target = updatedObj.gitProgress ? updatedObj.gitProgress : updatedObj;

    const sanitized = {
      commandsPracticed: Array.isArray(target.commandsPracticed)
        ? Array.from(new Set(target.commandsPracticed.map(s => String(s).trim()).filter(Boolean)))
        : [],
      missionsCompleted: Array.isArray(target.missionsCompleted)
        ? Array.from(new Set(target.missionsCompleted.map(n => Number(n)).filter(n => !isNaN(n))))
        : [],
      currentMission: typeof target.currentMission === 'number' ? target.currentMission : 1,
      scenariosViewed: Array.isArray(target.scenariosViewed)
        ? Array.from(new Set(target.scenariosViewed.map(n => Number(n)).filter(n => !isNaN(n))))
        : []
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gitProgress', JSON.stringify(sanitized));
      }
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('progressChanged', { detail: sanitized }));
      }
    } catch (err) {
      console.error('Failed to write gitProgress to localStorage:', err);
    }

    return sanitized;
  }

  /**
   * Checks whether a command is completed.
   * @param {string} commandName
   * @returns {boolean}
   */
  function isCommandCompleted(commandName) {
    if (!commandName || typeof commandName !== 'string') return false;
    const progress = getProgress();
    const normalized = commandName.trim().toLowerCase();
    return progress.commandsPracticed.some(cmd => cmd.trim().toLowerCase() === normalized);
  }

  /**
   * Marks a command as complete.
   * @param {string} commandName
   * @returns {Object}
   */
  function markCommandCompleted(commandName) {
    if (!commandName || typeof commandName !== 'string') return getProgress();
    const current = getProgress();
    const normalized = commandName.trim();
    if (!isCommandCompleted(normalized)) {
      current.commandsPracticed.push(normalized);
      return saveProgress(current);
    }
    return current;
  }

  /**
   * Unmarks a command as complete.
   * @param {string} commandName
   * @returns {Object}
   */
  function unmarkCommandCompleted(commandName) {
    if (!commandName || typeof commandName !== 'string') return getProgress();
    const current = getProgress();
    const normalized = commandName.trim().toLowerCase();
    current.commandsPracticed = current.commandsPracticed.filter(cmd => cmd.trim().toLowerCase() !== normalized);
    return saveProgress(current);
  }

  /**
   * Toggles a command's completed state.
   * @param {string} commandName
   * @returns {boolean} true if now completed, false if unmarked
   */
  function toggleCommandCompleted(commandName) {
    if (!commandName || typeof commandName !== 'string') return false;
    if (isCommandCompleted(commandName)) {
      unmarkCommandCompleted(commandName);
      return false;
    } else {
      markCommandCompleted(commandName);
      return true;
    }
  }

  /**
   * Alias for backward compatibility.
   */
  function recordCommandPracticed(commandName) {
    return markCommandCompleted(commandName);
  }

  /**
   * Checks whether a mission is completed.
   * @param {number} missionNo
   * @returns {boolean}
   */
  function isMissionCompleted(missionNo) {
    const no = Number(missionNo);
    if (isNaN(no)) return false;
    const progress = getProgress();
    return progress.missionsCompleted.includes(no);
  }

  /**
   * Marks a mission as completed.
   * @param {number} missionNo
   * @returns {Object}
   */
  function recordMissionCompleted(missionNo) {
    const current = getProgress();
    const no = Number(missionNo);
    if (isNaN(no)) return current;

    if (!current.missionsCompleted.includes(no)) {
      current.missionsCompleted.push(no);
    }
    if (current.currentMission <= no) {
      current.currentMission = Math.min(no + 1, TOTAL_MISSIONS);
    }
    return saveProgress(current);
  }

  function recordScenarioViewed(scenarioId) {
    const current = getProgress();
    const id = Number(scenarioId);
    if (!isNaN(id) && !current.scenariosViewed.includes(id)) {
      current.scenariosViewed.push(id);
      return saveProgress(current);
    }
    return current;
  }

  function resetProgress() {
    const defaultState = cloneProgress(DEFAULT_PROGRESS.gitProgress);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gitProgress', JSON.stringify(defaultState));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('progressChanged', { detail: defaultState }));
    }
    return defaultState;
  }

  /**
   * Computes overall learning progress percentage across Learn commands & Lab missions.
   * @param {Object} [progressData]
   * @returns {Object}
   */
  function calculateProgress(progressData) {
    const p = progressData || getProgress();
    const cmdList = Array.isArray(p.commandsPracticed) ? Array.from(new Set(p.commandsPracticed)) : [];
    const missionList = Array.isArray(p.missionsCompleted) ? Array.from(new Set(p.missionsCompleted)) : [];

    const completedCommands = Math.min(TOTAL_COMMANDS, cmdList.length);
    const completedMissions = Math.min(TOTAL_MISSIONS, missionList.length);
    const totalCompleted = completedCommands + completedMissions;
    const percentage = TOTAL_ITEMS > 0 ? Math.min(100, Math.round((totalCompleted / TOTAL_ITEMS) * 100)) : 0;

    return {
      completedCommands,
      totalCommands: TOTAL_COMMANDS,
      completedMissions,
      totalMissions: TOTAL_MISSIONS,
      totalCompleted,
      totalItems: TOTAL_ITEMS,
      percentage
    };
  }

  /**
   * Dynamically updates the progress bar DOM elements across any .jsp page.
   */
  function updateProgressBarUI() {
    if (typeof document === 'undefined') return;

    const stats = calculateProgress();
    const pct = stats.percentage;
    const pctStr = `${pct}%`;

    // 1. Update Global Header Progress Bar Fill
    const globalFill = document.getElementById('global-progress-bar-fill');
    if (globalFill) {
      globalFill.style.width = pctStr;
      globalFill.setAttribute('aria-valuenow', pct);
      if (pct === 100) {
        globalFill.classList.add('all-complete');
      } else {
        globalFill.classList.remove('all-complete');
      }
    }

    // 2. Update Global Header Progress Bar Text
    const globalText = document.getElementById('global-progress-bar-text');
    if (globalText) {
      globalText.textContent = `${pctStr} (${stats.totalCompleted}/${stats.totalItems})`;
    }

    // 3. Update Index Landing Hub Progress Bar Fill
    const indexFill = document.getElementById('progress-bar-fill');
    if (indexFill) {
      indexFill.style.width = pctStr;
    }

    // 4. Update Index Landing Hub Progress Bar Text
    const indexText = document.getElementById('progress-bar-text');
    if (indexText) {
      indexText.textContent = pctStr;
    }

    // 5. Update Stat Pills (if present on index.jsp)
    const statCommands = document.getElementById('stat-commands');
    if (statCommands) {
      statCommands.innerHTML = `Commands Practiced: <strong>${stats.completedCommands}/${stats.totalCommands}</strong>`;
    }
    const statMissions = document.getElementById('stat-missions');
    if (statMissions) {
      statMissions.innerHTML = `Missions Completed: <strong>${stats.completedMissions}/${stats.totalMissions}</strong>`;
    }
  }

  // Hook event listeners for reactive UI synchronization
  if (typeof window !== 'undefined') {
    // Initial paint on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateProgressBarUI);
    } else {
      updateProgressBarUI();
    }

    // React to state changes dispatched locally
    window.addEventListener('progressChanged', () => {
      updateProgressBarUI();
    });

    // React to multi-tab storage updates
    window.addEventListener('storage', (e) => {
      if (e.key === 'gitProgress') {
        updateProgressBarUI();
      }
    });

    // React to Lab mission success custom event
    window.addEventListener('missionSuccess', (e) => {
      const missionNo = e && e.detail && e.detail.missionNo;
      if (missionNo !== undefined && missionNo !== null) {
        recordMissionCompleted(missionNo);
      }
    });
  }

  const ProgressManager = {
    __initialized: true,
    TOTAL_COMMANDS,
    TOTAL_MISSIONS,
    TOTAL_ITEMS,
    DEFAULT_PROGRESS,
    storageAdapter: LocalStorageAdapter,
    getProgress,
    saveProgress,
    isCommandCompleted,
    markCommandCompleted,
    unmarkCommandCompleted,
    toggleCommandCompleted,
    recordCommandPracticed,
    isMissionCompleted,
    recordMissionCompleted,
    recordScenarioViewed,
    resetProgress,
    calculateProgress,
    updateProgressBarUI
  };

  // Expose to window
  if (typeof window !== 'undefined') {
    window.DEFAULT_PROGRESS = DEFAULT_PROGRESS;
    window.getProgress = getProgress;
    window.saveProgress = saveProgress;
    window.isCommandCompleted = isCommandCompleted;
    window.markCommandCompleted = markCommandCompleted;
    window.unmarkCommandCompleted = unmarkCommandCompleted;
    window.toggleCommandCompleted = toggleCommandCompleted;
    window.recordCommandPracticed = recordCommandPracticed;
    window.isMissionCompleted = isMissionCompleted;
    window.recordMissionCompleted = recordMissionCompleted;
    window.recordScenarioViewed = recordScenarioViewed;
    window.resetProgress = resetProgress;
    window.calculateProgress = calculateProgress;
    window.updateProgressBarUI = updateProgressBarUI;
    window.ProgressManager = ProgressManager;
  }

  // Export for Node/CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressManager;
  }

})(typeof window !== 'undefined' ? window : globalThis);
