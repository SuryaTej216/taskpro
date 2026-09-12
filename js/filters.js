/**
 * TaskForge - Advanced Filtering Engine & Saved Views
 */

const FilterManager = {
  // Built-in Saved Custom Views
  savedViews: [
    {
      id: 'view_all',
      name: 'All Tasks',
      icon: 'fa-layer-group',
      filter: {}
    },
    {
      id: 'view_critical',
      name: 'My Critical Tasks',
      icon: 'fa-fire',
      filter: { priority: ['critical', 'highest'] }
    },
    {
      id: 'view_overdue',
      name: 'Overdue Tasks',
      icon: 'fa-calendar-xmark',
      filter: { isOverdue: true }
    },
    {
      id: 'view_today',
      name: 'Due Today',
      icon: 'fa-calendar-day',
      filter: { isDueToday: true }
    },
    {
      id: 'view_bugs',
      name: 'Active Bugs',
      icon: 'fa-bug',
      filter: { type: ['bug'], status: ['backlog', 'todo', 'inprogress', 'inreview'] }
    }
  ],

  activeViewId: 'view_all',

  /**
   * Applies active filters to a list of tasks
   * @param {Array<Object>} tasks 
   * @param {Object} customFilter 
   * @returns {Array<Object>}
   */
  filterTasks(tasks, customFilter = null) {
    const filter = customFilter || AppState.activeFilters;

    return tasks.filter(task => {
      // 1. Project constraint
      if (AppState.selectedProjectId && task.projectId !== AppState.selectedProjectId) {
        return false;
      }

      // 2. Status filter
      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(task.status)) return false;
      }

      // 3. Priority filter
      if (filter.priority && filter.priority.length > 0) {
        if (!filter.priority.includes(task.priority)) return false;
      }

      // 4. Issue Type filter
      if (filter.type && filter.type.length > 0) {
        if (!filter.type.includes(task.type)) return false;
      }

      // 5. Sprint filter
      if (filter.sprintId && task.sprintId !== filter.sprintId) {
        return false;
      }

      // 6. Labels filter
      if (filter.labels && filter.labels.length > 0) {
        if (!task.labels || !filter.labels.some(l => task.labels.includes(l))) {
          return false;
        }
      }

      // 7. Special dynamic flags
      if (filter.isOverdue && !Utils.isOverdue(task.dueDate, task.status)) {
        return false;
      }

      if (filter.isDueToday && !Utils.isDueToday(task.dueDate)) {
        return false;
      }

      // 8. Global search text
      if (AppState.searchQuery) {
        const text = AppState.searchQuery.toLowerCase();
        const matchesKey = task.key.toLowerCase().includes(text);
        const matchesTitle = task.title.toLowerCase().includes(text);
        if (!matchesKey && !matchesTitle) return false;
      }

      return true;
    });
  },

  /**
   * Switches to a saved view
   * @param {string} viewId 
   */
  applySavedView(viewId) {
    const view = this.savedViews.find(v => v.id === viewId);
    if (!view) return;

    this.activeViewId = viewId;
    AppState.activeFilters = { ...view.filter };
    AppState.emit('filters:changed');
    Toast.info(`View switched to: ${view.name}`);
  },

  /**
   * Resets all filters
   */
  clearFilters() {
    this.activeViewId = 'view_all';
    AppState.activeFilters = {
      status: [],
      priority: [],
      type: [],
      labels: [],
      sprintId: null
    };
    AppState.searchQuery = '';
    AppState.emit('filters:changed');
  }
};
