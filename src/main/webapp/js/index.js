/**
 * Git Day-to-Day (GitD2D) - Landing / Dashboard Script
 * Phase 3: localStorage Branch Logic & Hero CTA State
 */

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
 * Updates Hero CTA button and feature card links based on user status
 */
function applyUserProgressState() {
  const progress = getGitProgress();
  const ctaBtn = document.getElementById('main-cta-btn');
  const microcopy = document.getElementById('cta-microcopy');
  const guidedCardLink = document.getElementById('feature-guided-link');

  const hasActivity = progress && (
    progress.commandsPracticed.length > 0 ||
    progress.missionsCompleted.length > 0 ||
    progress.currentMission !== null ||
    progress.scenariosViewed.length > 0
  );

  if (!hasActivity || !progress) {
    // First-time user
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
    // Returning user
    const targetMission = progress.currentMission;
    
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
      const missionToRoute = targetMission || 1;
      guidedCardLink.setAttribute('href', `lab.jsp?mode=guided&mission=${missionToRoute}`);
      guidedCardLink.textContent = targetMission ? `Resume Mission ${targetMission} →` : 'Start Mission 1 →';
    }
  }

  return { progress, hasActivity };
}

document.addEventListener('DOMContentLoaded', () => {
  applyUserProgressState();
});
