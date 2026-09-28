/**
 * Git Day-to-Day (GitD2D) - Real-World Scenarios Script
 * Phase 2 & 3: Render cards from mock JSON, accordion toggle, progress tracking & routing
 */

const MOCK_SCENARIOS_URL = 'api-contracts/scenarios.json';

/**
 * Escapes HTML characters to prevent XSS vulnerabilities
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Fetches scenario definitions from mock JSON contract
 */
async function fetchScenarios() {
  try {
    const response = await fetch(MOCK_SCENARIOS_URL);
    if (!response.ok) {
      throw new Error(`Failed to load scenarios contract: ${response.status}`);
    }
    const scenarios = await response.json();
    renderScenarios(scenarios);
  } catch (err) {
    console.error('[GitD2D] Error fetching scenarios:', err);
    showErrorState();
  }
}

/**
 * Renders the 6 scenario cards into the responsive grid
 */
function renderScenarios(scenarios) {
  const container = document.getElementById('scenarios-grid');
  if (!container) return;

  container.innerHTML = '';

  const colorClasses = ['bg-primary', 'bg-accent1', 'bg-accent2'];

  scenarios.forEach((scenario, index) => {
    const colorClass = colorClasses[index % colorClasses.length];
    const card = document.createElement('div');
    card.className = `neo-card scenario-card ${colorClass}`;
    card.setAttribute('data-id', scenario.id);

    // Build step-by-step fix items
    const fixStepsHtml = (scenario.fixSteps || []).map((step, idx) => `
      <div class="fix-step-item">
        <span class="fix-step-num">${idx + 1}</span>
        <code class="fix-step-code">${escapeHtml(step)}</code>
      </div>
    `).join('');

    // Order: Panic Statement (theMess) -> Explanation -> Step-by-Step Fix -> Fix In Lab Button
    card.innerHTML = `
      <div class="scenario-card-header">
        <div>
          <span class="scenario-card-number">Scenario 0${scenario.id}</span>
          <h2 class="scenario-card-title">${escapeHtml(scenario.title)}</h2>
        </div>
        <div class="scenario-expand-icon">▼</div>
      </div>
      <div class="scenario-details">
        <!-- 1. Panic Statement -->
        <div class="detail-block">
          <span class="detail-label">The Mess</span>
          <p class="detail-text">${escapeHtml(scenario.theMess)}</p>
        </div>
        <!-- 2. Explanation -->
        <div class="detail-block">
          <span class="detail-label">Why It Happens</span>
          <p class="detail-text">${escapeHtml(scenario.explanation)}</p>
        </div>
        <!-- 3. Step-by-Step Fix -->
        <div class="detail-block">
          <span class="detail-label">Step-by-Step Fix</span>
          <div class="fix-steps-list">
            ${fixStepsHtml}
          </div>
        </div>
        <!-- 4. Fix It In The Lab Button -->
        <div class="scenario-action">
          <a href="lab.jsp?mode=scenario&id=${scenario.id}" class="neo-btn fix-lab-btn">
            FIX IT IN THE LAB &rarr;
          </a>
        </div>
      </div>
    `;

    // Click handler to toggle card expansion & record progress
    card.addEventListener('click', (e) => {
      // Don't toggle card if clicking the button link directly
      if (e.target.closest('.fix-lab-btn')) return;

      handleCardClick(scenario.id, card);
    });

    container.appendChild(card);
  });
}

/**
 * Toggles card expansion and records scenario ID into gitProgress.scenariosViewed
 */
function handleCardClick(scenarioId, card) {
  const isExpanded = card.classList.contains('is-expanded');

  // Accordion behavior: close other cards when one is opened
  document.querySelectorAll('.scenario-card.is-expanded').forEach(otherCard => {
    if (otherCard !== card) {
      otherCard.classList.remove('is-expanded');
    }
  });

  const nextState = !isExpanded;
  card.classList.toggle('is-expanded', nextState);

  // If opening card, safely record viewed progress
  if (nextState) {
    try {
      if (typeof window.recordScenarioViewed === 'function') {
        window.recordScenarioViewed(scenarioId);
      } else if (typeof recordScenarioViewed === 'function') {
        recordScenarioViewed(scenarioId);
      } else {
        const raw = localStorage.getItem('gitProgress');
        const parsed = raw ? JSON.parse(raw) : {};
        const target = parsed.gitProgress ? parsed.gitProgress : parsed;
        if (!Array.isArray(target.scenariosViewed)) target.scenariosViewed = [];
        if (!target.scenariosViewed.includes(Number(scenarioId))) {
          target.scenariosViewed.push(Number(scenarioId));
          localStorage.setItem('gitProgress', JSON.stringify(target));
        }
      }
    } catch (e) {
      console.warn('[GitD2D] Safely handled scenario view recording error:', e);
    }
  }
}

/**
 * Renders a fallback error card if fetching fails
 */
function showErrorState() {
  const container = document.getElementById('scenarios-grid');
  if (!container) return;
  container.innerHTML = `
    <div class="neo-card" style="grid-column: 1 / -1; text-align: center; padding: 40px; background-color: var(--color-error); color: #FFF;">
      <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 12px;">Failed to Load Scenarios</h2>
      <p>Unable to retrieve real-world scenario definitions. Please try refreshing the page.</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchScenarios();
});
