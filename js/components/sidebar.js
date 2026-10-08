/**
 * TaskForge - Sidebar Component Controller
 */

const Sidebar = {
  sidebarEl: null,
  toggleBtn: null,
  mobileToggleBtn: null,
  backdropEl: null,
  tooltipEl: null,
  isCollapsed: false,

  init() {
    this.sidebarEl = document.getElementById('sidebar');
    this.toggleBtn = document.getElementById('sidebar-toggle-btn');
    this.mobileToggleBtn = document.getElementById('mobile-sidebar-toggle');
    this.backdropEl = document.getElementById('sidebar-mobile-backdrop');
    this.tooltipEl = document.getElementById('sidebar-floating-tooltip');

    // Desktop collapse toggle
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    // Mobile drawer toggle
    if (this.mobileToggleBtn) {
      this.mobileToggleBtn.addEventListener('click', () => this.openMobile());
    }

    if (this.backdropEl) {
      this.backdropEl.addEventListener('click', () => this.closeMobile());
    }

    // Add project quick action button in sidebar
    const addProjectBtn = document.getElementById('sidebar-add-project-btn');
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ProjectsView !== 'undefined' && ProjectsView.openCreateModal) {
          ProjectsView.openCreateModal();
        } else {
          Router.navigate('#/projects');
        }
      });
    }

    // Floating Tooltips for Collapsed Sidebar
    this.setupFloatingTooltips();

    this.renderProjectShortcuts();
    this.updateCounters();

    // Listen to data mutations
    AppState.subscribe('tasks:changed', () => {
      this.updateCounters();
      this.renderProjectShortcuts();
    });

    AppState.subscribe('projects:changed', () => {
      this.renderProjectShortcuts();
      this.updateCounters();
    });
  },

  toggle() {
    if (!this.sidebarEl) return;
    this.isCollapsed = !this.isCollapsed;
    this.sidebarEl.classList.toggle('collapsed', this.isCollapsed);
    if (this.toggleBtn) {
      this.toggleBtn.innerHTML = this.isCollapsed 
        ? '<i class="fa-solid fa-angles-right"></i>' 
        : '<i class="fa-solid fa-angles-left"></i>';
      this.toggleBtn.title = this.isCollapsed
        ? 'Expand Sidebar (Ctrl+B)'
        : 'Collapse Sidebar (Ctrl+B)';
    }
    this.hideTooltip();
  },

  openMobile() {
    if (this.sidebarEl) this.sidebarEl.classList.add('mobile-open');
    if (this.backdropEl) this.backdropEl.classList.add('active');
  },

  closeMobile() {
    if (this.sidebarEl) this.sidebarEl.classList.remove('mobile-open');
    if (this.backdropEl) this.backdropEl.classList.remove('active');
  },

  /**
   * Highlights active navigation link based on current view
   * @param {string} viewName 
   */
  setActiveView(viewName) {
    const normalized = (viewName === 'board' || viewName === 'list') ? 'tasks' : viewName;
    document.querySelectorAll('#sidebar .nav-item').forEach(item => {
      if (item.dataset.view === viewName || item.dataset.view === normalized) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile menu if on phone
    if (window.innerWidth <= 768) {
      this.closeMobile();
    }
  },

  /**
   * Renders active project shortcuts in the sidebar with live task counters
   */
  renderProjectShortcuts() {
    const container = document.getElementById('sidebar-projects-list');
    if (!container) return;

    container.innerHTML = AppState.projects.slice(0, 6).map(p => {
      const activeTasksCount = AppState.tasks.filter(t => t.projectId === p.id && t.status !== 'done' && t.status !== 'cancelled').length;
      return `
        <a href="#/tasks?project=${p.id}" class="nav-item project-nav-item" data-tooltip="${Utils.escapeHTML(p.name)}" title="${Utils.escapeHTML(p.name)}">
          <span class="nav-project-dot" style="background-color: ${p.color || '#579DFF'};"></span>
          <span class="nav-item-label">${Utils.escapeHTML(p.name)}</span>
          ${activeTasksCount > 0 ? `<span class="badge-count project-active-badge">${activeTasksCount}</span>` : ''}
        </a>
      `;
    }).join('');
  },

  /**
   * Updates sidebar badge counts (Projects)
   */
  updateCounters() {
    const projectsCountEl = document.getElementById('sidebar-projects-count');
    if (projectsCountEl) {
      projectsCountEl.textContent = AppState.projects.length;
    }
  },

  /**
   * Sets up instant floating tooltips when the sidebar is collapsed
   */
  setupFloatingTooltips() {
    if (!this.sidebarEl) return;

    this.sidebarEl.addEventListener('mouseenter', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target && this.isCollapsed) {
        this.showTooltip(target);
      }
    }, true);

    this.sidebarEl.addEventListener('mouseleave', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) {
        this.hideTooltip();
      }
    }, true);
  },

  showTooltip(el) {
    if (!this.tooltipEl || !this.isCollapsed) return;
    const text = el.getAttribute('data-tooltip') || el.getAttribute('title');
    if (!text) return;

    this.tooltipEl.textContent = text;
    const rect = el.getBoundingClientRect();
    this.tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
    this.tooltipEl.style.left = `${rect.right + 10}px`;
    this.tooltipEl.classList.add('visible');
  },

  hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.classList.remove('visible');
    }
  }
};
