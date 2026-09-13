/**
 * TaskForge - Hash-based Single Page Application Router
 */

const Router = {
  getRouteView(viewName) {
    const routes = {
      dashboard: typeof DashboardView !== 'undefined' ? DashboardView : null,
      'my-work': typeof MyWorkView !== 'undefined' ? MyWorkView : null,
      projects: typeof ProjectsView !== 'undefined' ? ProjectsView : null,
      board: typeof BoardView !== 'undefined' ? BoardView : null,
      backlog: typeof BacklogView !== 'undefined' ? BacklogView : null,
      timeline: typeof TimelineView !== 'undefined' ? TimelineView : null,
      calendar: typeof CalendarView !== 'undefined' ? CalendarView : null,
      list: typeof ListView !== 'undefined' ? ListView : null,
      reports: typeof ReportsView !== 'undefined' ? ReportsView : null,
      goals: typeof GoalsView !== 'undefined' ? GoalsView : null,
      focus: typeof FocusView !== 'undefined' ? FocusView : null,
      settings: typeof SettingsView !== 'undefined' ? SettingsView : null,
      docs: typeof DocsView !== 'undefined' ? DocsView : null
    };
    return routes[viewName] || routes['dashboard'];
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  /**
   * Navigates programmatically to a view
   * @param {string} viewName 
   * @param {Object} queryParams 
   */
  navigate(viewName, queryParams = {}) {
    let hash = `#/${viewName}`;
    const keys = Object.keys(queryParams);
    if (keys.length > 0) {
      const q = keys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&');
      hash += `?${q}`;
    }
    window.location.hash = hash;
  },

  /**
   * Parses current hash and dispatches to registered view handler
   */
  handleRoute() {
    const rawHash = window.location.hash.slice(2) || 'dashboard';
    const [path, queryString] = rawHash.split('?');
    const viewName = path || 'dashboard';

    // Parse query params (e.g., project=xxx, task=yyy)
    const params = new URLSearchParams(queryString || '');
    const projectParam = params.get('project');
    if (projectParam) {
      AppState.selectedProjectId = projectParam;
    }

    AppState.currentView = viewName;

    // Update Topbar project selector label
    this.updateTopbarProjectPicker();

    // Highlight active sidebar navigation item
    Sidebar.setActiveView(viewName);

    // Render into view container
    this.renderCurrentRoute();
  },

  renderCurrentRoute() {
    const container = document.getElementById('view-container');
    const view = this.getRouteView(AppState.currentView);
    if (view && typeof view.render === 'function') {
      view.render(container);
    }
  },

  updateTopbarProjectPicker() {
    const label = document.getElementById('current-project-label');
    if (!label) return;

    if (!AppState.selectedProjectId) {
      label.textContent = 'All Projects';
    } else {
      const proj = AppState.projects.find(p => p.id === AppState.selectedProjectId);
      label.textContent = proj ? proj.name : 'All Projects';
    }
  }
};
