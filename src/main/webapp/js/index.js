/**
 * Git Day-to-Day (GitD2D) - Landing / Dashboard Script
 * Phase 3 & 4: localStorage Parsing, Progress Hub & Quick-Jump Links
 */

const TOTAL_COMMANDS = 20;
const TOTAL_MISSIONS = 4;

/**
 * Safely retrieves and validates gitProgress from localStorage
 * Returns null if missing, corrupted, or invalid.
 */
function getGitProgress() {
  try {
    const raw = localStorage.getItem('gitProgress');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;

    return {
      commandsPracticed: Array.isArray(data.commandsPracticed) ? data.commandsPracticed : [],
      missionsCompleted: Array.isArray(data.missionsCompleted) ? data.missionsCompleted : [],
      currentMission: (data.currentMission !== undefined && data.currentMission !== null && data.currentMission !== '') ? data.currentMission : null,
      scenariosViewed: Array.isArray(data.scenariosViewed) ? data.scenariosViewed : []
    };
  } catch (e) {
    console.warn('[GitD2D] Corrupted or unreadable gitProgress in localStorage:', e);
    return null;
  }
}

/**
 * Updates UI elements based on user status (First-time vs Returning)
 */
function applyUserProgressState() {
  const progress = getGitProgress();
  const ctaBtn = document.getElementById('main-cta-btn');
  const microcopy = document.getElementById('cta-microcopy');
  const guidedCardLink = document.getElementById('feature-guided-link');
  const progressHub = document.getElementById('progress-hub');

  const hasActivity = progress && (
    progress.commandsPracticed.length > 0 ||
    progress.missionsCompleted.length > 0 ||
    progress.currentMission !== null ||
    progress.scenariosViewed.length > 0
  );

  if (!hasActivity || !progress) {
    // 1. First-Time User State
    if (progressHub) {
      progressHub.style.display = 'none';
    }

    if (ctaBtn) {
      ctaBtn.textContent = 'START LEARNING →';
      ctaBtn.setAttribute('href', 'learning.jsp?module=1');
    }
    if (microcopy) {
      microcopy.textContent = '';
    }
    if (guidedCardLink) {
      guidedCardLink.setAttribute('href', 'lab.jsp?mode=guided&mission=1');
      guidedCardLink.textContent = 'Start Mission 1 →';
    }
  } else {
    // 2. Returning User State
    const targetMission = progress.currentMission;

    // Show Progress Hub
    if (progressHub) {
      progressHub.style.display = 'flex';
    }

    // Calculate Stats
    const cmdCount = Math.min(TOTAL_COMMANDS, progress.commandsPracticed.length);
    const missionCount = Math.min(TOTAL_MISSIONS, progress.missionsCompleted.length);
    const overallPct = Math.min(100, Math.round((cmdCount / TOTAL_COMMANDS) * 100));

    // Update Stats Display
    const statCommands = document.getElementById('stat-commands');
    const statMissions = document.getElementById('stat-missions');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');

    if (statCommands) {
      statCommands.innerHTML = `Commands Practiced: <strong>${cmdCount}/${TOTAL_COMMANDS}</strong>`;
    }
    if (statMissions) {
      statMissions.innerHTML = `Missions Completed: <strong>${missionCount}/${TOTAL_MISSIONS}</strong>`;
    }

    // Trigger Progress Bar Fill Animation
    if (progressBarFill) {
      setTimeout(() => {
        progressBarFill.style.width = `${overallPct}%`;
      }, 100);
    }
    if (progressBarText) {
      progressBarText.textContent = `${overallPct}%`;
    }

    // Quick-Jump Navigation Links
    const qjLab = document.getElementById('qj-lab');
    const qjLearn = document.getElementById('qj-learn');
    const qjScenarios = document.getElementById('qj-scenarios');

    const labMission = targetMission || 1;
    if (qjLab) {
      qjLab.setAttribute('href', `lab.jsp?mode=guided&mission=${labMission}`);
      qjLab.textContent = `Lab (Mission ${labMission}) →`;
    }
    if (qjLearn) {
      qjLearn.setAttribute('href', 'learning.jsp?module=1');
    }
    if (qjScenarios) {
      qjScenarios.setAttribute('href', 'scenarios.jsp');
    }

    // Hero CTA Updates
    if (ctaBtn) {
      ctaBtn.textContent = 'RESUME LEARNING →';
      if (targetMission) {
        ctaBtn.setAttribute('href', `lab.jsp?mode=guided&mission=${targetMission}`);
      } else {
        ctaBtn.setAttribute('href', 'learning.jsp?module=1');
      }
    }

    if (microcopy && targetMission) {
      microcopy.textContent = `last visited: Mission ${targetMission}`;
    }

    if (guidedCardLink) {
      guidedCardLink.setAttribute('href', `lab.jsp?mode=guided&mission=${labMission}`);
      guidedCardLink.textContent = targetMission ? `Resume Mission ${targetMission} →` : 'Start Mission 1 →';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyUserProgressState();
});
