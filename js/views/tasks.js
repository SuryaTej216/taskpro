/**
 * TaskForge - Unified Tasks View Controller
 * Combines Kanban Board and Data Grid List View with an intuitive, seamless segmented switch.
 * Provides unified state synchronization across views (search query, filters, and status progression).
 */

const TasksView = {
  currentMode: (() => {
    try {
      const saved = localStorage.getItem('taskforge_tasks_view_mode');
      return (saved === 'list' || saved === 'board') ? saved : 'board';
    } catch (e) {
      return 'board';
    }
  })(),

  // Unified shared filter and search state across Board and List
  state: {
    searchQuery: '',
    selectedType: '',
    selectedPriority: '',
    activeQuickFilter: 'all',
    filtersMinimized: true
  },

  /**
   * Returns current active mode ('board' | 'list')
   */
  getMode() {
    return this.currentMode === 'list' ? 'list' : 'board';
  },

  /**
   * Synchronizes shared state to child views
   */
  syncStateToViews() {
    if (typeof BoardView !== 'undefined') {
      BoardView.searchQuery = this.state.searchQuery;
      BoardView.selectedType = this.state.selectedType;
      BoardView.selectedPriority = this.state.selectedPriority;
      BoardView.activeQuickFilter = this.state.activeQuickFilter;
      BoardView.filtersMinimized = this.state.filtersMinimized;
    }
    if (typeof ListView !== 'undefined') {
      ListView.searchQuery = this.state.searchQuery;
      ListView.selectedType = this.state.selectedType;
      ListView.selectedPriority = this.state.selectedPriority;
      ListView.activeQuickFilter = this.state.activeQuickFilter;
      ListView.filtersMinimized = this.state.filtersMinimized;
    }
  },

  /**
   * Synchronizes shared state from active child view
   */
  syncStateFromView(view) {
    if (!view) return;
    if (typeof view.searchQuery !== 'undefined') this.state.searchQuery = view.searchQuery;
    if (typeof view.selectedType !== 'undefined') this.state.selectedType = view.selectedType;
    if (typeof view.selectedPriority !== 'undefined') this.state.selectedPriority = view.selectedPriority;
    if (typeof view.activeQuickFilter !== 'undefined') this.state.activeQuickFilter = view.activeQuickFilter;
    if (typeof view.filtersMinimized !== 'undefined') this.state.filtersMinimized = view.filtersMinimized;
    this.syncStateToViews();
  },

  /**
   * Sets the active mode, updates localStorage, and smoothly renders
   * @param {'board'|'list'} mode 
   * @param {HTMLElement} [container]
   */
  setMode(mode, container) {
    if (mode !== 'board' && mode !== 'list') mode = 'board';
    if (this.currentMode === mode) return;

    // Harvest current active state from the currently active view
    if (this.currentMode === 'board' && typeof BoardView !== 'undefined') {
      this.syncStateFromView(BoardView);
    } else if (this.currentMode === 'list' && typeof ListView !== 'undefined') {
      this.syncStateFromView(ListView);
    }

    this.currentMode = mode;
    try {
      localStorage.setItem('taskforge_tasks_view_mode', mode);
    } catch (e) {
      console.warn('Could not persist tasks view mode to localStorage', e);
    }

    // Push synced state to destination view
    this.syncStateToViews();

    const targetContainer = container || document.getElementById('view-container');
    if (targetContainer) {
      this.render(targetContainer);
    }
  },

  /**
   * Generates the segmented view switcher HTML markup
   */
  renderSwitcherHTML() {
    const isBoard = this.getMode() === 'board';
    const isList = this.getMode() === 'list';

    return `
      <div class="tasks-view-segmented" role="tablist" aria-label="Tasks display format">
        <button type="button" 
          class="tasks-view-tab ${isBoard ? 'active' : ''}" 
          data-tasks-mode="board" 
          role="tab" 
          aria-selected="${isBoard}" 
          title="Switch to Kanban Board View">
          <i class="fa-solid fa-table-columns"></i>
          <span>Board</span>
        </button>
        <button type="button" 
          class="tasks-view-tab ${isList ? 'active' : ''}" 
          data-tasks-mode="list" 
          role="tab" 
          aria-selected="${isList}" 
          title="Switch to Data Grid List View">
          <i class="fa-solid fa-list-check"></i>
          <span>List</span>
        </button>
      </div>
    `;
  },

  /**
   * Attaches click handlers to any rendered switcher tabs inside the container
   * @param {HTMLElement} container 
   */
  bindSwitcherEvents(container) {
    if (!container) return;
    const tabs = container.querySelectorAll('.tasks-view-tab[data-tasks-mode]');
    tabs.forEach(tab => {
      tab.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetMode = tab.dataset.tasksMode;
        if (targetMode && targetMode !== this.getMode()) {
          this.setMode(targetMode, container);
        }
      };
    });
  },

  /**
   * Delegates rendering to BoardView or ListView based on currentMode
   * @param {HTMLElement} container 
   */
  render(container) {
    if (!container) return;
    const mode = this.getMode();

    // Ensure synced state is present before rendering
    this.syncStateToViews();

    if (mode === 'list' && typeof ListView !== 'undefined') {
      ListView.render(container);
    } else if (typeof BoardView !== 'undefined') {
      BoardView.render(container);
    }

    // Bind switcher events across the rendered view container
    this.bindSwitcherEvents(container);
  }
};
