/**
 * TaskForge - Hash-based Single Page Application Router
 */

const Router = {
  _lastRenderedView: null,
  _pendingResetScroll: false,
  _scrollPreserveDepth: 0,

  _normalizeViewName(viewName) {
    if (viewName === 'board' || viewName === 'list') return 'tasks';
    return viewName || 'dashboard';
  },

  _escapeCss(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(String(value));
    }
    return String(value).replace(/([^\w-])/g, '\\$1');
  },

  _getScrollableLocator(el, indexBySelector) {
    if (el.id) return { type: 'id', value: el.id };

    const dataAttrs = ['data-status', 'data-drop-key', 'data-sprint-id', 'data-project-tree', 'data-col', 'data-section'];
    for (let i = 0; i < dataAttrs.length; i++) {
      const attr = dataAttrs[i];
      if (el.hasAttribute(attr)) {
        const tag = el.tagName.toLowerCase();
        const val = this._escapeCss(el.getAttribute(attr));
        const sel = `${tag}[${attr}="${val}"]`;
        const idx = indexBySelector.get(sel) || 0;
        indexBySelector.set(sel, idx + 1);
        return { type: 'sel', value: sel, index: idx };
      }
    }

    const classes = typeof el.className === 'string' && el.className.trim()
      ? el.className.trim().split(/\s+/).filter(c => !c.startsWith('is-') && c !== 'active' && c !== 'visible').slice(0, 2)
      : [];
    const sel = classes.length
      ? `${el.tagName.toLowerCase()}.${classes.map(c => this._escapeCss(c)).join('.')}`
      : el.tagName.toLowerCase();
    const idx = indexBySelector.get(sel) || 0;
    indexBySelector.set(sel, idx + 1);
    return { type: 'sel', value: sel, index: idx };
  },

  captureScrollState(container) {
    if (!container) return null;
    const inner = [];
    const indexBySelector = new Map();
    const all = container.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (el.scrollTop > 0 || el.scrollLeft > 0) {
        inner.push({
          locator: this._getScrollableLocator(el, indexBySelector),
          top: el.scrollTop,
          left: el.scrollLeft
        });
      }
    }
    return {
      containerTop: container.scrollTop,
      containerLeft: container.scrollLeft,
      winX: window.scrollX || window.pageXOffset || 0,
      winY: window.scrollY || window.pageYOffset || 0,
      inner
    };
  },

  _applyInstantScroll(el, top, left) {
    if (!el) return;
    const prevBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    if (typeof top === 'number') el.scrollTop = top;
    if (typeof left === 'number') el.scrollLeft = left;
    el.style.scrollBehavior = prevBehavior;
  },

  restoreScrollState(container, state) {
    if (!container || !state) return;

    const restoreOnce = () => {
      this._applyInstantScroll(container, state.containerTop, state.containerLeft);
      if (state.inner && state.inner.length) {
        for (let i = 0; i < state.inner.length; i++) {
          const item = state.inner[i];
          let target = null;
          if (item.locator.type === 'id') {
            target = document.getElementById(item.locator.value);
          } else {
            try {
              const matches = container.querySelectorAll(item.locator.value);
              target = matches[item.locator.index] || null;
            } catch (err) {
              target = null;
            }
          }
          if (target) {
            this._applyInstantScroll(target, item.top, item.left);
          }
        }
      }
      if (state.winX || state.winY) {
        try {
          window.scrollTo({ left: state.winX, top: state.winY, behavior: 'instant' });
        } catch (err) {
          window.scrollTo(state.winX, state.winY);
        }
      }
      if (container.id === 'view-container') {
        const scrollBtn = document.getElementById('scroll-to-top-btn');
        if (scrollBtn) scrollBtn.classList.toggle('visible', container.scrollTop > 220);
      }
    };

    // Synchronous restore right after DOM replacement prevents any visible jump
    restoreOnce();

    // Re-verify on next animation frame in case layout/SVG/dropdown settles asynchronously
    let userInteracted = false;
    const cancelRestore = () => { userInteracted = true; };
    container.addEventListener('wheel', cancelRestore, { passive: true, once: true });
    container.addEventListener('touchstart', cancelRestore, { passive: true, once: true });
    container.addEventListener('pointerdown', cancelRestore, { passive: true, once: true });
    requestAnimationFrame(() => {
      container.removeEventListener('wheel', cancelRestore);
      container.removeEventListener('touchstart', cancelRestore);
      container.removeEventListener('pointerdown', cancelRestore);
      if (!userInteracted) restoreOnce();
    });
  },

  wrapViewRenders() {
    const viewObjects = [
      typeof DashboardView !== 'undefined' ? DashboardView : null,
      typeof PlannerView !== 'undefined' ? PlannerView : null,
      typeof ProjectsView !== 'undefined' ? ProjectsView : null,
      typeof TasksView !== 'undefined' ? TasksView : null,
      typeof BoardView !== 'undefined' ? BoardView : null,
      typeof ListView !== 'undefined' ? ListView : null,
      typeof BacklogView !== 'undefined' ? BacklogView : null,
      typeof HierarchyView !== 'undefined' ? HierarchyView : null,
      typeof SettingsView !== 'undefined' ? SettingsView : null,
      typeof FocusView !== 'undefined' ? FocusView : null,
      typeof DocsView !== 'undefined' ? DocsView : null
    ].filter(Boolean);

    viewObjects.forEach(view => {
      if (!view || typeof view.render !== 'function' || view._scrollWrapped) return;
      const origRender = view.render;
      view._scrollWrapped = true;
      view.render = function(container, ...args) {
        const viewContainer = document.getElementById('view-container');
        const isMainContainer = container && container === viewContainer;

        // Avoid double-capture when wrapper view (e.g. TasksView) delegates to BoardView/ListView
        if (!isMainContainer || Router._scrollPreserveDepth > 0) {
          return origRender.call(this, container, ...args);
        }

        const shouldReset = Router._pendingResetScroll;
        Router._pendingResetScroll = false;

        const snapshot = shouldReset ? null : Router.captureScrollState(container);
        Router._scrollPreserveDepth++;
        try {
          return origRender.call(this, container, ...args);
        } finally {
          Router._scrollPreserveDepth--;
          if (shouldReset) {
            Router._applyInstantScroll(container, 0, 0);
            const scrollBtn = document.getElementById('scroll-to-top-btn');
            if (scrollBtn) scrollBtn.classList.remove('visible');
          } else if (snapshot) {
            Router.restoreScrollState(container, snapshot);
          }
        }
      };
    });
  },

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
      docs: typeof DocsView !== 'undefined' ? DocsView : null,
      planner: typeof PlannerView !== 'undefined' ? PlannerView : null,
      hierarchy: typeof HierarchyView !== 'undefined' ? HierarchyView : null
    };
    return routes[viewName] || routes['dashboard'];
  },

  init() {
    this.wrapViewRenders();
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

    // Direct task view route handling
    if (viewName === 'task') {
      const taskId = params.get('id');
      const container = document.getElementById('view-container');
      if (container && (!container.children || container.children.length === 0)) {
        AppState.currentView = 'tasks';
        Sidebar.setActiveView('tasks');
        this.renderCurrentRoute();
      }
      if (taskId && typeof TaskModal !== 'undefined') {
        TaskModal.openDetail(taskId, false);
      }
      this.updateTopbarProjectPicker();
      return;
    } else {
      if (typeof TaskModal !== 'undefined' && TaskModal.isOpen) {
        TaskModal.closeDetail(false);
      }
    }

    const prevView = this._lastRenderedView ? this._normalizeViewName(this._lastRenderedView) : null;
    const nextView = this._normalizeViewName(viewName);
    const isRouteSwitch = prevView !== null && prevView !== nextView;

    AppState.currentView = viewName;
    this._lastRenderedView = viewName;
    this._pendingResetScroll = isRouteSwitch;

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
    const scopeText = !AppState.selectedProjectId
      ? 'All Projects'
      : ((AppState.projects.find(p => p.id === AppState.selectedProjectId) || {}).name || 'All Projects');

    if (label) {
      label.textContent = scopeText;
    }
  }
};
