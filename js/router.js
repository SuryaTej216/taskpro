/**
 * TaskForge - Hash-based Single Page Application Router
 */

const Router = {
  getRouteView(viewName) {
    if (viewName === 'board') {
      if (typeof TasksView !== 'undefined') {
        TasksView.currentMode = 'board';
        return TasksView;
      }
      return typeof BoardView !== 'undefined' ? BoardView : null;
    }
    if (viewName === 'list') {
      if (typeof TasksView !== 'undefined') {
        TasksView.currentMode = 'list';
        return TasksView;
      }
      return typeof ListView !== 'undefined' ? ListView : null;
    }

    const routes = {
      dashboard: typeof DashboardView !== 'undefined' ? DashboardView : null,
      projects: typeof ProjectsView !== 'undefined' ? ProjectsView : null,
      tasks: typeof TasksView !== 'undefined' ? TasksView : null,
      board: typeof TasksView !== 'undefined' ? TasksView : (typeof BoardView !== 'undefined' ? BoardView : null),
      backlog: typeof BacklogView !== 'undefined' ? BacklogView : null,
      list: typeof TasksView !== 'undefined' ? TasksView : (typeof ListView !== 'undefined' ? ListView : null),
      settings: typeof SettingsView !== 'undefined' ? SettingsView : null,
      focus: typeof FocusView !== 'undefined' ? FocusView : null,
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

    // Parse query params (e.g., project=xxx, mode=list)
    const params = new URLSearchParams(queryString || '');
    const projectParam = params.get('project');
    if (projectParam) {
      AppState.selectedProjectId = projectParam;
    }

    const modeParam = params.get('mode');
    if (modeParam && (modeParam === 'board' || modeParam === 'list')) {
      if (typeof TasksView !== 'undefined') {
        TasksView.currentMode = modeParam;
      }
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
      if (typeof DropdownUI !== 'undefined') {
        DropdownUI.initAll(container);
      }
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
