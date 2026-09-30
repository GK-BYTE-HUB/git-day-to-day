/**
 * Git Day-to-Day (GitD2D) - Real-World Scenarios Script
 * Phase 4 & 5: Backend integration with mock fallback + Category Icon Badges & Real-time Search/Filtering
 */

const API_SCENARIOS_URL = 'api/scenarios';
const MOCK_SCENARIOS_URL = 'api-contracts/scenarios.json';

// Category metadata mapping for scenarios
const CATEGORY_MAP = {
  1: { name: 'Staging', icon: '📦' },
  2: { name: 'Undo', icon: '↩️' },
  3: { name: 'Branching', icon: '🌿' },
  4: { name: 'Conflicts', icon: '⚔️' },
  5: { name: 'Remote', icon: '🚀' },
  6: { name: 'Status', icon: '🧭' }
};

let allScenarios = [];
let activeCategory = 'all';
let searchQuery = '';

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
 * Determines category object for a given scenario
 */
function getScenarioCategory(scenario) {
  if (scenario.category && scenario.categoryIcon) {
    return { name: scenario.category, icon: scenario.categoryIcon };
  }
  if (CATEGORY_MAP[scenario.id]) {
    return CATEGORY_MAP[scenario.id];
  }
  return { name: 'General', icon: '💡' };
}

/**
 * Fetches scenario definitions from real database endpoint, with mock contract fallback
 */
async function fetchScenarios() {
  try {
    let response = await fetch(API_SCENARIOS_URL);
    if (!response.ok) {
      console.warn('[GitD2D] Server endpoint not ready or returned status ' + response.status + ', using mock contract fallback.');
      response = await fetch(MOCK_SCENARIOS_URL);
    }
    if (!response.ok) {
      throw new Error(`Failed to load scenarios: ${response.status}`);
    }
    allScenarios = await response.json();
    applyFiltersAndRender();
  } catch (err) {
    console.error('[GitD2D] Error fetching scenarios:', err);
    showErrorState();
  }
}

/**
 * Filters allScenarios based on activeCategory and searchQuery, then renders
 */
function applyFiltersAndRender() {
  const query = searchQuery.trim().toLowerCase();

  const filtered = allScenarios.filter(scenario => {
    const cat = getScenarioCategory(scenario);

    // Category Filter
    const matchesCategory = (activeCategory === 'all') ||
      (cat.name.toLowerCase() === activeCategory.toLowerCase());

    // Search Query Filter (matches title, theMess, explanation, or fixSteps)
    let matchesSearch = true;
    if (query) {
      const inTitle = (scenario.title || '').toLowerCase().includes(query);
      const inMess = (scenario.theMess || '').toLowerCase().includes(query);
      const inExplanation = (scenario.explanation || '').toLowerCase().includes(query);
      const inSteps = (scenario.fixSteps || []).some(step => step.toLowerCase().includes(query));
      const inCategory = cat.name.toLowerCase().includes(query);

      matchesSearch = inTitle || inMess || inExplanation || inSteps || inCategory;
    }

    return matchesCategory && matchesSearch;
  });

  renderScenarios(filtered);
}

/**
 * Renders the scenario cards into the responsive grid
 */
function renderScenarios(scenarios) {
  const container = document.getElementById('scenarios-grid');
  if (!container) return;

  container.innerHTML = '';

  if (scenarios.length === 0) {
    container.innerHTML = `
      <div class="neo-card no-scenarios-card">
        <div class="no-scenarios-icon">🔍</div>
        <h3>No Scenarios Found</h3>
        <p>No troubleshooting scenarios match your search query "${escapeHtml(searchQuery)}". Try clearing filters or using different keywords.</p>
        <button class="neo-btn clear-filters-btn" id="clear-filters-btn">CLEAR FILTERS</button>
      </div>
    `;
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', resetFilters);
    }
    return;
  }

  const colorClasses = ['bg-primary', 'bg-accent1', 'bg-accent2'];

  scenarios.forEach((scenario, index) => {
    const colorClass = colorClasses[index % colorClasses.length];
    const category = getScenarioCategory(scenario);

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

    card.innerHTML = `
      <div class="scenario-card-header">
        <div>
          <div class="scenario-badge-group">
            <span class="scenario-card-number">Scenario 0${scenario.id}</span>
            <span class="scenario-category-badge">${category.icon} ${escapeHtml(category.name)}</span>
          </div>
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
 * Resets search input and category filter buttons to default 'all'
 */
function resetFilters() {
  searchQuery = '';
  activeCategory = 'all';

  const searchInput = document.getElementById('scenario-search');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-category') === 'all');
  });

  applyFiltersAndRender();
}

/**
 * Sets up event listeners for the search input and category pills
 */
function setupFilterListeners() {
  const searchInput = document.getElementById('scenario-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      applyFiltersAndRender();
    });
  }

  const categoryPillsContainer = document.getElementById('category-pills');
  if (categoryPillsContainer) {
    categoryPillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;

      const category = pill.getAttribute('data-category');
      if (!category) return;

      activeCategory = category;

      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      applyFiltersAndRender();
    });
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
  setupFilterListeners();
  fetchScenarios();
});
