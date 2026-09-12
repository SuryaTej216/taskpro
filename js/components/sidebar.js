/**
 * TaskForge - Sidebar Component Controller
 */

const Sidebar = {
  sidebarEl: null,
  toggleBtn: null,
  mobileToggleBtn: null,
  backdropEl: null,
  isCollapsed: false,

  init() {
    this.sidebarEl = document.getElementById('sidebar');
    this.toggleBtn = document.getElementById('sidebar-toggle-btn');
    this.mobileToggleBtn = document.getElementById('mobile-sidebar-toggle');
    this.backdropEl = document.getElementById('sidebar-mobile-backdrop');

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

    this.renderProjectShortcuts();
    this.updateCounters();

    // Listen to data mutations
    AppState.subscribe('tasks:changed', () => this.updateCounters());
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
    }
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
    document.querySelectorAll('#sidebar .nav-item').forEach(item => {
      if (item.dataset.view === viewName) {
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
   * Renders active project shortcuts in the sidebar
   */
  renderProjectShortcuts() {
    const container = document.getElementById('sidebar-projects-list');
    if (!container) return;

    container.innerHTML = AppState.projects.slice(0, 5).map(p => `
      <a href="#/board?project=${p.id}" class="nav-item" title="${Utils.escapeHTML(p.name)}" style="padding: 6px 12px; font-size: 13px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p.color || '#388bfd'}; flex-shrink: 0;"></span>
        <span style="overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHTML(p.name)}</span>
      </a>
    `).join('');
  },

  /**
   * Updates sidebar badge counts (My Work, Projects)
   */
  updateCounters() {
    const myWorkCountEl = document.getElementById('sidebar-mywork-count');
    const projectsCountEl = document.getElementById('sidebar-projects-count');

    if (myWorkCountEl) {
      const activeMyWork = AppState.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;
      myWorkCountEl.textContent = activeMyWork;
    }

    if (projectsCountEl) {
      projectsCountEl.textContent = AppState.projects.length;
    }
  }
};
