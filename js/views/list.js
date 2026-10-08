/**
 * TaskForge - Enterprise High-Density Data Grid & Bulk Operations View
 * 
 * Built for clarity, balance, and professional UX:
 * - Clean executive header with compact inline metrics (tasks, active, critical, improvements, completion)
 * - Single-row streamlined filter console (Search with '/', Project, Type, Status, Priority, Sprint, Reset)
 * - High-clarity quick-filter chips (All, In Progress, Critical, Improvements, Completed, Bugs, Due Today)
 * - Non-breaking monospace Key badges with crisp contrast
 * - Dedicated vibrant Improvement badge with light text
 * - Clean 2-line title & hierarchy architecture (Title on line 1, subtle metadata on line 2)
 * - Balanced row padding and inline status/priority dropdowns
 * - Luxury floating bulk operations capsule with 1-click Mark Done
 */

/**
 * Interactive DataGrid Floating Dropdown Component
 */
const DataGridDropdown = {
  toggle(triggerBtn, type, taskId, currentValue) {
    if (typeof DropdownUI !== 'undefined') {
      if (DropdownUI.activeTrigger === triggerBtn && DropdownUI.isOpen()) {
        DropdownUI.close();
        return;
      }
    }
    this.open(triggerBtn, type, taskId, currentValue);
  },

  open(triggerBtn, type, taskId, currentValue) {
    if (typeof DropdownUI === 'undefined') return;

    let title = '';
    let items = [];

    if (type === 'status') {
      title = 'Change Status';
      items = [
        { value: 'backlog', label: 'Backlog', icon: 'fa-solid fa-inbox', iconColor: '#64748B' },
        { value: 'todo', label: 'To Do', icon: 'fa-regular fa-circle', iconColor: '#2563EB' },
        { value: 'inprogress', label: 'In Progress', icon: 'fa-solid fa-spinner', iconColor: '#EA580C' },
        { value: 'inreview', label: 'In Review', icon: 'fa-solid fa-eye', iconColor: '#9333EA' },
        { value: 'done', label: 'Done', icon: 'fa-solid fa-circle-check', iconColor: '#059669' }
      ];
    } else if (type === 'priority') {
      title = 'Change Priority';
      items = [
        { value: 'critical', label: 'Critical', icon: 'fa-solid fa-angles-up', iconColor: '#DC2626' },
        { value: 'highest', label: 'Highest', icon: 'fa-solid fa-angle-up', iconColor: '#EA580C' },
        { value: 'high', label: 'High', icon: 'fa-solid fa-angle-up', iconColor: '#D97706' },
        { value: 'medium', label: 'Medium', icon: 'fa-solid fa-minus', iconColor: '#EAB308' },
        { value: 'low', label: 'Low', icon: 'fa-solid fa-angle-down', iconColor: '#3B82F6' },
        { value: 'lowest', label: 'Lowest', icon: 'fa-solid fa-angles-down', iconColor: '#94A3B8' }
      ];
    } else if (type === 'dueDate') {
      title = 'Change Due Date';
      items = [
        { value: 'today', label: 'Today', icon: 'fa-solid fa-calendar-day', iconColor: '#3B82F6' },
        { value: 'tomorrow', label: 'Tomorrow', icon: 'fa-solid fa-sun', iconColor: '#F59E0B' },
        { value: 'this_week', label: 'This Friday', icon: 'fa-solid fa-calendar-week', iconColor: '#10B981' },
        { value: 'next_week', label: 'Next Monday', icon: 'fa-solid fa-calendar-plus', iconColor: '#8B5CF6' },
        { value: 'in_2_weeks', label: 'In 2 Weeks', icon: 'fa-solid fa-calendar-days', iconColor: '#06B6D4' },
        { value: 'custom', label: 'Pick Date...', icon: 'fa-regular fa-calendar-check', iconColor: '#EC4899' },
        { value: 'clear', label: 'Clear Due Date', icon: 'fa-regular fa-calendar-xmark', iconColor: '#EF4444', isDanger: true }
      ];
    } else if (type === 'actions') {
      title = 'Task Actions';
      items = [
        { value: 'edit', label: 'Edit task', icon: 'fa-solid fa-pen-to-square' },
        { value: 'dueDate', label: 'Change due date...', icon: 'fa-regular fa-calendar' },
        { value: 'duplicate', label: 'Duplicate', icon: 'fa-regular fa-copy' },
        { value: 'delete', label: 'Delete task', icon: 'fa-regular fa-trash-can', isDanger: true }
      ];
    }

    DropdownUI.openMenu({
      trigger: triggerBtn,
      title,
      items,
      currentValue,
      searchable: false,
      onSelect: (newVal) => {
        const container = document.getElementById('view-container') || document.getElementById('main-content');
        if (type === 'actions') {
          if (newVal === 'edit') TaskModal.openDetail(taskId);
          if (newVal === 'dueDate') ListView.openBulkDueDateModal([taskId], container);
          if (newVal === 'duplicate') AppState.duplicateTask(taskId);
          if (newVal === 'delete') AppState.deleteTask(taskId, true, true);
          return;
        }

        if (type === 'dueDate') {
          if (newVal === 'custom') {
            ListView.openBulkDueDateModal([taskId], container);
            return;
          }
          if (newVal === 'clear') {
            AppState.updateTask(taskId, { dueDate: null });
            Toast.info('Cleared due date.');
          } else {
            const iso = ListView.calculateTargetDate(newVal);
            if (iso) {
              AppState.updateTask(taskId, { dueDate: iso });
              Toast.success(`Due date set to ${Utils.formatDate(iso)}.`);
            }
          }
          if (container) ListView.render(container);
          return;
        }

        const task = AppState.tasks.find(t => t.id === taskId);
        if (task && newVal) {
          if (type === 'status') {
            AppState.updateTask(taskId, { status: newVal });
          } else if (type === 'priority') {
            AppState.updateTask(taskId, { priority: newVal });
          }
        }
        if (container) ListView.render(container);
      }
    });
  },

  close() {
    if (typeof DropdownUI !== 'undefined') {
      DropdownUI.close();
    }
  }
};

const ListView = {
  selectedTaskIds: new Set(),
  lastClickedIndex: null,
  sortField: 'key',
  sortAsc: true,
  searchQuery: '',
  selectedType: '',
  selectedPriority: '',
  activeQuickFilter: 'all',
  filtersMinimized: true,
  density: 'comfortable',

  hasAnyActiveFilters() {
    return !!(
      (this.searchQuery && this.searchQuery.trim()) ||
      this.selectedType ||
      this.selectedPriority ||
      (AppState.activeFilters.type && AppState.activeFilters.type.length > 0) ||
      (AppState.activeFilters.priority && AppState.activeFilters.priority.length > 0) ||
      AppState.activeFilters.sprintId ||
      AppState.selectedProjectId ||
      (this.activeQuickFilter && this.activeQuickFilter !== 'all')
    );
  },

  getActiveFilterCount() {
    let count = 0;
    if (this.activeQuickFilter && this.activeQuickFilter !== 'all') count++;
    if (this.searchQuery && this.searchQuery.trim()) count++;
    if (this.selectedType || (AppState.activeFilters.type && AppState.activeFilters.type.length > 0)) count++;
    if (this.selectedPriority || (AppState.activeFilters.priority && AppState.activeFilters.priority.length > 0)) count++;
    if (AppState.activeFilters.sprintId) count++;
    if (AppState.selectedProjectId) count++;
    return count;
  },

  clearAllFilters(container) {
    this.searchQuery = '';
    this.selectedType = '';
    this.selectedPriority = '';
    this.activeQuickFilter = 'all';
    AppState.selectedProjectId = null;
    AppState.activeFilters.sprintId = null;
    AppState.activeFilters.type = [];
    AppState.activeFilters.priority = [];
    if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
      Router.updateTopbarProjectPicker();
    }
    if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
      TasksView.syncStateFromView(this);
    }
    this.render(container);
  },

  /**
   * Generates vibrant Atlassian Design System issue lozenges with icons & light text
   */
  getTypeBadgeHTML(type) {
    const t = (type || 'task').toLowerCase();
    switch (t) {
      case 'improvement':
        return `<span class="datagrid-type-badge type-badge-improvement" title="Improvement" role="img" aria-label="Improvement">
          <i class="fa-solid fa-arrow-up-right-dots" aria-hidden="true"></i>
        </span>`;
      case 'story':
        return `<span class="datagrid-type-badge type-badge-story" title="Story" role="img" aria-label="Story">
          <i class="fa-solid fa-bookmark" aria-hidden="true"></i>
        </span>`;
      case 'bug':
        return `<span class="datagrid-type-badge type-badge-bug" title="Bug" role="img" aria-label="Bug">
          <i class="fa-solid fa-bug" aria-hidden="true"></i>
        </span>`;
      case 'epic':
        return `<span class="datagrid-type-badge type-badge-epic" title="Epic" role="img" aria-label="Epic">
          <i class="fa-solid fa-bolt" aria-hidden="true"></i>
        </span>`;
      case 'subtask':
        return `<span class="datagrid-type-badge type-badge-subtask" title="Subtask" role="img" aria-label="Subtask">
          <i class="fa-solid fa-code-branch" aria-hidden="true"></i>
        </span>`;
      case 'task':
      default:
        return `<span class="datagrid-type-badge type-badge-task" title="Task" role="img" aria-label="Task">
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        </span>`;
    }
  },

  /**
   * Generates interactive status badge button
   */
  getStatusBadgeHTML(status, taskId) {
    const s = (status || 'todo').toLowerCase();
    const config = {
      backlog: { label: 'Backlog', icon: 'fa-solid fa-inbox' },
      todo: { label: 'To Do', icon: 'fa-regular fa-circle' },
      inprogress: { label: 'In Progress', icon: 'fa-solid fa-spinner' },
      inreview: { label: 'In Review', icon: 'fa-solid fa-eye' },
      done: { label: 'Done', icon: 'fa-solid fa-circle-check' }
    }[s] || { label: 'To Do', icon: 'fa-regular fa-circle' };

    return `
      <button type="button" class="datagrid-dropdown-btn cell-status-btn cell-status-${s}" data-action="toggle-status-menu" data-id="${taskId}" data-current="${s}" title="Change status (${config.label})">
        <span class="btn-inner">
          <i class="${config.icon} btn-icon"></i>
          <span class="btn-label">${config.label}</span>
        </span>
        <i class="fa-solid fa-chevron-down btn-chevron"></i>
      </button>
    `;
  },

  /**
   * Generates interactive priority badge button
   */
  getPriorityBadgeHTML(priority, taskId) {
    const p = (priority || 'medium').toLowerCase();
    const config = {
      critical: { label: 'Critical', icon: 'fa-solid fa-angles-up' },
      highest: { label: 'Highest', icon: 'fa-solid fa-angle-up' },
      high: { label: 'High', icon: 'fa-solid fa-angle-up' },
      medium: { label: 'Medium', icon: 'fa-solid fa-minus' },
      low: { label: 'Low', icon: 'fa-solid fa-angle-down' },
      lowest: { label: 'Lowest', icon: 'fa-solid fa-angles-down' }
    }[p] || { label: 'Medium', icon: 'fa-solid fa-minus' };

    return `
      <button type="button" class="datagrid-dropdown-btn cell-prio-btn cell-prio-${p}" data-action="toggle-prio-menu" data-id="${taskId}" data-current="${p}" title="Change priority (${config.label})">
        <span class="btn-inner">
          <i class="${config.icon} btn-icon"></i>
          <span class="btn-label">${config.label}</span>
        </span>
        <i class="fa-solid fa-chevron-down btn-chevron"></i>
      </button>
    `;
  },

  /**
   * Calculates ISO date string for standard presets (midday local to prevent timezone date flips)
   */
  calculateTargetDate(preset) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);

    if (preset === 'today') {
      return d.toISOString();
    }
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    if (preset === 'this_week') {
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString();
    }
    if (preset === 'next_week') {
      const day = d.getDay();
      const diff = ((1 - day + 7) % 7) || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString();
    }
    if (preset === 'in_2_weeks') {
      d.setDate(d.getDate() + 14);
      return d.toISOString();
    }
    return null;
  },

  /**
   * Generates interactive due date badge button for data grid table cells
   */
  getDueDateBadgeHTML(task) {
    const isOverdue = Utils.isOverdue(task.dueDate, task.status);
    const isToday = Utils.isDueToday(task.dueDate);

    let dateDisplay = 'Set date';
    let dateClass = 'cell-date-empty';
    let dateIcon = 'fa-regular fa-calendar-plus';

    if (task.dueDate) {
      if (isOverdue) {
        dateDisplay = Utils.formatDate(task.dueDate);
        dateClass = 'cell-date-overdue datagrid-date-overdue';
        dateIcon = 'fa-solid fa-triangle-exclamation';
      } else if (isToday) {
        dateDisplay = 'Today';
        dateClass = 'cell-date-today datagrid-date-today';
        dateIcon = 'fa-solid fa-calendar-day';
      } else {
        dateDisplay = Utils.formatDate(task.dueDate);
        dateClass = 'cell-date-set';
        dateIcon = 'fa-regular fa-calendar';
      }
    }

    return `
      <button type="button" class="datagrid-dropdown-btn cell-date-btn ${dateClass}" data-action="toggle-date-menu" data-id="${task.id}" data-current="${task.dueDate || ''}" title="Change due date (${dateDisplay})">
        <span class="btn-inner">
          <i class="${dateIcon} btn-icon"></i>
          <span class="btn-label">${dateDisplay}</span>
        </span>
        <i class="fa-solid fa-chevron-down btn-chevron"></i>
      </button>
    `;
  },

  render(container) {
    // 0. Close any open floating dropdown
    DataGridDropdown.close();

    // 0b. Sync with TasksView shared state if available
    if (typeof TasksView !== 'undefined' && TasksView.state) {
      this.searchQuery = TasksView.state.searchQuery ?? this.searchQuery;
      this.selectedType = TasksView.state.selectedType ?? this.selectedType;
      this.selectedPriority = TasksView.state.selectedPriority ?? this.selectedPriority;
      this.activeQuickFilter = TasksView.state.activeQuickFilter ?? this.activeQuickFilter;
      this.filtersMinimized = TasksView.state.filtersMinimized ?? this.filtersMinimized;
    }

    // 1. Clean ghost IDs
    const validTaskIdSet = new Set(AppState.tasks.map(t => t.id));
    this.selectedTaskIds = new Set([...this.selectedTaskIds].filter(id => validTaskIdSet.has(id)));

    // 2. Base tasks pool (exclude cancelled)
    const allTasks = AppState.tasks.filter(t => t.status !== 'cancelled');
    let tasks = allTasks;

    // 3. Project filter
    if (AppState.selectedProjectId) {
      tasks = tasks.filter(t => t.projectId === AppState.selectedProjectId);
    }

    // 4. Sprint filter
    if (AppState.activeFilters.sprintId) {
      tasks = tasks.filter(t => t.sprintId === AppState.activeFilters.sprintId);
    }

    // 5. Issue Type filter
    const activeType = this.selectedType || (AppState.activeFilters.type && AppState.activeFilters.type[0]) || '';
    if (activeType) {
      tasks = tasks.filter(t => t.type === activeType);
    }

    // 6. Priority filter
    const activePriority = this.selectedPriority || (AppState.activeFilters.priority && AppState.activeFilters.priority[0]) || '';
    if (activePriority) {
      tasks = tasks.filter(t => t.priority === activePriority);
    }

    // 7. Quick filter chips & stage segment filters
    if (this.activeQuickFilter === 'inprogress') {
      tasks = tasks.filter(t => t.status === 'inprogress');
    } else if (this.activeQuickFilter === 'backlog') {
      tasks = tasks.filter(t => t.status === 'backlog');
    } else if (this.activeQuickFilter === 'todo') {
      tasks = tasks.filter(t => t.status === 'todo');
    } else if (this.activeQuickFilter === 'inreview') {
      tasks = tasks.filter(t => t.status === 'inreview');
    } else if (this.activeQuickFilter === 'done') {
      tasks = tasks.filter(t => t.status === 'done');
    } else if (this.activeQuickFilter === 'critical') {
      tasks = tasks.filter(t => t.priority === 'critical' || t.priority === 'highest');
    } else if (this.activeQuickFilter === 'bugs') {
      tasks = tasks.filter(t => t.type === 'bug');
    } else if (this.activeQuickFilter === 'improvements') {
      tasks = tasks.filter(t => t.type === 'improvement');
    } else if (this.activeQuickFilter === 'overdue') {
      tasks = tasks.filter(t => Utils.isOverdue(t.dueDate, t.status));
    } else if (this.activeQuickFilter === 'today') {
      tasks = tasks.filter(t => Utils.isDueToday(t.dueDate));
    }

    // 8. Search query filter
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      tasks = tasks.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.key && t.key.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q)) ||
        (t.labels && t.labels.some(l => l.toLowerCase().includes(q)))
      );
    }

    // 9. Natural Sorting (handles WEB-1, WEB-2, WEB-10 correctly)
    const priorityWeights = { critical: 5, highest: 4, high: 3, medium: 2, low: 1, lowest: 0 };
    const statusWeights = { backlog: 0, todo: 1, inprogress: 2, inreview: 3, done: 4 };

    tasks.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      if (this.sortField === 'key') {
        const numA = parseInt((a.key || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.key || '').replace(/\D/g, ''), 10) || 0;
        return this.sortAsc ? numA - numB : numB - numA;
      }

      if (this.sortField === 'priority') {
        const pA = priorityWeights[a.priority] || 0;
        const pB = priorityWeights[b.priority] || 0;
        return this.sortAsc ? pA - pB : pB - pA;
      }

      if (this.sortField === 'status') {
        const sA = statusWeights[a.status] || 0;
        const sB = statusWeights[b.status] || 0;
        return this.sortAsc ? sA - sB : sB - sA;
      }

      if (this.sortField === 'storyPoints') {
        const nA = Number(valA) || 0;
        const nB = Number(valB) || 0;
        return this.sortAsc ? nA - nB : nB - nA;
      }

      if (this.sortField === 'dueDate' || this.sortField === 'createdAt') {
        const dateA = valA ? new Date(valA).getTime() : 0;
        const dateB = valB ? new Date(valB).getTime() : 0;
        return this.sortAsc ? dateA - dateB : dateB - dateA;
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });

    const isAllSelected = tasks.length > 0 && tasks.every(t => this.selectedTaskIds.has(t.id));
    const isSomeSelected = tasks.some(t => this.selectedTaskIds.has(t.id)) && !isAllSelected;

    // Metrics calculations
    const totalCount = tasks.length;
    const totalPoints = tasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const doneTasks = tasks.filter(t => t.status === 'done');
    const inProgressCount = tasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;
    const overdueCount = tasks.filter(t => Utils.isOverdue(t.dueDate, t.status)).length;
    const completionPct = totalCount > 0 ? Math.round((doneTasks.length / totalCount) * 100) : 0;
    const donePct = completionPct;

    const statusCounts = {
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      inreview: tasks.filter(t => t.status === 'inreview').length,
      done: doneTasks.length
    };

    const hasFilters = this.hasAnyActiveFilters();
    const activeFilterCount = this.getActiveFilterCount();
    const selectedProject = AppState.projects.find(p => p.id === AppState.selectedProjectId);
    const activeSprint = AppState.sprints.find(s => s.id === AppState.activeFilters.sprintId);

    container.innerHTML = `
      <div class="view-page board-view-page">
        
        <!-- ROW 1: Executive Command Header (Harmonized layout with Board View) -->
        <div class="view-header board-executive-header">
          <div class="view-title-group">
            <h1>
              <i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i>
              <span>${selectedProject ? Utils.escapeHTML(selectedProject.name) : 'All Projects'} Tasks</span>
              ${activeSprint ? `
                <span class="board-sprint-badge" title="Active Sprint: ${Utils.escapeHTML(activeSprint.name)}">
                  <i class="fa-solid fa-person-running"></i>
                  <span>${Utils.escapeHTML(activeSprint.name)}</span>
                </span>
              ` : ''}
            </h1>
            <p>Manage, track, and update workflow progress across your team.</p>
          </div>

          <div class="view-actions">
            <!-- View Mode Switcher (Board vs List) -->
            ${typeof TasksView !== 'undefined' ? TasksView.renderSwitcherHTML() : ''}

            <!-- Compact Search -->
            <div class="board-search-field-compact">
              <i class="fa-solid fa-magnifying-glass search-field-icon"></i>
              <input type="text" id="datagrid-search-input" placeholder="Search... (/)" value="${Utils.escapeHTML(this.searchQuery)}" autocomplete="off">
              <span class="search-kbd-pill" title="Press '/' to search">/</span>
              ${this.searchQuery ? `<button type="button" id="datagrid-search-clear" class="search-field-clear" title="Clear search"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>

            <!-- Filters Toggle Button -->
            <button type="button" id="datagrid-btn-toggle-filters" class="board-filters-toggle-btn ${!this.filtersMinimized ? 'is-open' : ''} ${hasFilters ? 'has-active-filters' : ''}" title="${this.filtersMinimized ? 'Show Filters' : 'Minimize Filters'}">
              <i class="fa-solid fa-sliders"></i>
              <span>Filters</span>
              ${activeFilterCount > 0 ? `<span class="filters-count-badge">${activeFilterCount}</span>` : ''}
              <i class="fa-solid ${this.filtersMinimized ? 'fa-chevron-down' : 'fa-chevron-up'} toggle-chevron"></i>
            </button>

            <!-- Table Density & Sort Toggles (Identical 2-button width matching Board View) -->
            <div class="board-view-toggles-group">
              <button type="button" id="datagrid-btn-density" class="btn btn-ghost btn-sm btn-icon" title="Density: ${this.density === 'compact' ? 'Compact' : 'Comfortable'}">
                <i class="fa-solid ${this.density === 'compact' ? 'fa-bars-staggered' : 'fa-bars'}"></i>
              </button>
              <button type="button" id="datagrid-btn-reset-sort" class="btn btn-ghost btn-sm btn-icon" title="Reset column sorting (Default: Key)">
                <i class="fa-solid fa-arrow-down-short-wide"></i>
              </button>
            </div>

            <!-- New Task Primary Action -->
            <button type="button" id="btn-list-create" class="btn btn-primary btn-sm btn-create-task" title="Create New Task (C)">
              <i class="fa-solid fa-plus"></i>
              <span>New Task</span>
              <kbd class="board-kbd-hint">C</kbd>
            </button>
          </div>
        </div>

        <!-- ROW 2: Executive Overall Status Progression & Health Center -->
        <div class="board-executive-statusbar">
          <div class="statusbar-center-group">
            <div class="board-stage-distribution-bar" title="Interactive Workflow Distribution">
              ${totalCount > 0 ? `
                <div class="stage-seg seg-backlog ${this.activeQuickFilter === 'backlog' ? 'is-selected' : ''}" data-status="backlog" style="width: ${(statusCounts.backlog / totalCount) * 100}%;" title="Backlog: ${statusCounts.backlog} (${Math.round((statusCounts.backlog / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-todo ${this.activeQuickFilter === 'todo' ? 'is-selected' : ''}" data-status="todo" style="width: ${(statusCounts.todo / totalCount) * 100}%;" title="To Do: ${statusCounts.todo} (${Math.round((statusCounts.todo / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-inprogress ${this.activeQuickFilter === 'inprogress' ? 'is-selected' : ''}" data-status="inprogress" style="width: ${(statusCounts.inprogress / totalCount) * 100}%;" title="In Progress: ${statusCounts.inprogress} (${Math.round((statusCounts.inprogress / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-inreview ${this.activeQuickFilter === 'inreview' ? 'is-selected' : ''}" data-status="inreview" style="width: ${(statusCounts.inreview / totalCount) * 100}%;" title="In Review: ${statusCounts.inreview} (${Math.round((statusCounts.inreview / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-done ${this.activeQuickFilter === 'done' ? 'is-selected' : ''}" data-status="done" style="width: ${(statusCounts.done / totalCount) * 100}%;" title="Done: ${statusCounts.done} (${Math.round((statusCounts.done / totalCount) * 100)}%) - Click to filter"></div>
              ` : `
                <div class="stage-seg is-empty" style="width: 100%;"></div>
              `}
            </div>

            <div class="board-status-metrics-strip">
              <span class="status-metric-pill stat-total" title="Total Filtered Tasks">
                <i class="fa-solid fa-layer-group"></i> <span><strong>${totalCount}</strong> Tasks</span>
              </span>
              <span class="status-metric-pill stat-points" title="Total Story Points">
                <i class="fa-solid fa-diamond"></i> <span><strong>${totalPoints}</strong> pts</span>
              </span>
              <span class="status-metric-pill stat-active" title="Tasks In Progress or In Review">
                <i class="fa-solid fa-bolt-lightning"></i> <span><strong>${inProgressCount}</strong> active</span>
              </span>
              <span class="status-metric-pill stat-completion ${completionPct === 100 ? 'is-complete' : ''}" title="${doneTasks.length} of ${totalCount} tasks completed (${completionPct}%)">
                <i class="fa-solid fa-circle-check"></i> <span><strong>${completionPct}%</strong> done</span>
              </span>
              ${overdueCount > 0 ? `
                <button type="button" class="status-metric-pill stat-overdue ${this.activeQuickFilter === 'overdue' ? 'active' : ''}" id="datagrid-metric-overdue" title="Click to filter overdue tasks">
                  <i class="fa-solid fa-triangle-exclamation"></i> <span><strong>${overdueCount}</strong> overdue</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- COLLAPSIBLE FILTER CONSOLE (Shown when !this.filtersMinimized) -->
        ${!this.filtersMinimized ? `
          <div class="board-collapsible-filter-panel">
            <div class="filter-panel-inner">
              
              <!-- Selectors Group -->
              <div class="filter-panel-selectors">
                <!-- Project Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-folder-tree select-leading-icon" style="color: #388BFD;"></i>
                  <select id="datagrid-project-filter" class="board-select-control" title="Filter by Project">
                    <option value="">All Projects</option>
                    ${AppState.projects.map(p => `
                      <option value="${p.id}" ${p.id === AppState.selectedProjectId ? 'selected' : ''}>
                        ${Utils.escapeHTML(p.name)}
                      </option>
                    `).join('')}
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>

                <!-- Sprint Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-person-running select-leading-icon" style="color: #E06C00;"></i>
                  <select id="datagrid-sprint-filter" class="board-select-control" title="Filter by Sprint">
                    <option value="">All Sprints</option>
                    ${AppState.sprints.map(s => `
                      <option value="${s.id}" ${AppState.activeFilters.sprintId === s.id ? 'selected' : ''}>
                        ${s.status === 'active' ? '⚡ ' : ''}${Utils.escapeHTML(s.name)}
                      </option>
                    `).join('')}
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>

                <!-- Work Type Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-shapes select-leading-icon" style="color: #AF59E1;"></i>
                  <select id="datagrid-type-filter" class="board-select-control" title="Filter by Type of Work">
                    <option value="">All Types</option>
                    <option value="bug" ${activeType === 'bug' ? 'selected' : ''}>Bug</option>
                    <option value="story" ${activeType === 'story' ? 'selected' : ''}>Story</option>
                    <option value="task" ${activeType === 'task' ? 'selected' : ''}>Task</option>
                    <option value="improvement" ${activeType === 'improvement' ? 'selected' : ''}>Improvement</option>
                    <option value="epic" ${activeType === 'epic' ? 'selected' : ''}>Epic</option>
                    <option value="subtask" ${activeType === 'subtask' ? 'selected' : ''}>Subtask</option>
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>

                <!-- Priority Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-arrow-up-wide-short select-leading-icon" style="color: #E2483D;"></i>
                  <select id="datagrid-priority-filter" class="board-select-control" title="Filter by Priority">
                    <option value="">All Priorities</option>
                    <option value="critical" ${activePriority === 'critical' ? 'selected' : ''}>Critical</option>
                    <option value="highest" ${activePriority === 'highest' ? 'selected' : ''}>Highest</option>
                    <option value="high" ${activePriority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${activePriority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${activePriority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="lowest" ${activePriority === 'lowest' ? 'selected' : ''}>Lowest</option>
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>
              </div>

              <!-- Quick Chips Group -->
              <div class="filter-panel-chips">
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'all' && !hasFilters ? 'active' : ''}" data-filter="all">
                  <span>All</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'inprogress' ? 'active' : ''}" data-filter="inprogress">
                  <i class="fa-solid fa-bolt" style="color: #E06C00;"></i>
                  <span>In Progress</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'critical' ? 'active' : ''}" data-filter="critical">
                  <i class="fa-solid fa-fire" style="color: #EF4444;"></i>
                  <span>Critical</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'bugs' ? 'active' : ''}" data-filter="bugs">
                  <i class="fa-solid fa-bug" style="color: #EF4444;"></i>
                  <span>Bugs</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'improvements' ? 'active' : ''}" data-filter="improvements">
                  <i class="fa-solid fa-arrow-up-right-dots" style="color: #00A3BF;"></i>
                  <span>Improvements</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'overdue' ? 'active' : ''}" data-filter="overdue">
                  <i class="fa-solid fa-triangle-exclamation" style="color: #E06C00;"></i>
                  <span>Overdue</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'today' ? 'active' : ''}" data-filter="today">
                  <i class="fa-solid fa-calendar-day" style="color: #3B82F6;"></i>
                  <span>Due Today</span>
                </button>
              </div>

              <!-- Actions: Clear & Minimize -->
              <div class="filter-panel-actions">
                ${hasFilters ? `
                  <button type="button" id="datagrid-btn-reset-filters" class="board-filter-clear-all" title="Clear all filters">
                    <i class="fa-solid fa-xmark"></i>
                    <span>Clear (${activeFilterCount})</span>
                  </button>
                ` : ''}
                <button type="button" id="datagrid-btn-minimize-filters" class="btn-minimize-panel" title="Minimize filters to single status bar">
                  <i class="fa-solid fa-chevron-up"></i>
                  <span>Minimize</span>
                </button>
              </div>

            </div>
          </div>
        ` : ''}

        <!-- ACTIVE FILTERS SUMMARY STRIP (Shown when minimized AND filters are active) -->
        ${this.filtersMinimized && hasFilters ? `
          <div class="board-minimized-active-strip">
            <span class="active-strip-label"><i class="fa-solid fa-filter"></i> Filters:</span>
            <div class="active-strip-chips">
              ${this.searchQuery ? `
                <button type="button" class="min-filter-chip" data-clear="search" title="Remove search filter">
                  <span>"${Utils.escapeHTML(this.searchQuery)}"</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${selectedProject ? `
                <button type="button" class="min-filter-chip" data-clear="project" title="Remove project filter">
                  <i class="fa-solid fa-folder-tree" style="color: #388BFD;"></i> <span>${Utils.escapeHTML(selectedProject.name)}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${activeSprint ? `
                <button type="button" class="min-filter-chip" data-clear="sprint" title="Remove sprint filter">
                  <i class="fa-solid fa-person-running" style="color: #E06C00;"></i> <span>${Utils.escapeHTML(activeSprint.name)}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${activeType ? `
                <button type="button" class="min-filter-chip" data-clear="type" title="Remove type filter">
                  <i class="fa-solid fa-shapes" style="color: #AF59E1;"></i> <span>${activeType}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${activePriority ? `
                <button type="button" class="min-filter-chip" data-clear="priority" title="Remove priority filter">
                  <i class="fa-solid fa-arrow-up-wide-short" style="color: #E2483D;"></i> <span>${activePriority}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${this.activeQuickFilter !== 'all' ? `
                <button type="button" class="min-filter-chip" data-clear="quick" title="Remove quick filter">
                  <i class="fa-solid fa-bolt"></i> <span>${this.activeQuickFilter}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
            </div>
            <button type="button" id="datagrid-btn-reset-filters-min" class="btn-clear-active-min" title="Clear all active filters">
              <i class="fa-solid fa-xmark"></i> Clear All
            </button>
          </div>
        ` : ''}

        <!-- Main Data Grid Card (Zero horizontal side-scroll, perfectly constrained) -->
        <div class="datagrid-table-card tasks-view-content-fade">
          <div class="datagrid-scroll-wrapper">
            <table class="datagrid-table ${this.density === 'compact' ? 'is-compact' : ''}">
              <thead>
                <tr>
                  <th class="col-chk">
                    <input type="checkbox" id="chk-select-all" class="datagrid-chk" ${isAllSelected ? 'checked' : ''} title="Select All (Shift+Click rows for range)">
                  </th>
                  <th class="sortable col-key ${this.sortField === 'key' ? 'sorted' : ''}" data-sort="key">
                    Key <i class="fa-solid ${this.sortField === 'key' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-type ${this.sortField === 'type' ? 'sorted' : ''}" data-sort="type">
                    Type <i class="fa-solid ${this.sortField === 'type' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-title ${this.sortField === 'title' ? 'sorted' : ''}" data-sort="title">
                    Title & Hierarchy <i class="fa-solid ${this.sortField === 'title' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-status ${this.sortField === 'status' ? 'sorted' : ''}" data-sort="status">
                    Status <i class="fa-solid ${this.sortField === 'status' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-prio ${this.sortField === 'priority' ? 'sorted' : ''}" data-sort="priority">
                    Priority <i class="fa-solid ${this.sortField === 'priority' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-date ${this.sortField === 'dueDate' ? 'sorted' : ''}" data-sort="dueDate">
                    Due Date <i class="fa-solid ${this.sortField === 'dueDate' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-pts ${this.sortField === 'storyPoints' ? 'sorted' : ''}" data-sort="storyPoints">
                    Pts <i class="fa-solid ${this.sortField === 'storyPoints' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="col-actions" aria-label="Actions" title="Actions">
                    <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${tasks.length === 0 ? `
                  <tr>
                    <td colspan="9" style="padding: 48px 20px; text-align: center; color: var(--text-muted);">
                      <i class="fa-solid fa-list-check" style="font-size: 36px; margin-bottom: 12px; display: block; color: var(--border-bold);"></i>
                      <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">No Tasks Match Criteria</div>
                      <div style="font-size: 13px; margin-bottom: 16px; max-width: 400px; margin-left: auto; margin-right: auto; color: var(--text-secondary);">
                        ${this.searchQuery.trim() || AppState.selectedProjectId
                          ? 'No tasks match your search or selected project.'
                          : 'Create your first task to track progress and sprint workflows.'}
                      </div>
                      ${!this.searchQuery.trim() && !AppState.selectedProjectId
                        ? `<button class="btn btn-primary btn-sm" onclick="TaskModal.openCreate()"><i class="fa-solid fa-plus"></i> Create New Task</button>`
                        : ''}
                    </td>
                  </tr>
                ` : tasks.map((t, index) => {
                  const isSelected = this.selectedTaskIds.has(t.id);
                  const parentTask = t.parentId ? AppState.tasks.find(p => p.id === t.parentId) : null;
                  const sprint = t.sprintId ? AppState.sprints.find(s => s.id === t.sprintId) : null;
                  const project = AppState.projects.find(p => p.id === t.projectId);
                  const isOverdue = Utils.isOverdue(t.dueDate, t.status);
                  const isToday = Utils.isDueToday(t.dueDate);

                  let dateDisplay = '—';
                  let dateClass = '';
                  if (t.dueDate) {
                    if (isOverdue) {
                      dateDisplay = `<i class="fa-solid fa-triangle-exclamation"></i> ${Utils.formatDate(t.dueDate)}`;
                      dateClass = 'datagrid-date-overdue';
                    } else if (isToday) {
                      dateDisplay = `<i class="fa-solid fa-calendar-day"></i> Today`;
                      dateClass = 'datagrid-date-today';
                    } else {
                      dateDisplay = Utils.formatDate(t.dueDate);
                    }
                  }

                  return `
                    <tr class="datagrid-row ${isSelected ? 'row-selected' : ''}" data-id="${t.id}" data-index="${index}">
                      <td class="col-chk">
                        <input type="checkbox" class="datagrid-chk chk-task-row" data-id="${t.id}" data-index="${index}" ${isSelected ? 'checked' : ''}>
                      </td>
                      <td class="col-key">
                        <span class="datagrid-key-link" onclick="TaskModal.openDetail('${t.id}')" title="Open task details">
                          ${t.key}
                        </span>
                      </td>
                      <td class="col-type">
                        ${this.getTypeBadgeHTML(t.type)}
                      </td>
                      <td class="col-title">
                        <div class="datagrid-title-container">
                          <!-- Line 1: Main Task Title -->
                          <div class="datagrid-title-line">
                            <span class="datagrid-title-text ${t.status === 'done' ? 'title-done' : ''}" onclick="TaskModal.openDetail('${t.id}')" title="${Utils.escapeHTML(t.title)}">
                              ${Utils.escapeHTML(t.title)}
                            </span>
                          </div>

                          <!-- Line 2: Subtle Balanced Context Badges -->
                          <div class="datagrid-hierarchy-line">
                            ${parentTask ? `
                              <span class="datagrid-meta-badge datagrid-meta-parent" onclick="TaskModal.openDetail('${parentTask.id}')" title="Parent: ${Utils.escapeHTML(parentTask.title)}">
                                <i class="fa-solid fa-arrow-turn-down-right"></i> ${parentTask.key}
                              </span>
                            ` : ''}
                            ${sprint ? `
                              <span class="datagrid-meta-badge datagrid-meta-sprint" title="Sprint: ${Utils.escapeHTML(sprint.name)}">
                                <i class="fa-solid fa-person-running"></i> ${Utils.escapeHTML(sprint.name.split(':')[0])}
                              </span>
                            ` : ''}
                            ${!AppState.selectedProjectId && project ? `
                              <span class="datagrid-meta-badge datagrid-meta-project" title="Project: ${Utils.escapeHTML(project.name)}">
                                <span class="meta-project-dot" style="background: ${project.color || '#1868DB'};"></span>
                                ${Utils.escapeHTML(project.name.length > 16 ? project.name.substring(0, 14) + '...' : project.name)}
                              </span>
                            ` : ''}
                            ${(t.labels && t.labels.length > 0) ? `
                              ${t.labels.slice(0, 2).map(l => `<span class="datagrid-meta-badge datagrid-meta-label">#${Utils.escapeHTML(l)}</span>`).join('')}
                              ${t.labels.length > 2 ? `<span class="datagrid-meta-badge datagrid-meta-label" title="${Utils.escapeHTML(t.labels.slice(2).join(', '))}">+${t.labels.length - 2}</span>` : ''}
                            ` : ''}
                          </div>
                        </div>
                      </td>
                      <td class="col-status">
                        ${this.getStatusBadgeHTML(t.status, t.id)}
                      </td>
                      <td class="col-prio">
                        ${this.getPriorityBadgeHTML(t.priority, t.id)}
                      </td>
                      <td class="col-date">
                        ${this.getDueDateBadgeHTML(t)}
                      </td>
                      <td class="col-pts">
                        <span class="datagrid-points-pill" title="Story Points">${t.storyPoints || 0}</span>
                      </td>
                      <td class="col-actions">
                        <button type="button" class="datagrid-dropdown-btn datagrid-row-action-menu" data-action="toggle-actions-menu" data-id="${t.id}" title="Task actions" aria-label="Task actions" aria-haspopup="menu" aria-expanded="false">
                          <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Summary Metrics Footer -->
          <div class="datagrid-footer">
            <div class="datagrid-footer-left">
              <div class="datagrid-metric-item">
                <span>Showing:</span>
                <strong>${tasks.length}</strong> of <strong>${allTasks.length}</strong> tasks
              </div>
              <div class="datagrid-metric-item">
                <span>Story Points:</span>
                <strong>${totalPoints}</strong>
              </div>
              <div class="datagrid-metric-item">
                <span>Progress:</span>
                <strong>${donePct}%</strong>
                <div class="datagrid-progress-mini">
                  <div class="datagrid-progress-fill" style="width: ${donePct}%;"></div>
                </div>
              </div>
              ${overdueCount > 0 ? `
                <div class="datagrid-metric-item" style="color: #EF4444;">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <strong>${overdueCount}</strong> overdue
                </div>
              ` : ''}
            </div>

            <div class="datagrid-footer-right">
              ${this.selectedTaskIds.size > 0 ? `
                <div class="datagrid-metric-item" style="color: #0BDA51;">
                  <i class="fa-solid fa-check-double"></i>
                  <strong>${this.selectedTaskIds.size}</strong> selected
                </div>
              ` : ''}
              <div style="font-size: 11px; color: var(--text-muted);">
                <i class="fa-regular fa-keyboard"></i> Shift+Click for range • / to search • Esc to clear
              </div>
            </div>
          </div>
        </div>

        <!-- Floating Bulk Operations Toolbar (Atlassian Design System) -->
        ${this.selectedTaskIds.size > 0 ? `
          <div id="datagrid-bulk-toolbar" class="bulk-operations-bar">
            
            <!-- Selection Counter Pill -->
            <div class="bulk-counter-pill">
              <i class="fa-solid fa-check-double"></i>
              <span><strong>${this.selectedTaskIds.size}</strong> selected</span>
            </div>

            <div class="bulk-divider"></div>

            <!-- 1-Click "Mark Done" Action Button -->
            <button id="btn-bulk-markdone" class="btn btn-sm bulk-btn-markdone" title="Complete all selected tasks with 1 click">
              <i class="fa-solid fa-circle-check"></i> Mark Done
            </button>

            <!-- Bulk Status Selector -->
            <select id="bulk-status-select" class="bulk-select" title="Change Status">
              <option value="">Status...</option>
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="inreview">In Review</option>
              <option value="done">Done</option>
            </select>

            <!-- Bulk Priority Selector -->
            <select id="bulk-priority-select" class="bulk-select" title="Change Priority">
              <option value="">Priority...</option>
              <option value="critical">Critical</option>
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <!-- Bulk Sprint Selector -->
            <select id="bulk-sprint-select" class="bulk-select" title="Assign to Sprint">
              <option value="">Sprint...</option>
              <option value="__backlog__">Backlog Pool</option>
              ${AppState.sprints.map(s => `
                <option value="${s.id}">${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]</option>
              `).join('')}
            </select>

            <!-- Bulk Due Date Selector -->
            <select id="bulk-duedate-select" class="bulk-select" title="Change Due Date">
              <option value="">Due Date...</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this_week">This Friday</option>
              <option value="next_week">Next Monday</option>
              <option value="in_2_weeks">In 2 Weeks</option>
              <option value="custom">Pick Date...</option>
              <option value="clear">Clear Due Date</option>
            </select>

            <!-- Bulk Date Picker Modal Button -->
            <button id="btn-bulk-datepicker" class="btn btn-secondary btn-sm bulk-btn-calendar" title="Pick custom deadline on calendar">
              <i class="fa-regular fa-calendar-days"></i>
            </button>

            <div class="bulk-divider"></div>

            <!-- Bulk Duplicate Action -->
            <button id="btn-bulk-duplicate" class="btn btn-secondary btn-sm" title="Duplicate selected tasks">
              <i class="fa-regular fa-copy"></i> Duplicate
            </button>

            <!-- Bulk Delete Action -->
            <button id="btn-bulk-delete" class="btn btn-danger btn-sm" title="Delete selected tasks">
              <i class="fa-regular fa-trash-can"></i> Delete
            </button>

            <!-- Clear / Close Button -->
            <button id="btn-bulk-clear" class="btn btn-ghost btn-sm bulk-btn-clear" title="Clear selection (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>

          </div>
        ` : ''}

      </div>
    `;

    // Indeterminate state for select all checkbox
    const selectAllChk = container.querySelector('#chk-select-all');
    if (selectAllChk) {
      selectAllChk.indeterminate = isSomeSelected;
    }

    this.attachEventListeners(container, tasks);
  },

  attachEventListeners(container, tasks) {
    // Bind TasksView switcher if embedded
    if (typeof TasksView !== 'undefined' && typeof TasksView.bindSwitcherEvents === 'function') {
      TasksView.bindSwitcherEvents(container);
    }

    // 1. Search Box input with immediate live filtering & cursor preservation
    const searchInput = container.querySelector('#datagrid-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
        const newSearchInput = container.querySelector('#datagrid-search-input');
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.selectionStart = newSearchInput.selectionEnd = newSearchInput.value.length;
        }
      });
    }

    // Search clear button
    const searchClearBtn = container.querySelector('#datagrid-search-clear');
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    // 2. Filter panel toggle and minimize buttons
    const toggleFiltersBtn = container.querySelector('#datagrid-btn-toggle-filters');
    if (toggleFiltersBtn) {
      toggleFiltersBtn.addEventListener('click', () => {
        this.filtersMinimized = !this.filtersMinimized;
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    const minimizeBtn = container.querySelector('#datagrid-btn-minimize-filters');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        this.filtersMinimized = true;
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    // 3. Stage Distribution Bar segment clicks (quick stage filter)
    container.querySelectorAll('.board-stage-distribution-bar .stage-seg[data-status]').forEach(seg => {
      seg.addEventListener('click', () => {
        const status = seg.dataset.status;
        this.activeQuickFilter = this.activeQuickFilter === status ? 'all' : status;
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    });

    // 4. Overdue metric pill click
    const overduePill = container.querySelector('#datagrid-metric-overdue');
    if (overduePill) {
      overduePill.addEventListener('click', () => {
        this.activeQuickFilter = this.activeQuickFilter === 'overdue' ? 'all' : 'overdue';
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    // 5. Select Filters (Project, Sprint, Type, Priority)
    const projSelect = container.querySelector('#datagrid-project-filter');
    if (projSelect) {
      projSelect.addEventListener('change', (e) => {
        AppState.selectedProjectId = e.target.value || null;
        if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
          Router.updateTopbarProjectPicker();
        }
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    const sprintSelect = container.querySelector('#datagrid-sprint-filter');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', (e) => {
        AppState.activeFilters.sprintId = e.target.value || null;
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    const typeSelect = container.querySelector('#datagrid-type-filter');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.selectedType = val;
        AppState.activeFilters.type = val ? [val] : [];
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    const prioSelect = container.querySelector('#datagrid-priority-filter');
    if (prioSelect) {
      prioSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.selectedPriority = val;
        AppState.activeFilters.priority = val ? [val] : [];
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    }

    // 6. Quick Filter Chips
    container.querySelectorAll('.board-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeQuickFilter = chip.dataset.filter;
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    });

    // 7. Clear & Reset Buttons
    const resetBtn = container.querySelector('#datagrid-btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.clearAllFilters(container);
      });
    }

    const resetMinBtn = container.querySelector('#datagrid-btn-reset-filters-min');
    if (resetMinBtn) {
      resetMinBtn.addEventListener('click', () => {
        this.clearAllFilters(container);
      });
    }

    // 8. Minimized Active Filter Strip Removals
    container.querySelectorAll('.min-filter-chip[data-clear]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = chip.dataset.clear;
        if (target === 'search') {
          this.searchQuery = '';
        } else if (target === 'project') {
          AppState.selectedProjectId = null;
          if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
            Router.updateTopbarProjectPicker();
          }
        } else if (target === 'sprint') {
          AppState.activeFilters.sprintId = null;
        } else if (target === 'type') {
          this.selectedType = '';
          AppState.activeFilters.type = [];
        } else if (target === 'priority') {
          this.selectedPriority = '';
          AppState.activeFilters.priority = [];
        } else if (target === 'quick') {
          this.activeQuickFilter = 'all';
        }
        if (typeof TasksView !== 'undefined' && typeof TasksView.syncStateFromView === 'function') {
          TasksView.syncStateFromView(this);
        }
        this.render(container);
      });
    });

    // Density toggle button
    const densityBtn = container.querySelector('#datagrid-btn-density');
    if (densityBtn) {
      densityBtn.addEventListener('click', () => {
        this.density = this.density === 'compact' ? 'comfortable' : 'compact';
        this.render(container);
      });
    }

    const resetSortBtn = container.querySelector('#datagrid-btn-reset-sort');
    if (resetSortBtn) {
      resetSortBtn.addEventListener('click', () => {
        this.sortField = 'key';
        this.sortAsc = true;
        this.render(container);
      });
    }

    // 9. Column Sorting Headers
    container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (this.sortField === field) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortField = field;
          this.sortAsc = true;
        }
        this.render(container);
      });
    });

    // 10. Select All Checkbox
    const selectAllChk = container.querySelector('#chk-select-all');
    if (selectAllChk) {
      selectAllChk.addEventListener('change', (e) => {
        if (e.target.checked) {
          tasks.forEach(t => this.selectedTaskIds.add(t.id));
        } else {
          this.selectedTaskIds.clear();
        }
        this.render(container);
      });
    }

    // 11. Row Checkboxes with Shift+Click Multi-Select Range
    const rowCheckboxes = container.querySelectorAll('.chk-task-row');
    rowCheckboxes.forEach(chk => {
      chk.addEventListener('click', (e) => {
        const index = parseInt(chk.dataset.index, 10);
        const taskId = chk.dataset.id;

        if (e.shiftKey && this.lastClickedIndex !== null) {
          const start = Math.min(this.lastClickedIndex, index);
          const end = Math.max(this.lastClickedIndex, index);
          const targetState = chk.checked;

          for (let i = start; i <= end; i++) {
            if (tasks[i]) {
              if (targetState) {
                this.selectedTaskIds.add(tasks[i].id);
              } else {
                this.selectedTaskIds.delete(tasks[i].id);
              }
            }
          }
        } else {
          if (chk.checked) {
            this.selectedTaskIds.add(taskId);
          } else {
            this.selectedTaskIds.delete(taskId);
          }
        }

        this.lastClickedIndex = index;
        this.render(container);
      });
    });

    // 12. Interactive In-Cell Status Dropdown Trigger
    container.querySelectorAll('.datagrid-dropdown-btn[data-action="toggle-status-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.id;
        const current = btn.dataset.current;
        DataGridDropdown.toggle(btn, 'status', taskId, current);
      });
    });

    // 13. Interactive In-Cell Priority Dropdown Trigger
    container.querySelectorAll('.datagrid-dropdown-btn[data-action="toggle-prio-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.id;
        const current = btn.dataset.current;
        DataGridDropdown.toggle(btn, 'priority', taskId, current);
      });
    });

    // In-Cell Due Date Dropdown Trigger
    container.querySelectorAll('.datagrid-dropdown-btn[data-action="toggle-date-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.id;
        const current = btn.dataset.current;
        DataGridDropdown.toggle(btn, 'dueDate', taskId, current);
      });
    });

    // Compact per-row action menu
    container.querySelectorAll('.datagrid-dropdown-btn[data-action="toggle-actions-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        DataGridDropdown.toggle(btn, 'actions', btn.dataset.id);
        btn.setAttribute('aria-expanded', String(btn.classList.contains('dropdown-open')));
      });
    });

    // 14. Floating Bulk Operations Bar Controls
    const bulkToolbar = container.querySelector('#datagrid-bulk-toolbar');
    if (bulkToolbar) {

      // 1-Click Mark Done Button
      const markDoneBtn = bulkToolbar.querySelector('#btn-bulk-markdone');
      if (markDoneBtn) {
        markDoneBtn.addEventListener('click', () => {
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { status: 'done' });
          Toast.success(`Marked ${ids.length} task(s) as Done! 🎉`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Status Select
      const bulkStatus = bulkToolbar.querySelector('#bulk-status-select');
      if (bulkStatus) {
        bulkStatus.addEventListener('change', (e) => {
          const val = e.target.value;
          if (!val) return;
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { status: val });
          Toast.success(`Updated status for ${ids.length} task(s).`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Priority Select
      const bulkPriority = bulkToolbar.querySelector('#bulk-priority-select');
      if (bulkPriority) {
        bulkPriority.addEventListener('change', (e) => {
          const val = e.target.value;
          if (!val) return;
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { priority: val });
          Toast.success(`Updated priority for ${ids.length} task(s).`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Sprint Select
      const bulkSprint = bulkToolbar.querySelector('#bulk-sprint-select');
      if (bulkSprint) {
        bulkSprint.addEventListener('change', (e) => {
          const val = e.target.value;
          if (!val) return;
          const sprintId = val === '__backlog__' ? null : val;
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { sprintId });
          Toast.success(`Assigned ${ids.length} task(s) to ${sprintId ? 'sprint' : 'unassigned'}.`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Due Date Select
      const bulkDueDate = bulkToolbar.querySelector('#bulk-duedate-select');
      if (bulkDueDate) {
        bulkDueDate.addEventListener('change', (e) => {
          const val = e.target.value;
          e.target.value = '';
          bulkDueDate.selectedIndex = 0;
          if (!val) return;
          const ids = Array.from(this.selectedTaskIds);
          if (ids.length === 0) return;

          if (val === 'custom') {
            this.openBulkDueDateModal(ids, container);
            return;
          }

          if (val === 'clear') {
            AppState.bulkUpdateTasks(ids, { dueDate: null });
            Toast.info(`Cleared due date for ${ids.length} task(s).`);
            this.selectedTaskIds.clear();
            this.render(container);
            return;
          }

          const isoStr = this.calculateTargetDate(val);
          if (isoStr) {
            AppState.bulkUpdateTasks(ids, { dueDate: isoStr });
            Toast.success(`Set due date to ${Utils.formatDate(isoStr)} for ${ids.length} task(s). 📅`);
            this.selectedTaskIds.clear();
            this.render(container);
          }
        });
      }

      // Bulk Date Picker Modal Button
      const bulkDatePickerBtn = bulkToolbar.querySelector('#btn-bulk-datepicker');
      if (bulkDatePickerBtn) {
        bulkDatePickerBtn.addEventListener('click', () => {
          const ids = Array.from(this.selectedTaskIds);
          if (ids.length === 0) return;
          this.openBulkDueDateModal(ids, container);
        });
      }

      // Bulk Duplicate Button
      const bulkDupBtn = bulkToolbar.querySelector('#btn-bulk-duplicate');
      if (bulkDupBtn) {
        bulkDupBtn.addEventListener('click', () => {
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkDuplicateTasks(ids);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Delete Button
      const bulkDelBtn = bulkToolbar.querySelector('#btn-bulk-delete');
      if (bulkDelBtn) {
        bulkDelBtn.addEventListener('click', () => {
          const count = this.selectedTaskIds.size;
          Modal.confirm(
            'Bulk Delete Tasks',
            `Are you sure you want to permanently delete <strong>${count}</strong> selected task(s)? This will also delete any child subtasks.`,
            () => {
              const ids = Array.from(this.selectedTaskIds);
              AppState.bulkDeleteTasks(ids, true);
              this.selectedTaskIds.clear();
              Toast.warning(`Deleted ${count} task(s).`);
              this.render(container);
            }
          );
        });
      }

      // Bulk Clear Selection Button
      const bulkClearBtn = bulkToolbar.querySelector('#btn-bulk-clear');
      if (bulkClearBtn) {
        bulkClearBtn.addEventListener('click', () => {
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }
    }

    // 15. Top Action Buttons
    const createBtn = container.querySelector('#btn-list-create');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());

    // 16. Keyboard listener for Escape key to clear selection & '/' for search
    if (!this._hasBoundKeydown) {
      this._hasBoundKeydown = true;
      document.addEventListener('keydown', (e) => {
        const isListViewActive = AppState.currentView === 'list' || 
          (AppState.currentView === 'tasks' && typeof TasksView !== 'undefined' && TasksView.getMode() === 'list');
        if (!isListViewActive) return;

        if (e.key === 'Escape' && this.selectedTaskIds.size > 0) {
          this.selectedTaskIds.clear();
          const viewContainer = document.getElementById('view-container');
          if (viewContainer) this.render(viewContainer);
        } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const s = document.getElementById('datagrid-search-input');
          if (s) {
            s.focus();
            s.select();
          }
        }
      });
    }

    if (typeof DropdownUI !== 'undefined') {
      DropdownUI.initAll(container);
    }
  },

  /**
   * Opens the Bulk Due Date modal with quick presets, calendar picker, and clear option
   * @param {string[]} taskIds 
   * @param {HTMLElement} container 
   */
  openBulkDueDateModal(taskIds, container) {
    if (!taskIds || taskIds.length === 0) return;
    const count = taskIds.length;

    // Calculate preset dates (midday local prevents date boundary flips)
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const friday = new Date(today);
    const dayOfWeek = friday.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    friday.setDate(friday.getDate() + daysUntilFriday);

    const nextMonday = new Date(today);
    const daysUntilNextMon = ((1 - dayOfWeek + 7) % 7) || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilNextMon);

    const in2Weeks = new Date(today);
    in2Weeks.setDate(in2Weeks.getDate() + 14);

    const tasks = taskIds.map(id => AppState.tasks.find(t => t.id === id)).filter(Boolean);

    // Default input date: today (or common date if all selected share the same date)
    const existingDates = tasks.map(t => t.dueDate ? Utils.toDateInputValue(t.dueDate) : '').filter(Boolean);
    const initialDateVal = (existingDates.length > 0 && existingDates.every(d => d === existingDates[0]))
      ? existingDates[0]
      : Utils.toDateInputValue(today);

    const modalBody = `
      <div class="bulk-duedate-modal-content">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
          Select a deadline for <strong>${count}</strong> selected task${count > 1 ? 's' : ''}. Choose a quick preset, pick an exact calendar date, or remove deadlines.
        </p>

        <!-- Selected Tasks Chips Preview -->
        <div class="bulk-modal-tasks-preview">
          <span class="preview-label"><i class="fa-solid fa-list-check"></i> Selected:</span>
          <div class="preview-chips-container">
            ${tasks.slice(0, 8).map(t => `
              <span class="preview-task-chip" title="${Utils.escapeHTML(t.title)}">
                <strong>${t.key}</strong> <span class="chip-title">${Utils.escapeHTML(t.title.length > 20 ? t.title.substring(0, 18) + '...' : t.title)}</span>
              </span>
            `).join('')}
            ${tasks.length > 8 ? `<span class="preview-task-chip preview-chip-more">+${tasks.length - 8} more</span>` : ''}
          </div>
        </div>

        <!-- Quick Presets -->
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 600; font-size: 12px; margin-bottom: 8px;">
            <i class="fa-solid fa-bolt" style="color: var(--accent-warning, #F59E0B);"></i> Quick Presets
          </label>
          <div class="bulk-presets-row">
            <button type="button" class="btn btn-secondary btn-sm bulk-preset-btn" data-date="${Utils.toDateInputValue(today)}">
              <i class="fa-solid fa-calendar-day" style="color: #3B82F6;"></i> Today
            </button>
            <button type="button" class="btn btn-secondary btn-sm bulk-preset-btn" data-date="${Utils.toDateInputValue(tomorrow)}">
              <i class="fa-solid fa-sun" style="color: #F59E0B;"></i> Tomorrow
            </button>
            <button type="button" class="btn btn-secondary btn-sm bulk-preset-btn" data-date="${Utils.toDateInputValue(friday)}">
              <i class="fa-solid fa-calendar-week" style="color: #10B981;"></i> Friday
            </button>
            <button type="button" class="btn btn-secondary btn-sm bulk-preset-btn" data-date="${Utils.toDateInputValue(nextMonday)}">
              <i class="fa-solid fa-calendar-plus" style="color: #8B5CF6;"></i> Next Mon
            </button>
            <button type="button" class="btn btn-secondary btn-sm bulk-preset-btn" data-date="${Utils.toDateInputValue(in2Weeks)}">
              <i class="fa-solid fa-calendar-days" style="color: #06B6D4;"></i> +2 Wks
            </button>
          </div>
        </div>

        <!-- Exact Date Picker Input -->
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="bulk-modal-date-input" style="font-weight: 600; font-size: 12px; margin-bottom: 6px;">
            <i class="fa-regular fa-calendar" style="color: var(--accent-primary);"></i> Target Due Date
          </label>
          <div class="date-input-wrapper" style="position: relative;">
            <input type="date" id="bulk-modal-date-input" class="form-input" value="${initialDateVal}" style="width: 100%; height: 38px; font-size: 14px; font-weight: 500;">
          </div>
        </div>

        <!-- Quick Clear Due Date Option -->
        <div class="bulk-modal-clear-banner">
          <div class="clear-banner-text">
            <strong>Need open-ended tasks?</strong>
            <span>Clear due date from all selected tasks with one click.</span>
          </div>
          <button type="button" id="btn-modal-clear-duedate" class="btn btn-sm btn-outline-danger">
            <i class="fa-regular fa-calendar-xmark"></i> Clear Due Date
          </button>
        </div>
      </div>
    `;

    Modal.open({
      title: `<i class="fa-regular fa-calendar-check" style="color: var(--accent-primary);"></i> Set Due Date for ${count} Task${count > 1 ? 's' : ''}`,
      body: modalBody,
      size: 'md',
      footerButtons: [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          onClick: () => Modal.close()
        },
        {
          text: `<i class="fa-solid fa-check"></i> Apply Due Date`,
          class: 'btn-primary',
          onClick: () => {
            const dateInput = document.getElementById('bulk-modal-date-input');
            const val = dateInput ? dateInput.value : '';
            if (!val) {
              Toast.warning('Please select a valid date or click "Clear Due Date".');
              return;
            }
            const [y, m, d] = val.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d, 12, 0, 0, 0);
            const isoStr = dateObj.toISOString();

            AppState.bulkUpdateTasks(taskIds, { dueDate: isoStr });
            Toast.success(`Set due date to ${Utils.formatDate(isoStr)} for ${count} task(s). 📅`);
            this.selectedTaskIds.clear();
            Modal.close();
            const viewCont = container || document.getElementById('view-container') || document.getElementById('main-content');
            if (viewCont) this.render(viewCont);
          }
        }
      ]
    });

    // Wire up preset buttons
    const modalEl = document.getElementById('global-modal-body');
    if (modalEl) {
      modalEl.querySelectorAll('.bulk-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const dateVal = btn.dataset.date;
          const dateInput = document.getElementById('bulk-modal-date-input');
          if (dateInput && dateVal) {
            dateInput.value = dateVal;
            modalEl.querySelectorAll('.bulk-preset-btn').forEach(b => b.classList.remove('bulk-preset-active'));
            btn.classList.add('bulk-preset-active');
          }
        });
      });

      // Wire up clear due date button in modal
      const clearBtn = modalEl.querySelector('#btn-modal-clear-duedate');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          AppState.bulkUpdateTasks(taskIds, { dueDate: null });
          Toast.info(`Cleared due date for ${count} task(s).`);
          this.selectedTaskIds.clear();
          Modal.close();
          const viewCont = container || document.getElementById('view-container') || document.getElementById('main-content');
          if (viewCont) this.render(viewCont);
        });
      }
    }
  }
};
